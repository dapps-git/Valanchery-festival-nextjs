import type { AppData, Coupon, CouponBatch, Draw, Participant, Prize, Winner } from '../types'

const envUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
// Ignore dead onrender.com URLs and use same-domain /api
const RAW_API = envUrl.includes('onrender.com') ? '' : envUrl
const API_BASE = RAW_API ? (RAW_API.endsWith('/api') ? RAW_API : `${RAW_API}/api`) : '/api'

async function fetchWithTimeout(urlOrPath: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  let targetUrl = urlOrPath
  let fallbackUrl = ''

  if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
    const cleanPath = urlOrPath.startsWith('/api') ? urlOrPath.slice(4) : (urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`)
    targetUrl = `${API_BASE}${cleanPath}`
    fallbackUrl = `/api${cleanPath}`
  } else {
    try {
      const u = new URL(urlOrPath)
      fallbackUrl = u.pathname.startsWith('/api') ? `${u.pathname}${u.search}` : `/api${u.pathname}${u.search}`
    } catch {}
  }

  const headers = new Headers(options.headers || {})
  
  // Attach JWT admin token if available in localStorage
  if (typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('admin_jwt_token')
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(targetUrl, {
      ...options,
      headers,
      signal: controller.signal,
    })

    // If external server 404s/fails, fallback to same-domain Vercel /api
    if (!res.ok && (res.status === 404 || res.status >= 500) && fallbackUrl && targetUrl !== fallbackUrl) {
      return await fetch(fallbackUrl, { ...options, headers, signal: controller.signal })
    }

    // If session expired (401), clear local session
    if (res.status === 401 && typeof localStorage !== 'undefined') {
      const isLoginRequest = targetUrl.includes('/auth/login')
      if (!isLoginRequest) {
        localStorage.removeItem('admin_jwt_token')
        localStorage.removeItem('admin_jwt_exp')
        localStorage.removeItem('vf2026_admin_auth')
      }
    }

    return res
  } catch (err: any) {
    // If network error (DNS failure, net::ERR_NAME_NOT_RESOLVED), try local /api
    if (fallbackUrl && targetUrl !== fallbackUrl) {
      try {
        return await fetch(fallbackUrl, { ...options, headers, signal: controller.signal })
      } catch {}
    }

    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      throw new Error('Server took too long to respond. Please try again.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  // Check Backend Health
  async health(): Promise<{ status: string; database: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 8000)
    return res.json()
  },

  // Auth with JWT
  async login(email: string, password: string): Promise<{ ok: boolean; role?: string; token?: string; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }, 10000)
    return res.json()
  },

  async logout(): Promise<void> {
    try {
      await fetchWithTimeout(`${API_BASE}/auth/logout`, {
        method: 'POST',
      }, 5000)
    } catch {
      // ignore
    }
  },

  async verifySession(): Promise<{ ok: boolean; admin?: any; error?: string }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/auth/me`, {}, 5000)
      return res.json()
    } catch (err: any) {
      return { ok: false, error: err.message || 'Session verification failed' }
    }
  },

  async forgotPassword(email: string): Promise<{ ok: boolean; message?: string; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }, 12000)
    return res.json()
  },

  async verifyOtp(email: string, otp: string): Promise<{ ok: boolean; message?: string; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    }, 10000)
    return res.json()
  },

  async resetPassword(email: string, otp: string, newPassword: string): Promise<{ ok: boolean; message?: string; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    }, 12000)
    return res.json()
  },


  // Fetch full Initial App Data from MongoDB
  async getAllData(): Promise<AppData> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/all`, {}, 20000)
      if (res.ok) {
        const ct = res.headers.get('content-type') || ''
        if (ct.includes('application/json')) {
          const d = await res.json()
          if (d.ok || d.prizes || d.participants || d.coupons || d.totalCouponsCount) {
            return {
              prizes: d.prizes || [],
              draws: d.draws || [],
              participants: d.participants || [],
              winners: d.winners || [],
              coupons: d.coupons || [],
              batches: d.batches || [],
              totalCouponsCount: d.totalCouponsCount || d.coupons?.length || 0,
              usedCouponsCount: d.usedCouponsCount || d.participants?.length || 0,
            }
          }
        }
      }
    } catch {
      // fallback to individual fetch
    }

    try {
      const [prizesRes, drawsRes, participantsRes, winnersRes, couponsRes] = await Promise.allSettled([
        fetchWithTimeout(`${API_BASE}/prizes`, {}, 10000),
        fetchWithTimeout(`${API_BASE}/draws`, {}, 10000),
        fetchWithTimeout(`${API_BASE}/participants`, {}, 12000),
        fetchWithTimeout(`${API_BASE}/winners`, {}, 10000),
        fetchWithTimeout(`${API_BASE}/coupons?limit=100`, {}, 12000),
      ])

      const parse = async (p: PromiseSettledResult<Response>) => {
        if (p.status === 'fulfilled' && p.value.ok) {
          try {
            const ct = p.value.headers.get('content-type') || ''
            if (ct.includes('application/json')) {
              return await p.value.json()
            }
          } catch {
            return {}
          }
        }
        return {}
      }

      const [prizesData, drawsData, participantsData, winnersData, couponsData] = await Promise.all([
        parse(prizesRes),
        parse(drawsRes),
        parse(participantsRes),
        parse(winnersRes),
        parse(couponsRes),
      ])

      return {
        prizes: prizesData.prizes || [],
        draws: drawsData.draws || [],
        participants: participantsData.participants || [],
        winners: winnersData.winners || [],
        coupons: couponsData.coupons || [],
        batches: couponsData.batches || [],
        totalCouponsCount: couponsData.totalCoupons || couponsData.coupons?.length || 0,
        usedCouponsCount: participantsData.participants?.length || 0,
      }
    } catch {
      return {
        prizes: [],
        draws: [],
        participants: [],
        winners: [],
        coupons: [],
        batches: [],
      }
    }
  },

  async bulkInsertCoupons(payload: { batch: CouponBatch; coupons: Coupon[] }): Promise<{ ok: boolean; insertedCount?: number; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/coupons/bulk-insert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 60000)
    return res.json()
  },

  // Coupons
  async validateCoupon(couponId: string): Promise<{
    valid: boolean
    status: 'Unused' | 'Used' | 'Invalid'
    coupon?: Coupon
    message: string
  }> {
    const cleanId = (couponId || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    try {
      const res = await fetchWithTimeout(`${API_BASE}/coupons/validate?id=${encodeURIComponent(cleanId)}`, {}, 8000)
      if (res.ok) {
        return await res.json()
      } else {
        const errData = await res.json().catch(() => ({}))
        return {
          valid: false,
          status: errData.status === 'Used' ? 'Used' : 'Invalid',
          coupon: errData.coupon,
          message: errData.message || 'This coupon was not found in the festival database.',
        }
      }
    } catch {
      // network error
    }
    return { valid: false, status: 'Invalid', message: 'Could not verify coupon. Please try again.' }
  },

  async generateBatch(count: number, name?: string): Promise<{ ok: boolean; batch: CouponBatch; coupons: Coupon[] }> {
    const batchId = `BATCH-${Date.now()}`
    const now = new Date().toISOString()
    return {
      ok: true,
      batch: {
        id: batchId,
        name: name || `Coupons Batch (${count} pcs)`,
        count,
        startId: '',
        endId: '',
        createdAt: now,
        unusedCount: count,
        usedCount: 0,
      },
      coupons: [],
    }
  },

  async getBatchCoupons(batchId: string, limit = 50000): Promise<{ ok: boolean; coupons: Coupon[] }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/coupons?batchId=${encodeURIComponent(batchId)}&limit=${limit}`, {}, 20000)
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // fallback
    }
    return { ok: false, coupons: [] }
  },

  async getDirectoryCoupons(queryParams: URLSearchParams): Promise<{ ok: boolean; coupons: Coupon[]; filteredCount?: number; totalCoupons?: number }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/coupons?${queryParams.toString()}`, {}, 15000)
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // fallback
    }
    return { ok: false, coupons: [] }
  },

  async deleteBatch(batchId: string): Promise<{ ok: boolean }> {
    const res = await fetchWithTimeout(`${API_BASE}/coupons?batchId=${encodeURIComponent(batchId)}`, {
      method: 'DELETE',
    })
    return res.json()
  },

  async deleteAllBatchesAndCoupons(): Promise<{ ok: boolean }> {
    const res = await fetchWithTimeout(`${API_BASE}/coupons?all=true`, {
      method: 'DELETE',
    })
    return res.json()
  },

  // Participants
  async registerParticipant(input: {
    name?: string
    phone: string
    address?: string
    location?: string
    couponId?: string
  }): Promise<{ ok: boolean; id: string; participant?: Participant; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/participants/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = await res.json()
    if (!res.ok) {
      return { ok: false, id: '', error: data.error || 'Registration failed' }
    }
    return data
  },

  async bulkRegisterParticipants(
    participants: Array<{ name: string; phone: string; address?: string; location?: string; couponId?: string }>
  ): Promise<{ ok: boolean; added: number; duplicates: number; invalid: number }> {
    const res = await fetchWithTimeout(`${API_BASE}/participants/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participants }),
    })
    return res.json()
  },

  async lookupParticipant(query: string): Promise<{ ok: boolean; participant?: Participant; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/participants/lookup/${encodeURIComponent(query)}`)
    return res.json()
  },

  async updateParticipant(id: string, patch: Partial<Participant>): Promise<{ ok: boolean; participant?: Participant }> {
    const res = await fetchWithTimeout(`${API_BASE}/participants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    return res.json()
  },

  async deleteParticipant(id: string): Promise<{ ok: boolean }> {
    const res = await fetchWithTimeout(`${API_BASE}/participants/${id}`, {
      method: 'DELETE',
    })
    return res.json()
  },

  // Prizes
  async addPrize(prize: Omit<Prize, 'id'>): Promise<{ ok: boolean; prize: Prize }> {
    const res = await fetchWithTimeout(`${API_BASE}/prizes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prize),
    })
    return res.json()
  },

  async updatePrize(id: string, patch: Partial<Prize>): Promise<{ ok: boolean; prize: Prize }> {
    const res = await fetchWithTimeout(`${API_BASE}/prizes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    return res.json()
  },

  async deletePrize(id: string): Promise<{ ok: boolean }> {
    const res = await fetchWithTimeout(`${API_BASE}/prizes/${id}`, {
      method: 'DELETE',
    })
    return res.json()
  },

  // Draws & Winners
  async addDraw(draw: Omit<Draw, 'id'>): Promise<{ ok: boolean; draw: Draw }> {
    const res = await fetchWithTimeout(`${API_BASE}/draws`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draw),
    })
    return res.json()
  },

  async updateDraw(id: string, patch: Partial<Draw>): Promise<{ ok: boolean; draw: Draw }> {
    const res = await fetchWithTimeout(`${API_BASE}/draws/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    return res.json()
  },

  async deleteDraw(id: string): Promise<{ ok: boolean }> {
    const res = await fetchWithTimeout(`${API_BASE}/draws/${id}`, {
      method: 'DELETE',
    })
    return res.json()
  },

  async confirmWinner(
    participantId: string,
    drawId: string,
    prizeId?: string
  ): Promise<{ ok: boolean; winnerId?: string; winner?: Winner; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/draws/confirm-winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId, drawId, prizeId }),
    })
    return res.json()
  },
}
