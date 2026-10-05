import type { Participant, Winner } from '../types'

const envUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
const API_BASE = envUrl ? (envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`) : '/api'

async function fetchWithTimeout(urlOrPath: string, options: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
  let targetUrl = urlOrPath

  if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
    const cleanPath = urlOrPath.startsWith('/api') ? urlOrPath.slice(4) : (urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`)
    targetUrl = `${API_BASE}${cleanPath}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(targetUrl, { ...options, signal: controller.signal })
    return res
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      throw new Error('Server took too long to respond. Please try again.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  async health(): Promise<{ status: string; database: string }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 8000)
      return await res.json()
    } catch {
      return { status: 'offline', database: 'disconnected' }
    }
  },

  async validateCoupon(code: string): Promise<{ valid: boolean; status: string; coupon?: any; message: string }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/coupons/validate?code=${encodeURIComponent(code)}`, {}, 25000)
      if (res.ok) {
        return await res.json()
      }
      return { valid: false, status: 'Invalid', message: 'Unable to validate coupon' }
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError' || err?.message?.toLowerCase().includes('abort')
      return {
        valid: false,
        status: 'Invalid',
        message: isAbort
          ? 'Network is busy. Please tap verify or try again.'
          : 'Unable to verify coupon online. Please check your connection.',
      }
    }
  },

  async registerParticipant(participant: any): Promise<{ ok: boolean; id?: string; error?: string }> {
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/participants/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(participant),
        },
        45000   // 45s timeout — backend may be serving thousands concurrently
      )
      return await res.json()
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError' || err?.message?.toLowerCase().includes('abort')
      return {
        ok: false,
        error: isAbort
          ? 'Registration timed out due to high traffic. Please check your connection and tap Submit again.'
          : (err.message || 'Registration request failed. Please try again.'),
      }
    }
  },

  async getParticipant(id: string): Promise<{ ok: boolean; participant?: Participant; error?: string }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/participants/${encodeURIComponent(id)}`, {}, 12000)
      return await res.json()
    } catch (err: any) {
      return { ok: false, error: err.message || 'Failed to fetch registration pass' }
    }
  },

  async getWinners(): Promise<{ ok: boolean; winners?: Winner[]; error?: string }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/winners`, {}, 10000)
      if (res.ok) {
        return await res.json()
      }
      return { ok: true, winners: [] }
    } catch {
      return { ok: true, winners: [] }
    }
  },
}
