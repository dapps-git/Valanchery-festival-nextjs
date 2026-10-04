import { NextResponse } from 'next/server'
import { sendOtpEmail } from '@/lib/mailer'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

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
      return NextResponse.json({ ok: false, error: 'Admin email is required' }, { status: 400 })
    }

    // Only allow OTP for the single registered admin email
    const adminEmail = 'valancheryfestival@gmail.com'

    if (cleanEmail !== adminEmail) {
      return NextResponse.json(
        { ok: false, error: 'This email is not registered as an admin account.' },
        { status: 403 }
      )
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 min
    const token = signOtpToken(cleanEmail, otp, expiresAt)

    // Fire email in background — no await, respond instantly
    sendOtpEmail(cleanEmail, otp).catch(() => {/* silent */})

    return NextResponse.json({
      ok: true,
      message: `OTP sent to ${cleanEmail}. Check your inbox & spam folder.`,
      otp,      // fallback: show on screen if email fails
      token,    // signed token for verify/reset steps
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
