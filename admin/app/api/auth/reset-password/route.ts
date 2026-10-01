import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const cleanEmail = (body.email || '').trim().toLowerCase()
    const cleanOtp = (body.otp || '').trim()
    const cleanPass = (body.newPassword || '').trim()

    if (!cleanPass || cleanPass.length < 6) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const db = await connectDB()
    const adminDoc = await db.collection('admin_settings').findOne({ id: 'admin_credential' })

    if (!adminDoc || String(adminDoc.otp).trim() !== cleanOtp) {
      return NextResponse.json({ ok: false, error: 'Invalid OTP code. Password not reset.' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(cleanPass, 10)
    await db.collection('admin_settings').updateOne(
      { id: 'admin_credential' },
      {
        $set: {
          id: 'admin_credential',
          email: cleanEmail,
          password: hashedPassword,
          isCustomPassword: true,
          otp: null,
          otpExpires: null,
          passwordChangedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    )

    return NextResponse.json({ ok: true, message: 'Password reset successfully.' })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
