import type { Participant, Winner } from '../types'

const RAW_API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
const API_BASE = RAW_API ? (RAW_API.endsWith('/api') ? RAW_API : `${RAW_API}/api`) : '/api'

async function fetchWithTimeout(urlOrPath: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  let targetUrl = urlOrPath
  if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
    const cleanPath = urlOrPath.startsWith('/api') ? urlOrPath.slice(4) : (urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`)
    targetUrl = `${API_BASE}${cleanPath}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(targetUrl, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  async health(): Promise<{ status: string; database: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 5000)
    return res.json()
  },

  async validateCoupon(code: string): Promise<{ valid: boolean; status: string; coupon?: any; message: string }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/coupons/validate?code=${encodeURIComponent(code)}`, {}, 8000)
      if (res.ok) {
        return await res.json()
      }
      return { valid: false, status: 'Invalid', message: 'Unable to validate coupon' }
    } catch (err: any) {
      return { valid: false, status: 'Invalid', message: err.message || 'Validation request failed' }
    }
  },

  async registerParticipant(participant: any): Promise<{ ok: boolean; id?: string; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/participants/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participant),
    }, 15000)
    return res.json()
  },

  async getParticipant(id: string): Promise<{ ok: boolean; participant?: Participant; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/participants/${encodeURIComponent(id)}`, {}, 8000)
    return res.json()
  },

  async getWinners(): Promise<{ ok: boolean; winners?: Winner[]; error?: string }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/winners`, {}, 8000)
      if (res.ok) {
        return await res.json()
      }
      return { ok: true, winners: [] }
    } catch {
      return { ok: true, winners: [] }
    }
  },
}
