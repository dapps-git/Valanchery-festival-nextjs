import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function verifyOtpToken(token: string, email: string, otp: string): boolean {
  try {
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'vf2026-secret'
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const parts = decoded.split('|')
    if (parts.length !== 4) return false
    const [tokEmail, tokOtp, tokExpires, tokSig] = parts
    const payload = `${tokEmail}|${tokOtp}|${tokExpires}`
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    if (tokSig !== expectedSig) return false
    if (Number(tokExpires) < Date.now()) return false
    if (tokEmail !== email.trim().toLowerCase()) return false
    if (tokOtp !== otp.trim()) return false
    return true
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const cleanEmail = (body.email || '').trim().toLowerCase()
    const cleanOtp = (body.otp || '').trim()
    const cleanPass = (body.newPassword || '').trim()
    const token = (body.token || '').trim()

    if (!cleanPass || cleanPass.length < 6) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Verify OTP — use token if available, else fall back to DB
    let otpValid = false
    const db = await connectDB()

    if (token) {
      otpValid = verifyOtpToken(token, cleanEmail, cleanOtp)
    } else {
      const adminDoc = await db.collection('admin_settings').findOne({ id: 'admin_credential' })
      otpValid = adminDoc ? String(adminDoc.otp).trim() === cleanOtp : false
    }

    if (!otpValid) {
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

    return NextResponse.json(
      { ok: true, message: 'Password reset successfully.' },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

