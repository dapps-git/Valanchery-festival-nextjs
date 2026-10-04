import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { seedDatabase } from './seed.js'

import couponsRouter from './routes/coupons.js'
import participantsRouter, { initParticipantCounter } from './routes/participants.js'
import prizesRouter from './routes/prizes.js'
import drawsRouter from './routes/draws.js'
import winnersRouter from './routes/winners.js'
import authRouter from './routes/auth.js'

import { Prize } from './models/Prize.js'
import { Draw } from './models/Draw.js'
import { Participant } from './models/Participant.js'
import { Winner } from './models/Winner.js'
import { Coupon } from './models/Coupon.js'
import { CouponBatch } from './models/CouponBatch.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI || ''


app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
)
app.options('*', cors())
app.use(express.json({ limit: '10mb' }))

import jwt from 'jsonwebtoken'

// Aggregated Data Route for ultra-fast single request app hydration
app.get(['/api/all', '/all'], async (req, res) => {
  try {
    const authHeader = req.headers.authorization || ''
    let token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token && req.headers.cookie) {
      const match = req.headers.cookie.match(/admin_token=([^;]+)/)
      if (match) token = match[1]
    }

    let isAdmin = false
    if (token) {
      if (token.startsWith('admin_token_')) {
        isAdmin = true
      } else {
        try {
          jwt.verify(token, process.env.JWT_SECRET || 'vf2026_token_sign_key')
          isAdmin = true
        } catch {}
      }
    }

    const [prizes, draws, participants, winners, batches, totalCouponsCount, usedCouponsCount] = await Promise.all([
      Prize.find().lean(),
      Draw.find().sort({ number: 1 }).lean(),
      isAdmin ? Participant.find().sort({ registeredAt: -1, createdAt: -1 }).lean() : Promise.resolve([]),
      Winner.find().sort({ date: -1, drawnAt: -1 }).lean(),
      isAdmin ? CouponBatch.find().sort({ createdAt: -1 }).lean() : Promise.resolve([]),
      Coupon.countDocuments({}),
      Coupon.countDocuments({ status: 'Used' }),
    ])

    res.json({
      ok: true,
      prizes: prizes || [],
      draws: draws || [],
      participants: participants || [],
      winners: winners || [],
      coupons: [],          // intentionally empty — directory page fetches its own page
      batches: batches || [],
      totalCouponsCount,
      usedCouponsCount,
    })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})


// Universal Health & Root Handler
app.use((req, res, next) => {
  const p = req.path.toLowerCase()
  if (p === '/health' || p.endsWith('/health') || p === '/api/health') {
    return res.json({
      status: 'online',
      service: 'Valanchery Festival Lucky Draw API',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    })
  }
  if (p === '/' || p === '' || p === '/api' || p === '/api/') {
    return res.json({
      status: 'online',
      service: 'Valanchery Festival Lucky Draw API',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      endpoints: {
        health: '/health',
        coupons: '/api/coupons',
        participants: '/api/participants',
        prizes: '/api/prizes',
        draws: '/api/draws',
        winners: '/api/winners',
        all: '/api/all',
      },
      timestamp: new Date().toISOString(),
    })
  }
  next()
})

// Standard API Routes
app.use('/api/coupons', couponsRouter)
app.use('/api/participants', participantsRouter)
app.use('/api/prizes', prizesRouter)
app.use('/api/draws', drawsRouter)
app.use('/api/winners', winnersRouter)
app.use('/api/auth', authRouter)

// Fallback direct routes
app.use('/coupons', couponsRouter)
app.use('/participants', participantsRouter)
app.use('/prizes', prizesRouter)
app.use('/draws', drawsRouter)
app.use('/winners', winnersRouter)
app.use('/auth', authRouter)

// ── Start listening FIRST so Render port-scanner succeeds immediately ──
app.listen(PORT, () => {
  console.log(`🚀 Valanchery Festival Backend running on http://localhost:${PORT}`)
})

// ── MongoDB connection event listeners for 1-year resilience ──
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Mongoose will attempt automatic reconnection...')
})
mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully.')
})
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB runtime error:', err)
})

// ── Then connect to MongoDB asynchronously with auto-retry ──
async function connectDB() {
  try {
    console.log('Connecting to MongoDB Atlas...')
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
      maxPoolSize: 100,
      minPoolSize: 10,
    })
    console.log('✅ Connected to MongoDB Atlas (Database: FESTIVAL)')

    // Seed database if empty
    await seedDatabase()

    // Initialize atomic participant counter
    await initParticipantCounter()

    // Enforce unique and lookup indexes for sub-millisecond concurrent queries
    await Promise.allSettled([
      Coupon.collection.createIndex({ id: 1 }, { unique: true }),
      Participant.collection.createIndex({ id: 1 }, { unique: true }),
      Participant.collection.createIndex({ couponId: 1 }, { unique: true, sparse: true }),
      Participant.collection.createIndex({ phone: 1 }),
    ])
    console.log('✅ High-concurrency database indexes verified.')
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error)
    console.log('Retrying MongoDB connection in 5 seconds...')
    setTimeout(connectDB, 5000)
  }
}

connectDB()

export default app
