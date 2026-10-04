import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import bcrypt from 'bcryptjs'
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
    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim()

    const body = await request.json().catch(() => ({}))
    const cleanEmail = (body.email || '').trim().toLowerCase()
    const cleanOtp = (body.otp || '').trim()
    const cleanPass = (body.newPassword || '').trim()
    const token = (body.token || '').trim()

    if (!otpEmail || cleanEmail !== otpEmail) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 })
    }

    if (!cleanPass || cleanPass.length < 6) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    let otpValid = false
    const db = await connectDB()

    if (token) {
      otpValid = verifyOtpToken(token, cleanOtp)
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
          email: adminEmail,
          password: hashedPassword,
          isCustomPassword: true,
          otp: null,
          otpExpires: null,
          passwordChangedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
