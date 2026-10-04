import { NextRequest, NextResponse } from 'next/server'

// Routes that don't need authentication
const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/verify-otp',
  '/api/auth/reset-password',
  '/api/auth/logout',
  '/api/health',
]

// Helper: decode and verify JWT using Web Crypto API (Edge Runtime compatible)
async function verifyJwt(token: string, secret: string): Promise<boolean> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.')
    if (!headerB64 || !payloadB64 || !signatureB64) return false

    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const signature = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    )

    const data = encoder.encode(`${headerB64}.${payloadB64}`)
    const isValid = await crypto.subtle.verify('HMAC', cryptoKey, signature, data)
    if (!isValid) return false

    // Check expiry
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp && Date.now() / 1000 > payload.exp) return false

    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /api/* routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Allow public auth routes through
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Extract token from cookie or Authorization header
  const cookieToken = request.cookies.get('admin_token')?.value || ''
  const authHeader = request.headers.get('authorization') || ''
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  const token = cookieToken || bearerToken

  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: No token provided' },
      { status: 401 }
    )
  }

  const secret = process.env.JWT_SECRET || ''
  if (!secret) {
    console.error('[MIDDLEWARE] JWT_SECRET not set!')
    return NextResponse.json(
      { ok: false, error: 'Server configuration error' },
      { status: 500 }
    )
  }

  const isValid = await verifyJwt(token, secret)
  if (!isValid) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Invalid or expired token' },
      { status: 401 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
