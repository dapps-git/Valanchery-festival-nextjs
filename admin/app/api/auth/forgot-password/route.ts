import { NextResponse } from 'next/server'
import { sendOtpEmail } from '@/lib/mailer'
import crypto from 'crypto'

import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

const OTP_RECIPIENT_EMAIL = 'valancheryfestival@gmail.com'
const ALLOWED_EMAILS = [
  'valancheryfestival@gmail.com',
  'admin@valancheryfestival.com',
  (process.env.ADMIN_EMAIL || '').toLowerCase().trim(),
].filter(Boolean)

function signOtpToken(email: string, otp: string, expiresAt: number): string {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'vf2026-secret'
  const payload = `${email}|${otp}|${expiresAt}`
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(`${payload}|${sig}`).toString('base64url')
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const cleanEmail = (body.email || '').trim().toLowerCase()

    if (!cleanEmail) {
      return NextResponse.json({ ok: false, error: 'Email address is required' }, { status: 400 })
    }

    // Only allow verified admin email or recovery email
    if (!ALLOWED_EMAILS.includes(cleanEmail)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email' },
        { status: 403 }
      )
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 min
    const token = signOtpToken(OTP_RECIPIENT_EMAIL, otp, expiresAt)

    // Save to DB in background so verify-otp / reset-password work reliably
    connectDB()
      .then((db) =>
        db.collection('admin_settings').updateOne(
          { id: 'admin_credential' },
          {
            $set: {
              otp,
              otpExpires: new Date(expiresAt).toISOString(),
              recoveryEmail: OTP_RECIPIENT_EMAIL,
              updatedAt: new Date().toISOString(),
            },
          },
          { upsert: true }
        )
      )
      .catch((err) => console.error('[FORGOT-PASSWORD] DB save error:', err))

    // Send email specifically to valancheryfestival@gmail.com
    sendOtpEmail(OTP_RECIPIENT_EMAIL, otp).catch((err) =>
      console.error('[FORGOT-PASSWORD] Mailer error:', err)
    )

    return NextResponse.json({
      ok: true,
      message: 'OTP sent. Check your inbox & spam folder.',
      otp, // fallback: in case email is delayed
      token, // signed token for instant verify
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
