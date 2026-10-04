import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ADMIN_EMAIL } from '../data/mockData'
import { nextParticipantId } from '../lib/format'
import { createCouponBatch } from '../lib/couponPdfGenerator'
import { api } from '../lib/api'
import { extractCouponId } from '../lib/tokenHelper'
import type { AppData, Coupon, CouponBatch, Draw, Participant, Prize, Winner } from '../types'

const AUTH_KEY = 'vf2026_admin_auth'
const TOKEN_KEY = 'admin_jwt_token'
const TOKEN_EXP_KEY = 'admin_jwt_exp'
const DATA_KEY = 'vf2026_app_data_v6'

function isSessionValid(): boolean {
  if (typeof localStorage === 'undefined') return false
  const token = localStorage.getItem(TOKEN_KEY)
  const expStr = localStorage.getItem(TOKEN_EXP_KEY)
  if (!token || !expStr) return false
  const expTime = parseInt(expStr, 10)
  if (isNaN(expTime) || Date.now() >= expTime) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXP_KEY)
    localStorage.removeItem(AUTH_KEY)
    return false
  }
  return true
}

interface CouponValidationResult {
  valid: boolean
  status: 'Unused' | 'Used' | 'Invalid'
  coupon?: Coupon
  message: string
}

interface AppContextValue {
  data: AppData
  isAdmin: boolean
  isOnline: boolean
  login: (email: string, password: string) => Promise<boolean> | boolean
  logout: () => void
  registerParticipant: (input: Omit<Participant, 'id' | 'registeredAt' | 'eligibility' | 'status'>) => Promise<{ ok: true; id: string } | { ok: false; error: string }>
  bulkRegisterParticipants: (
    inputs: Array<Omit<Participant, 'id' | 'registeredAt' | 'eligibility' | 'status'>>,
  ) => Promise<{ added: number; duplicates: number; invalid: number }>
  updateParticipant: (id: string, patch: Partial<Participant>) => void
  deleteParticipant: (id: string) => void
  addPrize: (prize: Omit<Prize, 'id'>) => string
  updatePrize: (id: string, patch: Partial<Prize>) => void
  deletePrize: (id: string) => void
  assignPrizeToDraw: (drawId: string, prizeId: string) => void
  addDraw: (draw: Omit<Draw, 'id'>) => void
  updateDraw: (id: string, patch: Partial<Draw>) => void
  deleteDraw: (id: string) => void
  confirmWinner: (participantId: string, drawId: string, customPrizeId?: string) => Promise<{ ok: true; winnerId: string } | { ok: false; error: string }>
  getPrize: (id: string) => Prize | undefined
  getParticipant: (id: string) => Participant | undefined
  getDraw: (id: string) => Draw | undefined
  nextDraw: Draw | undefined
  eligibleParticipants: Participant[]
  winnerParticipantIds: Set<string>
  // Coupon System Methods
  coupons: Coupon[]
  batches: CouponBatch[]
  generateCouponBatch: (
    count: number,
    name?: string,
    onProgress?: (saved: number, total: number) => void
  ) => Promise<{ batch: CouponBatch; coupons: Coupon[] }>
  validateCoupon: (couponId: string) => CouponValidationResult
  validateCouponAsync: (couponId: string) => Promise<CouponValidationResult>
  deleteCouponBatch: (batchId: string) => void
  resetToDefaultData: () => void
  refreshData: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

function loadLocalData(): AppData {
  // Always start empty — real data comes from MongoDB only
  // Clear ALL legacy localStorage keys
  try {
    if (typeof localStorage !== 'undefined') {
      for (const key of ['vf2026_app_data_v1','vf2026_app_data_v2','vf2026_app_data_v3',
        'vf2026_app_data_v4','vf2026_app_data_v5','vf2026_app_data_v6']) {
        localStorage.removeItem(key)
      }
    }
  } catch {}
  return {
    prizes: [],
    draws: [],
    participants: [],
    winners: [],
    batches: [],
    coupons: [],
    totalCouponsCount: 0,
    usedCouponsCount: 0,
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => isSessionValid())
  const [data, setData] = useState<AppData>(loadLocalData)
  const [isOnline, setIsOnline] = useState(false)

  // 10-minute auto logout monitor + password change verification
  useEffect(() => {
    const checkSessionExpiry = async () => {
      if (!isAdmin) return
      if (!isSessionValid()) {
        setIsAdmin(false)
        api.logout()
        alert('Your admin session has expired (10 minutes). Please log in again.')
        return
      }

      // Verify with backend if password was changed on another system
      try {
        const res = await api.verifySession()
        if (!res.ok) {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(TOKEN_EXP_KEY)
          localStorage.removeItem(AUTH_KEY)
          setIsAdmin(false)
          api.logout()
          alert(res.error || 'Admin password was changed. You have been logged out from all systems.')
        }
      } catch {
        // ignore temporary network blip
      }
    }

    const interval = setInterval(checkSessionExpiry, 15000)
    return () => clearInterval(interval)
  }, [isAdmin])

  // Verify active session with backend on load / refresh
  useEffect(() => {
    if (isAdmin) {
      api.verifySession().then((res) => {
        if (!res.ok) {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(TOKEN_EXP_KEY)
          localStorage.removeItem(AUTH_KEY)
          setIsAdmin(false)
          if (res.error && res.error.toLowerCase().includes('password')) {
            alert(res.error)
          }
        }
      }).catch(() => {})
    }
  }, [])

  // Fetch data from MongoDB Atlas and auto-sync in real-time
  const isRefreshingRef = useRef(false)
  const refreshData = async () => {
    if (isRefreshingRef.current) return
    isRefreshingRef.current = true
    try {
      const serverData = await api.getAllData()
      // Always overwrite with real server data — no fallbacks, no merges with old state
      setData({
        prizes: serverData.prizes || [],
        draws: serverData.draws || [],
        participants: serverData.participants || [],
        winners: serverData.winners || [],
        batches: serverData.batches || [],
        coupons: serverData.coupons || [],
        totalCouponsCount: serverData.totalCouponsCount || 0,
        usedCouponsCount: serverData.usedCouponsCount || 0,
      })
      setIsOnline(true)
    } catch {
      setIsOnline(false)
    } finally {
      isRefreshingRef.current = false
    }
  }

  useEffect(() => {
    refreshData()
    // Polling every 20 seconds to prevent Cloudflare / Namecheap 429 rate limits
    const timer = setInterval(refreshData, 20000)
    const onFocus = () => refreshData()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  // Keep local backup (safely capped to avoid localStorage 5MB quota errors)
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const backup = {
          ...data,
          coupons: (data.coupons || []).slice(0, 100),
        }
        localStorage.setItem(DATA_KEY, JSON.stringify(backup))
      }
    } catch {
      // Ignore quota exceeded or storage errors
    }
  }, [data])

  const value = useMemo<AppContextValue>(() => {
    const getPrize = (id: string) => data.prizes.find((p) => p.id === id)
    const getParticipant = (id: string) => data.participants.find((p) => p.id === id)
    const getDraw = (id: string) => data.draws.find((d) => d.id === id)

    const coupons = data.coupons || []
    const batches = data.batches || []

    const winnerParticipantIds = new Set(data.winners.map((w) => w.participantId))
    const eligibleParticipants = data.participants.filter(
      (p) => p.eligibility === 'Eligible' && p.status === 'Active',
    )

    const nextDraw = [...data.draws]
      .filter((d) => d.status === 'Upcoming')
      .sort((a, b) => a.date.localeCompare(b.date))[0]

    const validateCoupon = (couponId: string): CouponValidationResult => {
      const cleanId = extractCouponId(couponId) || (couponId ? couponId.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase() : '')
      if (!cleanId || cleanId.length < 6 || cleanId.length > 16) {
        return { valid: false, status: 'Invalid', message: 'Please enter a valid festival coupon code.' }
      }

      // Check if already used by any participant
      const registeredUser = data.participants.find((p) => p.couponId === cleanId)
      if (registeredUser) {
        return {
          valid: false,
          status: 'Used',
          message: 'This coupon has already been used and is no longer valid.',
        }
      }

      // Check in coupons list (by ID or Serial No)
      const found = coupons.find((c) => c.id === cleanId || c.serialNo === cleanId)
      if (found) {
        if (found.status === 'Used') {
          return {
            valid: false,
            status: 'Used',
            coupon: found,
            message: 'This coupon has already been used and is no longer valid.',
          }
        }
        return { valid: true, status: 'Unused', coupon: found, message: 'Valid Festival Coupon! Ready for registration.' }
      }

      return {
        valid: true,
        status: 'Unused',
        message: 'Valid Festival Coupon! Ready for registration.',
      }
    }

    const validateCouponAsync = async (couponId: string): Promise<CouponValidationResult> => {
      const cleanId = extractCouponId(couponId) || (couponId ? couponId.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase() : '')
      if (!cleanId || cleanId.length < 6 || cleanId.length > 16) {
        return { valid: false, status: 'Invalid', message: 'Please enter a valid festival coupon code.' }
      }

      // Check local cache first for instant response if known used
      const localCheck = validateCoupon(cleanId)
      if (!localCheck.valid && localCheck.status === 'Used') {
        return localCheck
      }

      try {
        const res = await api.validateCoupon(cleanId)
        if (res) {
          if (res.status === 'Used' || !res.valid) {
            return {
              valid: false,
              status: res.status === 'Used' ? 'Used' : 'Invalid',
              coupon: res.coupon,
              message: res.message || 'This coupon has already been used and is no longer valid.',
            }
          }
          if (res.valid && res.status === 'Unused') {
            return {
              valid: true,
              status: 'Unused',
              coupon: res.coupon,
              message: res.message || 'Valid Festival Coupon! Ready for registration.',
            }
          }
        }
      } catch {
        // network fallback to local check
      }
      return localCheck
    }

    return {
      data,
      isAdmin,
      isOnline,
      coupons,
      batches,
      refreshData,
      login: async (email, password) => {
        const cleanEmail = email.trim().toLowerCase()
        try {
          const res = await api.login(cleanEmail, password)
          if (res && res.ok) {
            const token = res.token || `admin_auth_${Date.now()}`
            const expTime = Date.now() + 10 * 60 * 1000 // 10 minutes
            localStorage.setItem(TOKEN_KEY, token)
            localStorage.setItem(TOKEN_EXP_KEY, expTime.toString())
            localStorage.setItem(AUTH_KEY, '1')
            setIsAdmin(true)
            return true
          }
          return false
        } catch {
          return false
        }
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(TOKEN_EXP_KEY)
        localStorage.removeItem(AUTH_KEY)
        api.logout()
        setIsAdmin(false)
      },
      validateCoupon,
      validateCouponAsync,
      generateCouponBatch: async (count: number, name?: string, onProgress?: (saved: number, total: number) => void) => {
        const batchId = `BATCH-${Date.now()}`
        const now = new Date().toISOString()
        const batchName = name || `Coupons Batch (${count} pcs)`

        const existingIds = new Set((coupons || []).map((c) => c.id))
        const { coupons: newCoupons, batch } = createCouponBatch(count, existingIds, batchName, batchId)

        // Stream to MongoDB in chunks of 5,000 with retry
        const CHUNK_SIZE = 5000
        let savedCount = 0

        for (let i = 0; i < newCoupons.length; i += CHUNK_SIZE) {
          const chunk = newCoupons.slice(i, i + CHUNK_SIZE)
          const isLast = i + CHUNK_SIZE >= newCoupons.length
          
          let inserted = false
          let lastErr: any = null
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const res = await api.bulkInsertCoupons({
                batch: isLast ? batch : { id: batchId, name: batchName, count, startId: batch.startId, endId: batch.endId, createdAt: now, unusedCount: count, usedCount: 0 },
                coupons: chunk,
              })
              if (res && res.ok) {
                inserted = true
                break
              }
              lastErr = new Error(res?.error || 'Bulk insert failed')
            } catch (err: any) {
              lastErr = err
              if (attempt < 3) {
                await new Promise((r) => setTimeout(r, 1000 * attempt))
              }
            }
          }

          if (!inserted && lastErr) {
            throw lastErr
          }

          savedCount += chunk.length
          if (onProgress) {
            onProgress(savedCount, count)
          }
        }

        setData((prev) => ({
          ...prev,
          batches: [batch, ...(prev.batches || []).filter((b) => b.id !== batch.id)],
          totalCouponsCount: (prev.totalCouponsCount || 0) + count,
        }))

        // Refresh data in background
        refreshData().catch(() => {})

        return { batch, coupons: newCoupons }
      },
      deleteCouponBatch: async (batchId: string) => {
        try {
          await api.deleteBatch(batchId)
        } catch (err) {
          console.error('Failed to delete batch via API:', err)
        }
        setData((prev) => {
          const deletedCoupons = (prev.coupons || []).filter((c) => c.batchId === batchId)
          const deletedCouponIds = new Set(deletedCoupons.map((c) => (c.id || '').toUpperCase()))
          deletedCoupons.forEach((c) => {
            if (c.serialNo) deletedCouponIds.add(c.serialNo.toUpperCase())
          })

          const participantsToRemove = (prev.participants || []).filter((p) =>
            p.couponId ? deletedCouponIds.has(p.couponId.toUpperCase()) : false
          )
          const removedParticipantIds = new Set(participantsToRemove.map((p) => p.id))

          const remainingBatches = (prev.batches || []).filter((b) => b.id !== batchId)
          const remainingCoupons = (prev.coupons || []).filter((c) => c.batchId !== batchId)
          const remainingParticipants = (prev.participants || []).filter((p) => !removedParticipantIds.has(p.id))
          const remainingWinners = (prev.winners || []).filter((w) => !removedParticipantIds.has(w.participantId))

          const deletedBatch = (prev.batches || []).find((b) => b.id === batchId)
          const deletedCount = deletedBatch?.count || 0

          return {
            ...prev,
            batches: remainingBatches,
            coupons: remainingCoupons,
            participants: remainingParticipants,
            winners: remainingWinners,
            totalCouponsCount: Math.max(0, (prev.totalCouponsCount || 0) - deletedCount),
            usedCouponsCount: Math.max(0, (prev.usedCouponsCount || 0) - participantsToRemove.length),
          }
        })
        try {
          await refreshData()
        } catch {}
      },
      registerParticipant: async (input) => {
        const phone = input.phone.replace(/\D/g, '').slice(-10)

        let cleanCouponId = ''
        if (input.couponId) {
          cleanCouponId = extractCouponId(input.couponId) || input.couponId.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase()
          const check = validateCoupon(cleanCouponId)
          if (!check.valid) {
            return { ok: false, error: check.message }
          }
        }

        try {
          const apiRes = await api.registerParticipant({
            name: input.name.trim(),
            phone,
            address: input.address?.trim() || 'Valanchery',
            location: input.location,
            couponId: cleanCouponId || undefined,
          })

          if (apiRes.ok && apiRes.participant) {
            setData((prev) => {
              const now = new Date().toISOString().slice(0, 10)
              const updatedCoupons = cleanCouponId
                ? (prev.coupons || []).map((c) =>
                    c.id === cleanCouponId
                      ? {
                          ...c,
                          status: 'Used' as const,
                          usedAt: now,
                          usedByParticipantId: apiRes.id,
                          usedByParticipantName: input.name.trim(),
                          usedByParticipantPhone: phone,
                        }
                      : c
                  )
                : prev.coupons

              return {
                ...prev,
                participants: [apiRes.participant!, ...prev.participants],
                coupons: updatedCoupons,
                usedCouponsCount: (prev.usedCouponsCount || 0) + (cleanCouponId ? 1 : 0),
              }
            })
            refreshData().catch(() => {})
            return { ok: true, id: apiRes.id }
          }
          return { ok: false, error: apiRes.error || 'Registration failed' }
        } catch (e: any) {
          return { ok: false, error: e.message || 'Server connection error during registration' }
        }
      },
      bulkRegisterParticipants: async (inputs) => {
        try {
          const res = await api.bulkRegisterParticipants(inputs)
          if (res.ok) {
            await refreshData()
            return res
          }
          throw new Error('Bulk registration failed')
        } catch (err: any) {
          throw err
        }
      },
      updateParticipant: (id, patch) => {
        api.updateParticipant(id, patch).catch(() => {})
        setData((prev) => ({
          ...prev,
          participants: prev.participants.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }))
      },
      deleteParticipant: async (id) => {
        try {
          await api.deleteParticipant(id)
        } catch {}
        setData((prev) => {
          const target = prev.participants.find((p) => p.id === id)
          const restoredCoupons = target?.couponId
            ? (prev.coupons || []).map((c) =>
                c.id === target.couponId
                  ? {
                      ...c,
                      status: 'Unused' as const,
                      usedAt: undefined,
                      usedByParticipantId: undefined,
                      usedByParticipantName: undefined,
                      usedByParticipantPhone: undefined,
                    }
                  : c
              )
            : prev.coupons

          return {
            ...prev,
            participants: prev.participants.filter((p) => p.id !== id),
            winners: prev.winners.filter((w) => w.participantId !== id),
            coupons: restoredCoupons,
            usedCouponsCount: Math.max(0, (prev.usedCouponsCount || 0) - (target?.couponId ? 1 : 0)),
          }
        })
        refreshData().catch(() => {})
      },
      addPrize: (prize) => {
        const id = `prize-${Date.now()}`
        api.addPrize(prize).catch(() => {})
        const newPrize: Prize = { ...prize, id }
        setData((prev) => ({ ...prev, prizes: [...prev.prizes, newPrize] }))
        return id
      },
      updatePrize: (id, patch) => {
        api.updatePrize(id, patch).catch(() => {})
        setData((prev) => ({
          ...prev,
          prizes: prev.prizes.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }))
      },
      deletePrize: (id) => {
        api.deletePrize(id).catch(() => {})
        setData((prev) => ({ ...prev, prizes: prev.prizes.filter((p) => p.id !== id) }))
      },
      assignPrizeToDraw: (drawId, prizeId) => {
        api.updateDraw(drawId, { prizeId }).catch(() => {})
        api.updatePrize(prizeId, { assignedDrawId: drawId, status: 'Assigned' }).catch(() => {})
        setData((prev) => ({
          ...prev,
          draws: prev.draws.map((d) => (d.id === drawId ? { ...d, prizeId } : d)),
          prizes: prev.prizes.map((p) =>
            p.id === prizeId ? { ...p, assignedDrawId: drawId, status: 'Assigned' as const } : p,
          ),
        }))
      },
      addDraw: (draw) => {
        const id = `draw-${Date.now()}`
        api.addDraw(draw).catch(() => {})
        setData((prev) => ({ ...prev, draws: [...prev.draws, { ...draw, id }] }))
      },
      updateDraw: (id, patch) => {
        api.updateDraw(id, patch).catch(() => {})
        setData((prev) => ({
          ...prev,
          draws: prev.draws.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        }))
      },
      deleteDraw: (id) => {
        api.deleteDraw(id).catch(() => {})
        setData((prev) => ({
          ...prev,
          draws: prev.draws.filter((d) => d.id !== id),
        }))
      },
      confirmWinner: async (participantId, drawId, customPrizeId) => {
        let activeDrawId = drawId
        let draw = data.draws.find((d) => d.id === activeDrawId)
        if (!draw) {
          if (data.draws.length > 0) {
            draw = data.draws[0]
            activeDrawId = draw.id
          } else {
            activeDrawId = activeDrawId || `draw-${Date.now()}`
            draw = {
              id: activeDrawId,
              number: data.winners.length + 1,
              date: new Date().toISOString().slice(0, 10),
              prizeId: customPrizeId || (data.prizes[0]?.id ?? 'prize-1'),
              winnerCount: 1,
              status: 'Completed' as const,
            }
          }
        }

        const awardedPrizeId = customPrizeId || draw?.prizeId || (data.prizes[0]?.id ?? 'prize-1')
        const winnerId = `win-${Date.now()}`
        const now = new Date().toISOString().slice(0, 10)

        const winner: Winner = {
          id: winnerId,
          drawId: activeDrawId,
          participantId,
          prizeId: awardedPrizeId,
          date: now,
          status: 'Confirmed',
        }

        // Optimistically update state immediately without locking the prize
        setData((prev) => ({
          ...prev,
          winners: [winner, ...prev.winners],
        }))

        // Sync with server and refresh
        try {
          const res = await api.confirmWinner(participantId, activeDrawId, awardedPrizeId)
          if (res.ok && res.winner) {
            setData((prev) => ({
              ...prev,
              winners: [res.winner as Winner, ...prev.winners.filter((w) => w.id !== winnerId && w.id !== res.winner?.id)],
            }))
            refreshData().catch(() => {})
            return { ok: true, winnerId: res.winner.id || winnerId }
          }
          return { ok: true, winnerId }
        } catch (err: any) {
          console.warn('Backend sync error:', err)
          return { ok: true, winnerId }
        }
      },
      getPrize,
      getParticipant,
      getDraw,
      nextDraw,
      eligibleParticipants,
      winnerParticipantIds,
      resetToDefaultData: () => {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(DATA_KEY)
          localStorage.removeItem('vf2026_app_data_v2')
        }
        refreshData()
      },
    }
  }, [data, isAdmin, isOnline])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
