const TOKEN_KEY = 'admin_jwt_token'
const TOKEN_EXP_KEY = 'admin_jwt_exp'
const AUTH_KEY = 'vf2026_admin_auth'

/**
 * Purge any and all data/credentials saved in localStorage.
 * Ensures zero localStorage footprint.
 */
export function purgeLocalStorage(): void {
  if (typeof window === 'undefined') return
  try {
    const keysToRemove = [
      'admin_saved_email',
      'admin_saved_password',
      'vf2026_app_data_v1',
      'vf2026_app_data_v2',
      'vf2026_app_data_v3',
      'vf2026_app_data_v4',
      'vf2026_app_data_v5',
      'vf2026_app_data_v6',
      'vf2026_admin_auth',
      'admin_jwt_token',
      'admin_jwt_exp',
    ]
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key)
    }

    // Dynamic sweep: remove any lingering app or admin credentials
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i)
      if (k && (k.startsWith('vf2026_') || k.startsWith('admin_'))) {
        window.localStorage.removeItem(k)
      }
    }
  } catch {}
}

/**
 * Get current admin JWT token from sessionStorage.
 * Also checks localStorage once to seamlessly migrate and purge.
 */
export function getAdminToken(): string {
  if (typeof window === 'undefined') return ''
  try {
    const token = window.sessionStorage.getItem(TOKEN_KEY)
    if (token) return token

    // Migration from old localStorage if user was already logged in
    const legacyToken = window.localStorage.getItem(TOKEN_KEY)
    const legacyExp = window.localStorage.getItem(TOKEN_EXP_KEY)
    if (legacyToken) {
      window.sessionStorage.setItem(TOKEN_KEY, legacyToken)
      if (legacyExp) window.sessionStorage.setItem(TOKEN_EXP_KEY, legacyExp)
      window.sessionStorage.setItem(AUTH_KEY, '1')
      purgeLocalStorage()
      return legacyToken
    }
  } catch {}
  return ''
}

export function isSessionValid(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const token = getAdminToken()
    const expStr = window.sessionStorage.getItem(TOKEN_EXP_KEY)
    if (!token || !expStr) return false
    const expTime = parseInt(expStr, 10)
    if (isNaN(expTime) || Date.now() >= expTime) {
      clearAdminSession()
      return false
    }
    return true
  } catch {
    return false
  }
}

export function setAdminSession(token: string, expTime: number): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token)
    window.sessionStorage.setItem(TOKEN_EXP_KEY, expTime.toString())
    window.sessionStorage.setItem(AUTH_KEY, '1')
    purgeLocalStorage() // Ensure localStorage remains completely clean
  } catch {}
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(TOKEN_KEY)
    window.sessionStorage.removeItem(TOKEN_EXP_KEY)
    window.sessionStorage.removeItem(AUTH_KEY)
    purgeLocalStorage()
  } catch {}
}
