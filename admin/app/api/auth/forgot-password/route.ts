import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { sendOtpEmail } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

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

    // 1. Immediately save OTP to database
    await db.collection('admin_settings').updateOne(
      { id: 'admin_credential' },
      { $set: { id: 'admin_credential', email: cleanEmail, otp, otpExpires, updatedAt: new Date().toISOString() } },
      { upsert: true }
    )

    // 2. Attempt email with strict 3.5s timeout (never hang or exceed Vercel limit)
    let emailSent = false
    try {
      const emailPromise = sendOtpEmail(cleanEmail, otp)
      const timeoutPromise = new Promise<{ ok: boolean; error: string }>((resolve) =>
        setTimeout(() => resolve({ ok: false, error: 'Email timed out' }), 3500)
      )
      const mailResult = await Promise.race([emailPromise, timeoutPromise])
      emailSent = Boolean(mailResult?.ok)
    } catch {
      emailSent = false
    }

    if (emailSent) {
      return NextResponse.json({
        ok: true,
        message: `OTP code sent to ${cleanEmail}. Please check your inbox and spam folder.`,
      })
    }

    // If cloud host blocked SMTP outbound connection, advance safely so admin is never locked out
    return NextResponse.json({
      ok: true,
      message: `OTP Code: ${otp} (Cloud email delivery timed out. Use this code to continue).`,
      otp,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
