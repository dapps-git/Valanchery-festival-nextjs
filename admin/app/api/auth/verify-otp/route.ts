import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const cleanOtp = (body.otp || '').trim()

    const db = await connectDB()
    const adminDoc = await db.collection('admin_settings').findOne({ id: 'admin_credential' })

    if (!adminDoc?.otp || !adminDoc?.otpExpires) {
      return NextResponse.json({ ok: false, error: 'No active OTP request found.' }, { status: 400 })
    }
    if (new Date(adminDoc.otpExpires) < new Date()) {
      return NextResponse.json({ ok: false, error: 'OTP has expired.' }, { status: 400 })
    }
    if (String(adminDoc.otp).trim() !== cleanOtp) {
      return NextResponse.json({ ok: false, error: 'Invalid OTP code.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, message: 'OTP verified successfully' })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
