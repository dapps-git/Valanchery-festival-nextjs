import { Router } from 'express'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'

const router = Router()

// Anti-caching for all authentication routes
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  next()
})

const KNOWN_ADMIN_EMAILS = [
  (process.env.ADMIN_EMAIL || '').toLowerCase().trim(),
  (process.env.SMTP_USER || '').toLowerCase().trim(),
  'admin@valancheryfestival.com',
  'valancheryfestival@gmail.com',
].filter(Boolean)

// Login route with bcrypt verification
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanPass = (password || '').trim()

    if (!cleanEmail || !cleanPass) {
      return res.status(400).json({ ok: false, error: 'Email and password required' })
    }

    const isAuthorizedEmail = KNOWN_ADMIN_EMAILS.includes(cleanEmail)
    if (!isAuthorizedEmail) {
      return res.status(401).json({ ok: false, error: 'Invalid admin email address.' })
    }

    const db = mongoose.connection.db
    let adminDoc = null

    if (db) {
      adminDoc = await db.collection('admin_settings').findOne({ id: 'admin_credential' })
      if (!adminDoc) {
        const hashedDefault = await bcrypt.hash('Admin@2026', 12)
        await db.collection('admin_settings').insertOne({
          id: 'admin_credential',
          email: 'admin@valancheryfestival.com',
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
        const token = `admin_token_${Date.now()}_${Buffer.from(cleanEmail).toString('hex')}`
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
    if (!token || !token.startsWith('admin_token_')) {
      return res.status(401).json({ ok: false, error: 'No active session or invalid token' })
    }
    const parts = token.split('_')
    const timestamp = parseInt(parts[2], 10)
    // 24 hours in milliseconds = 86,400,000
    if (isNaN(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      return res.status(401).json({ ok: false, error: 'Session expired (24 hours). Please log in again.' })
    }

    // Check if password was changed after this token was created
    const db = mongoose.connection.db
    if (db) {
      const adminDoc = await db.collection('admin_settings').findOne({ id: 'admin_credential' })
      if (adminDoc?.passwordChangedAt) {
        const pwdChangedTime = new Date(adminDoc.passwordChangedAt).getTime()
        if (timestamp < pwdChangedTime - 1000) {
          return res.status(401).json({
            ok: false,
            error: 'Admin password was changed. Please log in again with the new password.',
          })
        }
      }
    }

    return res.json({ ok: true, role: 'admin' })
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

    if (!cleanEmail) {
      return res.status(400).json({ ok: false, error: 'Admin email is required' })
    }

    const isAuthorized = KNOWN_ADMIN_EMAILS.includes(cleanEmail)
    if (!isAuthorized) {
      return res.status(400).json({ ok: false, error: `Unauthorized email address. Please use your registered admin email.` })
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

    // Send via nodemailer to valancheryfestival@gmail.com
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
    const smtpPort = Number(process.env.SMTP_PORT) || 587
    const isSecure = smtpPort === 465
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'valancheryfestival@gmail.com'
    const smtpPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim()
    const otpDestination = smtpUser || 'valancheryfestival@gmail.com'
    let emailSent = false

    if (!smtpUser || !smtpPass) {
      return res.status(500).json({
        ok: false,
        error: 'SMTP service not configured: SMTP_USER and SMTP_PASS environment variables are required.',
      })
    }

    try {
      const isGmail = smtpHost.toLowerCase().includes('gmail')
      const transporter = nodemailer.createTransport(
        isGmail
          ? {
              service: 'gmail',
              auth: { user: smtpUser, pass: smtpPass },
            }
          : {
              host: smtpHost,
              port: smtpPort,
              secure: isSecure,
              auth: { user: smtpUser, pass: smtpPass },
            }
      )

      const info = await transporter.sendMail({
        from: `"Lucky Draw Admin" <${smtpUser}>`,
        to: otpDestination,
        subject: `Admin Reset OTP: ${otp}`,
        text: `Your Lucky Draw Admin Password Reset OTP is: ${otp}\n\nThis OTP is for the admin account (admin@valancheryfestival.com) and expires in 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1a202c; text-align: center;">Lucky Draw Admin Reset OTP</h2>
            <p style="color: #4a5568; font-size: 15px;">You requested a password reset for the admin dashboard (<strong>admin@valancheryfestival.com</strong>).</p>
            <div style="background: #f7fafc; border-radius: 6px; padding: 16px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2b6cb0;">${otp}</span>
            </div>
            <p style="color: #718096; font-size: 13px; text-align: center;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      })
      console.log('[AUTH EMAIL SENT] Message ID:', info.messageId)
      return res.json({
        ok: true,
        message: `OTP code sent to ${otpDestination}`,
      })
    } catch (mailErr: any) {
      console.error('[AUTH SMTP ERROR] Failed to send email:', mailErr)
      return res.status(500).json({
        ok: false,
        error: `SMTP error: ${mailErr.message || 'Failed to send OTP email'}`,
      })
    }
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body || {}
    const cleanOtp = (otp || '').trim()

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

    res.json({ ok: true, message: 'Password reset and hashed successfully. Default password is now disabled.' })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
