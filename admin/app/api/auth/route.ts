import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase().trim()
const DEFAULT_PASSWORD = (process.env.ADMIN_PASSWORD || '').trim()
const JWT_SECRET = process.env.JWT_SECRET || ''

function createAdminJwtResponse(email: string) {
  const token = jwt.sign(
    {
      email,
      role: 'admin',
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  )

  const response = NextResponse.json({
    ok: true,
    role: 'admin',
    token,
    expiresIn: 24 * 60 * 60, // 24 hours in seconds (86400)
    email,
  })

  // Set 24h admin session cookie
  response.cookies.set({
    name: 'admin_token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60,
    path: '/',
  })

  return response
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const cleanEmail = (body.email || '').trim().toLowerCase()
    const cleanPass = (body.password || '').trim()

    if (!cleanEmail || !cleanPass) {
      return NextResponse.json({ ok: false, error: 'Email and password required' }, { status: 400 })
    }

    const db = await connectDB()
    const col = db.collection('admin_settings')
    let adminDoc = await col.findOne({ id: 'admin_credential' })

    // ── Auto-seed on first login ────────────────────────────────────────────
    if (!adminDoc) {
      const hashedDefault = await bcrypt.hash(DEFAULT_PASSWORD, 12)
      await col.insertOne({
        id: 'admin_credential',
        email: DEFAULT_ADMIN_EMAIL,
        password: hashedDefault,
        isCustomPassword: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      adminDoc = await col.findOne({ id: 'admin_credential' })
      console.log('[ADMIN] Auto-seeded default credentials on first login')
    }

    // ── If admin has set a custom password via OTP ──────────────────────────
    // isCustomPassword: true → ONLY the new hash works, default is BLOCKED
    if (adminDoc?.isCustomPassword) {
      const storedEmail = (adminDoc.email || '').trim().toLowerCase()
      const storedHash = (adminDoc.password || '').trim()

      if (cleanEmail !== storedEmail) {
        return NextResponse.json({ ok: false, error: 'Invalid admin credentials' }, { status: 401 })
      }

      const isMatch = await bcrypt.compare(cleanPass, storedHash)
      if (!isMatch) {
        return NextResponse.json(
          { ok: false, error: 'Invalid credentials. If you changed your password, use the new one.' },
          { status: 401 }
        )
      }

      return createAdminJwtResponse(cleanEmail)
    }

    // ── Default credentials (isCustomPassword: false) ───────────────────────
    const storedEmail = (adminDoc?.email || DEFAULT_ADMIN_EMAIL).trim().toLowerCase()
    const storedHash = (adminDoc?.password || '').trim()

    if (cleanEmail !== storedEmail && cleanEmail !== DEFAULT_ADMIN_EMAIL) {
      return NextResponse.json({ ok: false, error: 'Invalid admin credentials' }, { status: 401 })
    }

    const isMatch = await bcrypt.compare(cleanPass, storedHash)
    if (isMatch) {
      return createAdminJwtResponse(cleanEmail)
    }

    return NextResponse.json({ ok: false, error: 'Invalid admin credentials' }, { status: 401 })
  } catch (err: any) {
    console.error('[ADMIN AUTH] Login error:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

