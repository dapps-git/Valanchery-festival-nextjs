import { Router } from 'express'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'

const router = Router()

const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@valancheryfestival.com').toLowerCase().trim()
const DEFAULT_PASSWORD = 'Admin@2026'

// Login route with bcrypt verification
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanPass = (password || '').trim()

    if (!cleanEmail || !cleanPass) {
      return res.status(400).json({ ok: false, error: 'Email and password required' })
    }

    const db = mongoose.connection.db
    let adminDoc = null
    if (db) {
      adminDoc = await db.collection('admin_settings').findOne({ id: 'admin_credential' })
    }

    // If custom password was set by admin
    if (adminDoc && adminDoc.isCustomPassword) {
      const storedEmail = (adminDoc.email || DEFAULT_ADMIN_EMAIL).trim().toLowerCase()
      const storedPass = (adminDoc.password || '').trim()

      let isMatch = false
      if (storedPass.startsWith('$2a$') || storedPass.startsWith('$2b$') || storedPass.startsWith('$2y$')) {
        isMatch = await bcrypt.compare(cleanPass, storedPass)
      } else {
        isMatch = cleanPass === storedPass
      }

      if (cleanEmail === storedEmail && isMatch) {
        return res.json({ ok: true, role: 'admin' })
      }
      return res.status(401).json({ ok: false, error: 'Invalid admin credentials' })
    }

    // Default credentials when no custom password has been set yet
    if (cleanEmail === DEFAULT_ADMIN_EMAIL && cleanPass === DEFAULT_PASSWORD) {
      return res.json({ ok: true, role: 'admin' })
    }

    return res.status(401).json({ ok: false, error: 'Invalid admin credentials' })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Forgot Password -> Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {}
    const cleanEmail = (email || '').trim().toLowerCase()

    if (!cleanEmail) {
      return res.status(400).json({ ok: false, error: 'Admin email is required' })
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
            email: cleanEmail,
            otp,
            otpExpires,
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      )
    }

    // Send via nodemailer if SMTP configured
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
    const smtpPort = Number(process.env.SMTP_PORT) || 465
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS
    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      })
      await transporter.sendMail({
        from: `"Lucky Draw Admin" <${smtpUser}>`,
        to: cleanEmail,
        subject: `Admin Reset OTP: ${otp}`,
        text: `Your OTP is: ${otp}`,
      })
    } else {
      console.log(`[EXPRESS MOCK EMAIL] OTP for ${cleanEmail}: ${otp}`)
    }

    res.json({ ok: true, message: `OTP sent to ${cleanEmail}` })
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
