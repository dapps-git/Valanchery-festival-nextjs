import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
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
const JWT_SECRET = process.env.JWT_SECRET || ''

const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return true // Allow requests with no origin (curl, server-to-server, Render health check)
  return (
    origin.includes('vercel.app') ||
    origin.includes('valancheryshoppingfestival.com') ||
    origin.includes('valanchery-festival') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  )
}

const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      // Return origin directly so browsers accept credentials and preflight
      return callback(null, origin || true)
    }
    return callback(null, false)
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
})

app.use(corsMiddleware)
app.options('*', corsMiddleware)
// Gzip/Deflate compression — halves payload size under high load
app.use(compression())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

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
      try {
        jwt.verify(token, JWT_SECRET)
        isAdmin = true
      } catch {}
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

// ── Start listening with tuned keep-alive for high concurrency ──
const server = app.listen(PORT, () => {
  console.log(`Valanchery Festival Backend running on http://localhost:${PORT}`)
})
// Keep TCP connections alive for 65s (above Render/AWS 60s idle timeout)
server.keepAliveTimeout = 65000
server.headersTimeout = 70000

// ── Self-Keepalive Ping: Prevents Render free instance from spinning down into sleep ──
const KEEP_ALIVE_URL = process.env.RENDER_EXTERNAL_URL || 'https://valanchery-festival-nextjs-rz49.onrender.com'
setInterval(async () => {
  try {
    const healthUrl = `${KEEP_ALIVE_URL.replace(/\/$/, '')}/health`
    const res = await fetch(healthUrl)
    if (res.ok) {
      console.log(`[KeepAlive] Pinged ${healthUrl} successfully at ${new Date().toISOString()}`)
    }
  } catch (err: any) {
    console.warn(`[KeepAlive] Ping notice: ${err?.message || 'offline'}`)
  }
}, 10 * 60 * 1000) // Every 10 minutes (Render sleeps after 15 minutes of inactivity)

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
      socketTimeoutMS: 45000,
      connectTimeoutMS: 20000,
      maxPoolSize: 300,
      minPoolSize: 20,
      waitQueueTimeoutMS: 30000,
      maxIdleTimeMS: 60000,
    })
    console.log('✅ Connected to MongoDB Atlas (Database: FESTIVAL)')

    // Seed database if empty
    await seedDatabase()

    // Initialize atomic participant counter
    await initParticipantCounter()

    // Enforce unique and lookup indexes for sub-millisecond concurrent queries
    await Promise.allSettled([
      // Coupons: unique on id, compound on (status, id) for fast available-coupon lookup
      Coupon.collection.createIndex({ id: 1 }, { unique: true }),
      Coupon.collection.createIndex({ status: 1, id: 1 }),
      Coupon.collection.createIndex({ batchId: 1 }),
      // Participants: unique id, unique sparse couponId (double-spend guard), phone & date for queries
      Participant.collection.createIndex({ id: 1 }, { unique: true }),
      Participant.collection.createIndex({ couponId: 1 }, { unique: true, sparse: true }),
      Participant.collection.createIndex({ phone: 1 }),
      Participant.collection.createIndex({ registeredAt: -1 }),
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
