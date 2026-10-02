import { Router } from 'express'
import QRCode from 'qrcode'
import { Coupon } from '../models/Coupon.js'
import { CouponBatch } from '../models/CouponBatch.js'
import { Participant } from '../models/Participant.js'

const router = Router()

// 0. Direct QR image endpoint (returns real PNG image directly in browser)
router.get(['/qr/:id', '/qr/:id.png'], async (req, res) => {
  try {
    const rawId = req.params.id || ''
    const cleanId = rawId.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase()

    // Determine domain from origin, referer, or default
    const origin = req.get('origin') || req.get('referer')
    let baseUrl = 'https://www.valancheryfestival.com'
    if (origin) {
      try {
        const u = new URL(origin)
        baseUrl = u.origin
      } catch {}
    }

    const regUrl = `${baseUrl}/register?coupon=${cleanId}`

    const qrBuffer = await QRCode.toBuffer(regUrl, {
      width: 600,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.send(qrBuffer)
  } catch (error: any) {
    res.status(500).send('Error generating QR image')
  }
})

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '0123456789'

// Helper to generate guaranteed unique 13-character coupon ID (5 letters + 8 numbers randomly placed in between)
function generateRandom13Char(): string {
  const chars: string[] = []
  // 5 letters
  for (let i = 0; i < 5; i++) {
    chars.push(LETTERS[Math.floor(Math.random() * LETTERS.length)])
  }
  // 8 digits
  for (let i = 0; i < 8; i++) {
    chars.push(DIGITS[Math.floor(Math.random() * DIGITS.length)])
  }
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = chars[i]
    chars[i] = chars[j]
    chars[j] = temp
  }
  return chars.join('')
}

// 1. Validate a single coupon token — accepts GET /validate/:id OR GET /validate?code=...
router.get(['/validate', '/validate/:id'], async (req, res) => {
  try {
    const rawId = (req.params.id || req.query.code || '') as string
    const cleanId = rawId.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase()

    if (!cleanId || cleanId.length < 6 || cleanId.length > 20) {
      return res.json({
        valid: false,
        status: 'Invalid',
        message: 'Invalid festival coupon code.',
      })
    }

    // 1. Check if already redeemed — search by couponId (which may be id or serialNo)
    const registeredUser = await Participant.findOne({
      $or: [{ couponId: cleanId }],
    })
    if (registeredUser) {
      return res.json({
        valid: false,
        status: 'Used',
        usedAt: registeredUser.registeredAt,
        usedByName: registeredUser.name,
        message: 'This coupon has already been used and is no longer valid.',
      })
    }

    // 2. Search coupon by id OR serialNo (printed on physical coupon)
    const existingCoupon = await Coupon.findOne({
      $or: [{ id: cleanId }, { serialNo: cleanId }],
    })

    if (existingCoupon) {
      if (existingCoupon.status === 'Used') {
        return res.json({
          valid: false,
          status: 'Used',
          usedAt: existingCoupon.usedAt,
          usedByName: existingCoupon.usedByParticipantName,
          message: 'This coupon has already been used and is no longer valid.',
        })
      }
      return res.json({
        valid: true,
        status: 'Unused',
        coupon: existingCoupon,
        message: 'Valid Festival Coupon! Ready for registration.',
      })
    }

    // Coupon not found in DB
    return res.json({
      valid: false,
      status: 'Invalid',
      message: 'Coupon not found. Please check the ID and try again.',
    })
  } catch (error: any) {
    res.status(500).json({ valid: false, status: 'Invalid', message: error.message })
  }
})


// 2. Generate a new batch of unique coupons
router.post('/generate', async (req, res) => {
  try {
    const count = Math.min(Math.max(1, Number(req.body.count) || 10), 500000)
    const name = req.body.name || `Batch ${new Date().toLocaleDateString('en-GB')} (${count} coupons)`
    const batchId = `BATCH-${Date.now()}`
    const now = new Date().toISOString()

    // Query existing IDs to ensure 100% collision-free batch
    const existingCoupons = await Coupon.find({}, { id: 1 }).lean()
    const existingSet = new Set(existingCoupons.map((c) => c.id))

    const newCoupons = []
    for (let i = 0; i < count; i++) {
      let id = generateRandom13Char()
      while (existingSet.has(id)) {
        id = generateRandom13Char()
      }
      existingSet.add(id)
      newCoupons.push({
        id,
        serialNo: String(existingCoupons.length + i + 1).padStart(6, '0'),
        batchId,
        status: 'Unused' as const,
        createdAt: now,
      })
    }

    // High-speed chunked insert for large volumes (1 Lakh+)
    const CHUNK_SIZE = 5000
    for (let i = 0; i < newCoupons.length; i += CHUNK_SIZE) {
      const slice = newCoupons.slice(i, i + CHUNK_SIZE)
      await Coupon.insertMany(slice, { ordered: false })
    }

    const batch = await CouponBatch.create({
      id: batchId,
      name,
      count,
      startId: newCoupons[0]?.id || '',
      endId: newCoupons[newCoupons.length - 1]?.id || '',
      createdAt: now,
      unusedCount: count,
      usedCount: 0,
    })

    res.status(201).json({ ok: true, batch, coupons: newCoupons })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// 2.5 Bulk Insert Coupons (from frontend generator)
router.post('/bulk-insert', async (req, res) => {
  try {
    const { batch, coupons } = req.body || {}
    
    if (batch && batch.id) {
      await CouponBatch.updateOne(
        { id: batch.id },
        { $set: batch },
        { upsert: true }
      )
    }

    if (Array.isArray(coupons) && coupons.length > 0) {
      const CHUNK_SIZE = 5000
      for (let i = 0; i < coupons.length; i += CHUNK_SIZE) {
        const slice = coupons.slice(i, i + CHUNK_SIZE)
        try {
          await Coupon.insertMany(slice, { ordered: false })
        } catch (insertErr: any) {
          // If duplicates exist, ignore duplicate key errors (code 11000)
          if (insertErr.code !== 11000 && !insertErr.writeErrors) {
            console.error('Batch insert warning:', insertErr)
          }
        }
      }
    }

    res.json({ ok: true, insertedCount: coupons?.length || 0 })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})


// 3. Get coupons & batches (supports pagination, search, status filter for directory view)
router.get('/', async (req, res) => {
  try {
    const batchId = req.query.batchId as string

    // ── Batch-specific fetch (for Excel export) ──
    if (batchId) {
      const limit = Math.min(Math.max(1, Number(req.query.limit) || 50000), 100000)
      const batchCoupons = await Coupon.find({ batchId }).limit(limit).lean()
      return res.json({ ok: true, coupons: batchCoupons })
    }

    // ── Directory / paginated view ──
    const page    = Math.max(1, Number(req.query.page)  || 1)
    const perPage = Math.min(Math.max(1, Number(req.query.limit) || 50), 200)
    const search  = ((req.query.search as string) || '').trim().toUpperCase()
    const status  = (req.query.status as string) || 'all'

    // Build filter
    const filter: Record<string, any> = {}
    if (status === 'Used')   filter.status = 'Used'
    if (status === 'Unused') filter.status = 'Unused'
    if (search) {
      filter.$or = [
        { id: { $regex: search, $options: 'i' } },
        { serialNo: { $regex: search, $options: 'i' } },
      ]
    }

    const [totalCoupons, filteredCount, coupons, batches] = await Promise.all([
      Coupon.countDocuments({}),
      Coupon.countDocuments(filter),
      Coupon.find(filter, {
        id: 1, serialNo: 1, batchId: 1, status: 1,
        createdAt: 1, usedAt: 1,
        usedByParticipantName: 1, usedByParticipantPhone: 1, usedByParticipantId: 1,
      })
        .sort({ serialNo: 1, createdAt: 1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean(),
      CouponBatch.find().sort({ createdAt: -1 }).lean(),
    ])

    res.json({ ok: true, coupons, batches, totalCoupons, filteredCount })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})


// 4. Get all batches
router.get('/batches', async (_req, res) => {
  try {
    const batches = await CouponBatch.find().sort({ createdAt: -1 }).lean()
    res.json({ ok: true, batches })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// 5. Delete coupon batches (via query params: ?batchId=... or ?all=true)
router.delete('/', async (req, res) => {
  try {
    const batchId = req.query.batchId as string
    const isAll = req.query.all === 'true'

    if (isAll) {
      await Promise.all([
        CouponBatch.deleteMany({}),
        Coupon.deleteMany({}),
        Participant.deleteMany({}),
      ])
      return res.json({ ok: true, message: 'All batches, coupons, and participants deleted' })
    }

    if (batchId) {
      const batchCoupons = await Coupon.find({ batchId }, { id: 1, serialNo: 1 }).lean()
      const couponIdentifiers = new Set<string>()
      batchCoupons.forEach((c: any) => {
        if (c.id) couponIdentifiers.add(String(c.id).toUpperCase())
        if (c.serialNo) couponIdentifiers.add(String(c.serialNo).toUpperCase())
      })
      const couponIdsArray = Array.from(couponIdentifiers)

      if (couponIdsArray.length > 0) {
        const participantsToDelete = await Participant.find({ couponId: { $in: couponIdsArray } }, { id: 1 }).lean()
        const participantIds = participantsToDelete.map((p: any) => p.id).filter(Boolean)
        if (participantIds.length > 0) {
          await Participant.deleteMany({ id: { $in: participantIds } })
        }
      }

      await Promise.all([
        CouponBatch.deleteOne({ id: batchId }),
        Coupon.deleteMany({ batchId }),
      ])

      // Clean up any orphan coupons whose batch no longer exists
      const allBatches = await CouponBatch.find({}, { id: 1 }).lean()
      const activeIds = allBatches.map((b: any) => b.id)
      await Coupon.deleteMany({ batchId: { $nin: activeIds } })

      return res.json({ ok: true, message: 'Batch and associated participants deleted' })
    }

    res.status(400).json({ ok: false, error: 'batchId or all=true required' })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// 6. Delete a coupon batch by ID in URL path (/batches/:id)
router.delete('/batches/:id', async (req, res) => {
  try {
    const batchId = req.params.id

    // Find coupons in batch
    const batchCoupons = await Coupon.find({ batchId }, { id: 1, serialNo: 1 }).lean()
    const couponIdentifiers = new Set<string>()
    batchCoupons.forEach((c: any) => {
      if (c.id) couponIdentifiers.add(String(c.id).toUpperCase())
      if (c.serialNo) couponIdentifiers.add(String(c.serialNo).toUpperCase())
    })
    const couponIdsArray = Array.from(couponIdentifiers)

    if (couponIdsArray.length > 0) {
      const participantsToDelete = await Participant.find({ couponId: { $in: couponIdsArray } }, { id: 1 }).lean()
      const participantIds = participantsToDelete.map((p: any) => p.id).filter(Boolean)
      if (participantIds.length > 0) {
        await Participant.deleteMany({ id: { $in: participantIds } })
      }
    }

    await Promise.all([
      CouponBatch.deleteOne({ id: batchId }),
      Coupon.deleteMany({ batchId }),
    ])

    // Clean up any orphan coupons whose batch no longer exists
    const allBatches = await CouponBatch.find({}, { id: 1 }).lean()
    const activeIds = allBatches.map((b: any) => b.id)
    await Coupon.deleteMany({ batchId: { $nin: activeIds } })

    res.json({ ok: true, message: 'Batch and associated participants deleted' })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
