/**
 * Device-level Rate Limiter for Coupon Registrations:
 * If 20 coupons are registered within 30 minutes from the same device,
 * registration is locked out for 2 hours.
 */

const STORAGE_KEY = 'vf_device_coupon_regs'
const LOCKOUT_KEY = 'vf_device_reg_lockout_until'
const WINDOW_MS = 30 * 60 * 1000 // 30 minutes
export const MAX_COUPONS_PER_WINDOW = 20
export const LOCKOUT_DURATION_MS = 2 * 60 * 60 * 1000 // 2 hours

interface RegHistory {
  timestamps: number[]
}

function getStoredTimestamps(): number[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: RegHistory = JSON.parse(raw)
    const now = Date.now()
    // Keep timestamps from the last 30 minutes
    const valid = (parsed.timestamps || []).filter((ts) => typeof ts === 'number' && now - ts < WINDOW_MS)
    if (valid.length !== parsed.timestamps.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamps: valid }))
    }
    return valid
  } catch {
    return []
  }
}

export function formatRemainingTime(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / (60 * 1000)))
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }
  return `${mins} minute${mins > 1 ? 's' : ''}`
}

/**
 * Checks if the device is currently rate limited or under 2-hour lockout.
 */
export function checkDeviceRateLimit(): {
  isBlocked: boolean
  message: string
  remainingMs: number
} {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { isBlocked: false, message: '', remainingMs: 0 }
  }

  const now = Date.now()

  // 1. Check if an active 2-hour lockout is in effect
  try {
    const lockoutUntilStr = localStorage.getItem(LOCKOUT_KEY)
    if (lockoutUntilStr) {
      const lockoutUntil = parseInt(lockoutUntilStr, 10)
      if (!isNaN(lockoutUntil) && lockoutUntil > now) {
        const remainingMs = lockoutUntil - now
        const timeLeftStr = formatRemainingTime(remainingMs)
        return {
          isBlocked: true,
          message: `You have registered too many coupons from this device. Please take a break and try again after 2 hours (in ${timeLeftStr}).`,
          remainingMs,
        }
      } else {
        localStorage.removeItem(LOCKOUT_KEY)
      }
    }
  } catch {}

  // 2. Check if 20 registrations happened within the last 30 minutes
  const timestamps = getStoredTimestamps()
  if (timestamps.length >= MAX_COUPONS_PER_WINDOW) {
    // Initiate 2-hour lockout
    const lockoutUntil = now + LOCKOUT_DURATION_MS
    try {
      localStorage.setItem(LOCKOUT_KEY, lockoutUntil.toString())
    } catch {}
    return {
      isBlocked: true,
      message: 'You have registered too many coupons from this device. Please take a break and try again after 2 hours.',
      remainingMs: LOCKOUT_DURATION_MS,
    }
  }

  return {
    isBlocked: false,
    message: '',
    remainingMs: 0,
  }
}

/**
 * Call immediately after each successful coupon registration.
 */
export function recordDeviceRegistration(): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const timestamps = getStoredTimestamps()
    const now = Date.now()
    timestamps.push(now)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamps }))

    // If limit of 20 within 30 minutes is now reached, trigger 2-hour lockout
    if (timestamps.length >= MAX_COUPONS_PER_WINDOW) {
      const lockoutUntil = now + LOCKOUT_DURATION_MS
      localStorage.setItem(LOCKOUT_KEY, lockoutUntil.toString())
    }
  } catch {}
}
