import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || ''

export async function GET(request: Request) {
  try {
    let token = ''
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    } else {
      const cookieHeader = request.headers.get('cookie') || ''
      const match = cookieHeader.match(/admin_token=([^;]+)/)
      if (match) token = match[1]
    }

    if (!token) {
      return NextResponse.json({ ok: false, error: 'No active session found' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    return NextResponse.json({
      ok: true,
      admin: {
        email: decoded.email,
        role: decoded.role || 'admin',
        exp: decoded.exp,
      },
    })
  } catch {
    return NextResponse.json({ ok: false, error: 'Session expired or invalid. Please login again.' }, { status: 401 })
  }
}
