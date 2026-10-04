import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@valancheryfestival.com').toLowerCase().trim()
const ALLOWED_ADMIN_EMAILS = [
  DEFAULT_ADMIN_EMAIL,
  'admin@valancheryfestival.com',
  'valancheryfestival@gmail.com',
].filter(Boolean)
const JWT_SECRET = process.env.JWT_SECRET || 'vf2026_token_sign_key'

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

  // Set 24-hour admin session cookie
  response.cookies.set({
    name: 'admin_token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  })

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')

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
      const hashedDefault = await bcrypt.hash('Admin@2026', 12)
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

    const isAuthorized = ALLOWED_ADMIN_EMAILS.includes(cleanEmail) || (adminDoc?.email && cleanEmail === adminDoc.email.toLowerCase().trim())
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: 'Invalid admin credentials' }, { status: 401 })
    }

    const storedHash = (adminDoc?.password || '').trim()
    let isMatch = false
    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
      isMatch = await bcrypt.compare(cleanPass, storedHash)
    } else {
      isMatch = cleanPass === storedHash
    }

    // Default password ONLY works if NO custom password has ever been set
    if (!isMatch && !adminDoc?.isCustomPassword && cleanPass === 'Admin@2026') {
      isMatch = true
    }

    if (isMatch) {
      return createAdminJwtResponse(cleanEmail)
    }

    return NextResponse.json({ ok: false, error: 'Invalid admin credentials' }, { status: 401 })
  } catch (err: any) {
    console.error('[ADMIN AUTH] Login error:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

