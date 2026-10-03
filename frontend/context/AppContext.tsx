import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { GIFT_PRESETS } from '../data/mockData'
import { api } from '../lib/api'
import type { AppData, Coupon, Draw, Participant, Prize, Winner } from '../types'

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
  coupons: Coupon[]
  registerParticipant: (input: Omit<Participant, 'id' | 'registeredAt' | 'eligibility' | 'status'>) => Promise<{ ok: true; id: string } | { ok: false; error: string }>
  validateCoupon: (couponId: string) => CouponValidationResult
  validateCouponAsync: (couponId: string) => Promise<CouponValidationResult>
  getPrize: (id: string) => Prize | undefined
  getParticipant: (id: string) => Participant | undefined
  getDraw: (id: string) => Draw | undefined
  nextDraw: Draw | undefined
  eligibleParticipants: Participant[]
  winnerParticipantIds: Set<string>
  refreshData: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

// Default festival prizes for public showcase
const DEFAULT_PRIZES: Prize[] = GIFT_PRESETS.map((p, idx) => ({
  id: `PRIZE-${idx + 1}`,
  name: p.name,
  value: p.value,
  description: p.description,
  image: p.image,
  assignedDrawId: null,
  status: 'Available' as const,
}))

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({
    prizes: DEFAULT_PRIZES,
    draws: [],
    participants: [],
    winners: [],
    batches: [],
    coupons: [],
    totalCouponsCount: 0,
    usedCouponsCount: 0,
  })
  const [isOnline, setIsOnline] = useState(true)

  // Fetch only public winners
  const loadPublicData = async () => {
    try {
      const res = await api.getWinners()
      if (res && res.ok && res.winners) {
        setData((prev) => ({
          ...prev,
          winners: res.winners || [],
        }))
      }
      setIsOnline(true)
    } catch {
      setIsOnline(false)
    }
  }

  useEffect(() => {
    loadPublicData()
  }, [])

  const validateCouponAsync = async (couponId: string): Promise<CouponValidationResult> => {
    const cleanId = (couponId || '').trim().toUpperCase()
    if (!cleanId) {
      return { valid: false, status: 'Invalid', message: 'Please enter a coupon code.' }
    }

    try {
      const serverRes = await api.validateCoupon(cleanId)
      if (serverRes) {
        return {
          valid: serverRes.valid,
          status: (serverRes.status as any) || (serverRes.valid ? 'Unused' : 'Invalid'),
          coupon: serverRes.coupon,
          message: serverRes.message,
        }
      }
    } catch {
      // ignore
    }

    return {
      valid: false,
      status: 'Invalid',
      message: 'Unable to verify coupon online. Please check your internet connection.',
    }
  }

  const validateCoupon = (couponId: string): CouponValidationResult => {
    const cleanId = (couponId || '').trim().toUpperCase()
    if (!cleanId) return { valid: false, status: 'Invalid', message: 'Please enter a coupon code.' }
    return { valid: true, status: 'Unused', message: 'Validating coupon...' }
  }

  const registerParticipant = async (
    input: Omit<Participant, 'id' | 'registeredAt' | 'eligibility' | 'status'>
  ): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
    try {
      const res = await api.registerParticipant(input)
      if (res.ok && res.id) {
        return { ok: true, id: res.id }
      }
      return { ok: false, error: res.error || 'Registration failed' }
    } catch (err: any) {
      return { ok: false, error: err.message || 'Network error during registration' }
    }
  }

  const getPrize = (id: string) => data.prizes.find((p) => p.id === id)
  const getParticipant = (id: string) => data.participants.find((p) => p.id === id)
  const getDraw = (id: string) => data.draws.find((d) => d.id === id)
  const nextDraw = data.draws.find((d) => d.status === 'Upcoming' || d.status === 'Live')

  const winnerParticipantIds = new Set(data.winners.map((w) => w.participantId))
  const eligibleParticipants: Participant[] = []

  return (
    <AppContext.Provider
      value={{
        data,
        isAdmin: false,
        isOnline,
        coupons: [],
        refreshData: loadPublicData,
        registerParticipant,
        validateCoupon,
        validateCouponAsync,
        getPrize,
        getParticipant,
        getDraw,
        nextDraw,
        eligibleParticipants,
        winnerParticipantIds,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
