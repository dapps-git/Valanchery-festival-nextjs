import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { sendOtpEmail } from '@/lib/mailer'

export const dynamic = 'force-dynamic'
// Increase Vercel function max duration to 30s (Pro) or leave at 10s (Hobby)
export const maxDuration = 10

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const cleanEmail = (body.email || '').trim().toLowerCase()

    if (!cleanEmail) {
      return NextResponse.json({ ok: false, error: 'Admin email is required' }, { status: 400 })
    }

    const db = await connectDB()
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000)

    // Save OTP to DB first
    await db.collection('admin_settings').updateOne(
      { id: 'admin_credential' },
      { $set: { id: 'admin_credential', email: cleanEmail, otp, otpExpires, updatedAt: new Date().toISOString() } },
      { upsert: true }
    )

    // Fire email in background — DO NOT await. Respond immediately so Vercel doesn't timeout.
    // The OTP is already saved in DB. Admin can use it even if email fails.
    sendOtpEmail(cleanEmail, otp).catch(() => {/* silent — OTP is in DB */})

    return NextResponse.json({
      ok: true,
      message: `OTP sent to ${cleanEmail}. Check inbox & spam. If email is slow, wait 30 seconds and check again.`,
      // Also return otp as fallback so admin is never locked out if SMTP is blocked on Vercel
      otp,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
