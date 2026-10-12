import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json({ ok: false, error: 'Server configuration error: JWT_SECRET missing' }, { status: 500 })
    }

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

    const decoded = jwt.verify(token, jwtSecret) as any

    // Invalidate sessions issued before password change
    try {
      const db = await connectDB()
      const adminDoc = await db.collection('admin_settings').findOne({ id: 'admin_credential' })
      if (adminDoc?.passwordChangedAt) {
        const pwdChangedTime = new Date(adminDoc.passwordChangedAt).getTime()
        const tokenIssuedAt = decoded.iat ? decoded.iat * 1000 : 0
        // Invalidate old tokens
        if (tokenIssuedAt < pwdChangedTime - 1000) {
          return NextResponse.json(
            { ok: false, error: 'Admin password was changed. Please log in again with the new password.' },
            { status: 401 }
          )
        }
      }
    } catch {
      // If DB error, proceed with decoded JWT
    }

    return NextResponse.json(
      {
        ok: true,
        admin: {
          email: decoded.email,
          role: decoded.role || 'admin',
          exp: decoded.exp,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Session expired or invalid. Please login again.' },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
  }
}
