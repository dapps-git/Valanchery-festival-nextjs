import { NextResponse } from 'next/server'
import { sendOtpEmail } from '@/lib/mailer'
import { connectDB } from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function signOtpToken(email: string, otp: string, expiresAt: number): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing')
  }
  const payload = `${email}|${otp}|${expiresAt}`
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(`${payload}|${sig}`).toString('base64url')
}

export async function POST(request: Request) {
  try {
    const otpEmail = (process.env.RESEND_MAIL || process.env.SMTP_USER || '').toLowerCase().trim()

    const body = await request.json().catch(() => ({}))
    const cleanEmail = (body.email || '').trim().toLowerCase()

    if (!cleanEmail) {
      return NextResponse.json({ ok: false, error: 'Email address is required' }, { status: 400 })
    }

    if (!otpEmail || cleanEmail !== otpEmail) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 403 })
    }

    const otp = crypto.randomInt(100000, 1000000).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000

    const token = signOtpToken(otpEmail, otp, expiresAt)

    const db = await connectDB()
    await db.collection('admin_settings').updateOne(
      { id: 'admin_credential' },
      { $set: { otp, otpExpires: new Date(expiresAt).toISOString(), updatedAt: new Date().toISOString() } },
      { upsert: true }
    )

    const mailRes = await sendOtpEmail(otpEmail, otp)
    if (!mailRes.ok) {
      console.error('[FORGOT-PASSWORD] Mailer error:', mailRes.error)
      return NextResponse.json({
        ok: false,
        error: mailRes.error || 'Failed to dispatch email. Check SMTP/Resend configuration or spam folder.',
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: 'OTP sent. Check your inbox & spam folder.',
      token,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
