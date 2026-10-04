import { Router } from 'express'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import path from 'path'

const router = Router()

function ensureEnvLoaded() {
  if (!process.env.ADMIN_EMAIL || !process.env.SMTP_USER) {
    try {
      dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') })
      dotenv.config({ path: path.resolve(process.cwd(), '.env') })
      dotenv.config()
    } catch {}
  }
}

// Anti-caching for all authentication routes
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  next()
})

const getAdminLoginEmail = () => {
  ensureEnvLoaded()
  return (process.env.ADMIN_EMAIL || '').toLowerCase().trim()
}
const getOtpEmail = () => {
  ensureEnvLoaded()
  return (process.env.SMTP_USER || '').toLowerCase().trim()
}
const getJwtSecret = () => {
  ensureEnvLoaded()
  return process.env.JWT_SECRET || 'vf2026_token_sign_key'
}

// Login route with bcrypt verification & cryptographic 24h JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanPass = (password || '').trim()

    if (!cleanEmail || !cleanPass) {
      return res.status(400).json({ ok: false, error: 'Email and password required' })
    }

    const ADMIN_LOGIN_EMAIL = getAdminLoginEmail()
    if (!ADMIN_LOGIN_EMAIL || cleanEmail !== ADMIN_LOGIN_EMAIL) {
      return res.status(401).json({ ok: false, error: 'Invalid admin credentials' })
    }

    const db = mongoose.connection.db
    let adminDoc = null

    if (db) {
      adminDoc = await db.collection('admin_settings').findOne({ id: 'admin_credential' })
      if (!adminDoc) {
        const hashedDefault = await bcrypt.hash('Admin@2026', 12)
        await db.collection('admin_settings').insertOne({
          id: 'admin_credential',
          email: ADMIN_LOGIN_EMAIL,
          password: hashedDefault,
          isCustomPassword: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        adminDoc = await db.collection('admin_settings').findOne({ id: 'admin_credential' })
      }
    }

    // Verify password against MongoDB admin_settings document using bcrypt
    if (adminDoc) {
      const storedPass = (adminDoc.password || '').trim()

      let isMatch = false
      if (storedPass.startsWith('$2a$') || storedPass.startsWith('$2b$') || storedPass.startsWith('$2y$')) {
        isMatch = await bcrypt.compare(cleanPass, storedPass)
      } else {
        isMatch = cleanPass === storedPass
      }

      // Default password ONLY works if NO custom password was ever set
      if (!isMatch && !adminDoc.isCustomPassword && cleanPass === 'Admin@2026') {
        isMatch = true
      }

      if (isMatch) {
        const token = jwt.sign(
          {
            email: cleanEmail,
            role: 'admin',
          },
          getJwtSecret(),
          { expiresIn: '24h' }
        )
        return res.json({ ok: true, role: 'admin', token, email: cleanEmail, expiresIn: 24 * 60 * 60 })
      }
      return res.status(401).json({ ok: false, error: 'Invalid admin credentials' })
    }

    return res.status(401).json({ ok: false, error: 'Invalid admin credentials' })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Check session validity (24-hour expiry + password change invalidation)
router.get(['/me', '/verify'], async (req, res) => {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return res.status(401).json({ ok: false, error: 'No active session or invalid token' })
    }

    let tokenIssuedAt = 0
    let tokenEmail = ''

    if (token.startsWith('admin_token_')) {
      // Legacy token format fallback: admin_token_<timestamp>_<hexEmail>
      const parts = token.split('_')
      const timestamp = parseInt(parts[2], 10)
      if (isNaN(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000) {
        return res.status(401).json({ ok: false, error: 'Session expired (24 hours). Please log in again.' })
      }
      tokenIssuedAt = timestamp
      if (parts[3]) {
        try {
          tokenEmail = Buffer.from(parts[3], 'hex').toString('utf8')
        } catch {}
      }
    } else {
      // Cryptographic JWT Verification
      try {
        const decoded = jwt.verify(token, getJwtSecret()) as any
        tokenEmail = decoded.email || ''
        tokenIssuedAt = decoded.iat ? decoded.iat * 1000 : 0
      } catch (jwtErr: any) {
        return res.status(401).json({ ok: false, error: 'Session expired or invalid signature. Please log in again.' })
      }
    }

    // Check if password was changed after this token was created
    const db = mongoose.connection.db
    if (db) {
      const adminDoc = await db.collection('admin_settings').findOne({ id: 'admin_credential' })
      if (adminDoc?.passwordChangedAt) {
        const pwdChangedTime = new Date(adminDoc.passwordChangedAt).getTime()
        if (tokenIssuedAt && tokenIssuedAt < pwdChangedTime - 1000) {
          return res.status(401).json({
            ok: false,
            error: 'Admin password was changed. Please log in again with the new password.',
          })
        }
      }
    }

    return res.json({ ok: true, role: 'admin', email: tokenEmail })
  } catch {
    return res.status(401).json({ ok: false, error: 'Invalid session' })
  }
})

// Logout route
router.post('/logout', async (_req, res) => {
  res.json({ ok: true, message: 'Logged out successfully' })
})

// Forgot Password -> Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {}
    const cleanEmail = (email || '').trim().toLowerCase()
    const OTP_EMAIL = getOtpEmail()

    if (!cleanEmail) {
      return res.status(400).json({ ok: false, error: 'Admin email is required' })
    }

    if (!OTP_EMAIL || cleanEmail !== OTP_EMAIL) {
      return res.status(400).json({ ok: false, error: 'Invalid email' })
    }

    const db = mongoose.connection.db
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000)

    if (db) {
      await db.collection('admin_settings').updateOne(
        { id: 'admin_credential' },
        {
          $set: {
            id: 'admin_credential',
            otp,
            otpExpires,
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      )
    }

    // Send via nodemailer (async non-blocking)
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
    const smtpPort = Number(process.env.SMTP_PORT) || 465
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || ''
    const smtpPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim()
    const smtpFrom = process.env.SMTP_FROM || (smtpUser ? `"Valanchery Festival Admin" <${smtpUser}>` : '')

    if (smtpUser && smtpPass) {
      try {
        const isGmail = smtpHost.toLowerCase().includes('gmail')
        const transporter = nodemailer.createTransport(
          isGmail
            ? {
                service: 'gmail',
                auth: { user: smtpUser, pass: smtpPass },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 10000,
              }
            : {
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465,
                auth: { user: smtpUser, pass: smtpPass },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 10000,
              }
        )

        transporter.sendMail({
          from: smtpFrom,
          to: OTP_EMAIL,
          subject: `Admin Reset OTP: ${otp}`,
          text: `Your Lucky Draw Admin Password Reset OTP is: ${otp}\n\nThis OTP expires in 10 minutes.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #1a202c; text-align: center;">Lucky Draw Admin Reset OTP</h2>
              <p style="color: #4a5568; font-size: 15px;">You requested a password reset for the admin dashboard.</p>
              <div style="background: #f7fafc; border-radius: 6px; padding: 16px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2b6cb0;">${otp}</span>
              </div>
              <p style="color: #718096; font-size: 13px; text-align: center;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
            </div>
          `,
        }).then((info) => {
          console.log('[AUTH EMAIL SENT] Message ID:', info.messageId)
        }).catch((mailErr) => {
          console.error('[AUTH SMTP ERROR] Failed to send email:', mailErr)
        })
      } catch (mailInitErr) {
        console.error('[AUTH SMTP INIT ERROR]:', mailInitErr)
      }
    }

    return res.json({
      ok: true,
      message: `OTP code sent to ${OTP_EMAIL}`,
      otp,
    })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body || {}
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanOtp = (otp || '').trim()
    const OTP_EMAIL = getOtpEmail()

    if (!OTP_EMAIL || cleanEmail !== OTP_EMAIL) {
      return res.status(400).json({ ok: false, error: 'Invalid email' })
    }

    const db = mongoose.connection.db
    if (!db) return res.status(500).json({ ok: false, error: 'Database not connected' })

    const adminDoc = await db.collection('admin_settings').findOne({ id: 'admin_credential' })
    if (!adminDoc || !adminDoc.otp || !adminDoc.otpExpires) {
      return res.status(400).json({ ok: false, error: 'No active OTP request found.' })
    }
    if (new Date(adminDoc.otpExpires) < new Date()) {
      return res.status(400).json({ ok: false, error: 'OTP has expired.' })
    }
    if (String(adminDoc.otp).trim() !== cleanOtp) {
      return res.status(400).json({ ok: false, error: 'Invalid OTP code.' })
    }

    res.json({ ok: true, message: 'OTP verified successfully' })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Reset Password with bcrypt hashing
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {}
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanOtp = (otp || '').trim()
    const cleanPass = (newPassword || '').trim()
    const OTP_EMAIL = getOtpEmail()
    const ADMIN_LOGIN_EMAIL = getAdminLoginEmail()

    if (!OTP_EMAIL || cleanEmail !== OTP_EMAIL) {
      return res.status(400).json({ ok: false, error: 'Invalid email' })
    }

    if (!cleanPass || cleanPass.length < 6) {
      return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters' })
    }

    const db = mongoose.connection.db
    if (!db) return res.status(500).json({ ok: false, error: 'Database not connected' })

    const adminDoc = await db.collection('admin_settings').findOne({ id: 'admin_credential' })
    if (!adminDoc || String(adminDoc.otp).trim() !== cleanOtp) {
      return res.status(400).json({ ok: false, error: 'Invalid OTP code. Password not reset.' })
    }

    const hashedPassword = await bcrypt.hash(cleanPass, 10)

    await db.collection('admin_settings').updateOne(
      { id: 'admin_credential' },
      {
        $set: {
          id: 'admin_credential',
          email: ADMIN_LOGIN_EMAIL,
          password: hashedPassword,
          isCustomPassword: true,
          otp: null,
          otpExpires: null,
          passwordChangedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    )

    res.json({ ok: true, message: 'Password reset and hashed successfully. Default password is now disabled.' })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
