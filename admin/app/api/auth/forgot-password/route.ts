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

    await db.collection('admin_settings').updateOne(
      { id: 'admin_credential' },
      { $set: { id: 'admin_credential', email: cleanEmail, otp, otpExpires, updatedAt: new Date().toISOString() } },
      { upsert: true }
    )

    const mailResult = await sendOtpEmail(cleanEmail, otp)
    if (!mailResult.ok) {
      console.warn(`[OTP EMAIL ERROR] ${mailResult.error}`)
      return NextResponse.json(
        { ok: false, error: mailResult.error || 'Failed to send OTP email via SMTP' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, message: `OTP sent to ${cleanEmail}` })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
