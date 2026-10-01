
export function extractCouponId(input?: string | null): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // 1. Try URL parsing if it looks like a URL or query string
  try {
    if (trimmed.includes('http://') || trimmed.includes('https://') || trimmed.includes('?') || trimmed.includes('=')) {
      const urlString = trimmed.startsWith('http')
        ? trimmed
        : `http://dummy.com/${trimmed.startsWith('?') ? trimmed : `?${trimmed}`}`
      const url = new URL(urlString)
      const paramVal =
        url.searchParams.get('coupon') ||
        url.searchParams.get('token') ||
        url.searchParams.get('id') ||
        url.searchParams.get('c') ||
        url.searchParams.get('t') ||
        url.searchParams.get('code')

      if (paramVal) {
        const clean = paramVal.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
        if (clean.length === 13 || clean.length === 10) return clean
        if (clean.length > 13) return clean.slice(0, 13)
        if (clean.length >= 8) return clean
      }
    }
  } catch {
    // fallback
  }

  // 2. Look for 4-prefix sequential ID: e.g. A000001, B025000, C000049, D000100
  const cleanAlphanumeric = trimmed.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  const matchPrefix = cleanAlphanumeric.match(/^[ABCD]\d{5,6}$/)
  if (matchPrefix) {
    return matchPrefix[0]
  }

  // 3. Look for 13-character registration security code
  if (cleanAlphanumeric.length === 13) {
    return cleanAlphanumeric
  }

  // 4. Match 13-char regex within string
  const match13 = trimmed.toUpperCase().match(/\b[A-Z0-9]{13}\b/)
  if (match13) {
    return match13[0]
  }

  // 5. Match prefix ID within string
  const matchPrefixInner = trimmed.toUpperCase().match(/\b[ABCD]\d{5,6}\b/)
  if (matchPrefixInner) {
    return matchPrefixInner[0]
  }

  // 6. Backward compatibility: 10 digits
  if (cleanAlphanumeric.length === 10) {
    return cleanAlphanumeric
  }
  const match10 = trimmed.match(/\b\d{10}\b/)
  if (match10) {
    return match10[0]
  }

  // 7. If string starts with 13 alphanumeric chars
  if (cleanAlphanumeric.length > 13) {
    return cleanAlphanumeric.slice(0, 13)
  }

  return cleanAlphanumeric.length >= 6 ? cleanAlphanumeric : null
}


export function formatCouponDisplay(couponId: string): string {
  if (!couponId) return ''
  const clean = couponId.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

  // 13 characters (e.g. VFKLM74920184 -> VFKLM 7492 0184)
  if (clean.length === 13) {
    return `${clean.slice(0, 5)} ${clean.slice(5, 9)} ${clean.slice(9)}`
  }

  // 10 digits (e.g. 7492018401 -> 7492 018 401)
  if (clean.length === 10) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`
  }

  return clean
}
