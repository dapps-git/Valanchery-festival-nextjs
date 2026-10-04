import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function verifyOtpToken(token: string, otp: string): boolean {
  try {
    const secret = process.env.JWT_SECRET || 'vf2026-secret'
    const otpEmail = (process.env.SMTP_USER || '').toLowerCase().trim()
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const parts = decoded.split('|')
    if (parts.length !== 4) return false
    const [tokEmail, tokOtp, tokExpires, tokSig] = parts
    const payload = `${tokEmail}|${tokOtp}|${tokExpires}`
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    if (tokSig !== expectedSig) return false
    if (Number(tokExpires) < Date.now()) return false
    if (tokEmail.toLowerCase().trim() !== otpEmail) return false
    if (tokOtp !== otp.trim()) return false
    return true
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const otpEmail = (process.env.SMTP_USER || '').toLowerCase().trim()
    const body = await request.json().catch(() => ({}))
    const cleanOtp = (body.otp || '').trim()
    const cleanEmail = (body.email || '').trim().toLowerCase()
    const token = (body.token || '').trim()

    if (!otpEmail || cleanEmail !== otpEmail) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 })
    }

    if (token) {
      if (verifyOtpToken(token, cleanOtp)) {
        return NextResponse.json({ ok: true, message: 'OTP verified successfully' })
      }
      return NextResponse.json({ ok: false, error: 'Invalid or expired OTP code.' }, { status: 400 })
    }

    // Fallback: DB-based verification
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
