import { Router } from 'express'
import crypto from 'node:crypto'
import { Coupon } from '../models/Coupon.js'
import { Participant } from '../models/Participant.js'
import { requireAdminAuth } from '../middleware/auth.js'

const router = Router()

/* ==========================================================================
   TEMPORARY TESTING FUNCTIONALITY - START
   This router and all associated methods are for testing purposes only.
   To remove: delete this file, unmount router in server.ts, and remove UI components.
   ========================================================================== */

interface TestJobState {
  type: 'generate' | 'all-used' | 'reset-unused' | 'idle'
  current: number
  total: number
  status: 'idle' | 'running' | 'completed' | 'failed'
  message: string
  startedAt?: string
  completedAt?: string
  error?: string | null
}

let activeJob: TestJobState = {
  type: 'idle',
  current: 0,
  total: 0,
  status: 'idle',
  message: 'No test job running',
}

const ALPHANUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateRandomSuffix(len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) {
    s += ALPHANUM[crypto.randomInt(0, ALPHANUM.length)]
  }
  return s
}

// 1. Generate unique 13-character test coupon ID:
// "TEST" (4 chars) + 5 chars base-36 sequence (up to 60M) + 4 random alphanumeric chars = 13 chars
function createTestCouponId(seq: number): string {
  const seqPart = seq.toString(36).toUpperCase().padStart(5, '0')
  const randPart = generateRandomSuffix(4)
  return `TEST${seqPart}${randPart}`
}

// GET /api/test/progress - Read live progress of any ongoing test operation
router.get('/progress', requireAdminAuth, (_req, res) => {
  const pct = activeJob.total > 0 ? Math.round((activeJob.current / activeJob.total) * 100) : 0
  res.json({
    ok: true,
    job: {
      ...activeJob,
      percentage: pct,
    },
  })
})

// GET /api/test/stats - Database-verified counts for test data
router.get('/stats', requireAdminAuth, async (_req, res) => {
  try {
    const [totalCoupons, totalParticipants, unusedCoupons, usedCoupons] = await Promise.all([
      Coupon.countDocuments({ isTest: true }),
      Participant.countDocuments({ isTest: true }),
      Coupon.countDocuments({ isTest: true, status: 'Unused' }),
      Coupon.countDocuments({ isTest: true, status: 'Used' }),
    ])

    res.json({
      ok: true,
      stats: {
        totalTestCoupons: totalCoupons,
        totalTestParticipants: totalParticipants,
        unusedTestCoupons: unusedCoupons,
        usedTestCoupons: usedCoupons,
      },
    })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// POST /api/test/generate - Bulk generate up to 1,000,000 test coupons and dummy participants
router.post('/generate', requireAdminAuth, async (req, res) => {
  if (activeJob.status === 'running') {
    return res.status(409).json({
      ok: false,
      error: 'A testing job is already currently in progress. Please wait for it to complete.',
      job: activeJob,
    })
  }

  const count = Math.min(Math.max(1, parseInt(req.body.count, 10) || 1000), 1000000)
  const batchId = `TEST-BATCH-${Date.now()}`
  const now = new Date().toISOString()
  const today = now.slice(0, 10)

  // Find the current highest test coupon count to start numbering sequentially
  const existingCount = await Coupon.countDocuments({ isTest: true })
  const startSeq = existingCount + 1

  activeJob = {
    type: 'generate',
    current: 0,
    total: count,
    status: 'running',
    message: `Starting generation of ${count.toLocaleString()} test coupons...`,
    startedAt: new Date().toISOString(),
    error: null,
  }

  // Response acknowledges that generation has started asynchronously
  // While running in background, client tracks progress via /progress
  res.status(202).json({
    ok: true,
    message: `Test generation job initiated for ${count.toLocaleString()} coupons.`,
    total: count,
    batchId,
  })

  // Asynchronous streaming worker for handling up to 1,000,000 records smoothly
  ;(async () => {
    const CHUNK_SIZE = 5000
    let inserted = 0

    try {
      for (let i = 0; i < count; i += CHUNK_SIZE) {
        const thisChunkSize = Math.min(CHUNK_SIZE, count - i)
        const couponDocs = new Array(thisChunkSize)
        const participantDocs = new Array(thisChunkSize)

        for (let j = 0; j < thisChunkSize; j++) {
          const seq = startSeq + i + j
          const couponId = createTestCouponId(seq)
          const participantName = `Test ${seq}`
          const participantId = `TEST-${String(seq).padStart(7, '0')}`

          couponDocs[j] = {
            id: couponId,
            serialNo: `T${String(seq).padStart(7, '0')}`,
            batchId,
            status: 'Unused' as const,
            createdAt: now,
            isTest: true,
          }

          participantDocs[j] = {
            id: participantId,
            name: participantName,
            phone: `9999${String(seq % 1000000).padStart(6, '0')}`,
            address: 'Valanchery Test Arena',
            location: 'Valanchery Test Center',
            couponId,
            registeredAt: today,
            eligibility: 'Eligible' as const,
            status: 'Active' as const,
            isTest: true,
          }
        }

        // Parallel insertion of coupon and participant chunks
        await Promise.all([
          Coupon.insertMany(couponDocs, { ordered: false }),
          Participant.insertMany(participantDocs, { ordered: false }),
        ])

        inserted += thisChunkSize
        activeJob.current = inserted
        const pct = Math.round((inserted / count) * 100)
        activeJob.message = `Generated ${inserted.toLocaleString()} / ${count.toLocaleString()} (${pct}%)`
      }

      // Verify final database counts
      const [finalCoupons, finalParticipants] = await Promise.all([
        Coupon.countDocuments({ isTest: true }),
        Participant.countDocuments({ isTest: true }),
      ])

      activeJob.status = 'completed'
      activeJob.completedAt = new Date().toISOString()
      activeJob.message = `Successfully generated ${inserted.toLocaleString()} test coupons and participants. DB Verified: ${finalCoupons} coupons, ${finalParticipants} participants.`
    } catch (err: any) {
      console.error('Test generation worker error:', err)
      activeJob.status = 'failed'
      activeJob.completedAt = new Date().toISOString()
      activeJob.error = err.message || 'Error occurred during test generation'
      activeJob.message = `Failed after ${inserted.toLocaleString()} records: ${err.message}`
    }
  })()
})

// POST /api/test/all-used - Mark all UNUSED test coupons as USED
router.post('/all-used', requireAdminAuth, async (_req, res) => {
  if (activeJob.status === 'running') {
    return res.status(409).json({
      ok: false,
      error: 'Another testing operation is currently in progress. Please wait.',
    })
  }

  try {
    const unUsedCount = await Coupon.countDocuments({ isTest: true, status: 'Unused' })
    if (unUsedCount === 0) {
      const verifiedUsed = await Coupon.countDocuments({ isTest: true, status: 'Used' })
      return res.json({
        ok: true,
        message: 'No UNUSED test coupons to update. All test coupons are already USED.',
        updatedCount: 0,
        verifiedUsed,
        verifiedUnused: 0,
      })
    }

    activeJob = {
      type: 'all-used',
      current: 0,
      total: unUsedCount,
      status: 'running',
      message: `Updating ${unUsedCount.toLocaleString()} test coupons from UNUSED to USED...`,
      startedAt: new Date().toISOString(),
      error: null,
    }

    const now = new Date().toISOString()

    // High performance bulk update targeting only isTest: true records
    const updateResult = await Coupon.updateMany(
      { isTest: true, status: 'Unused' },
      { $set: { status: 'Used', usedAt: now } }
    )

    // Verify final counts in database
    const [verifiedUsed, verifiedUnused] = await Promise.all([
      Coupon.countDocuments({ isTest: true, status: 'Used' }),
      Coupon.countDocuments({ isTest: true, status: 'Unused' }),
    ])

    activeJob.status = 'completed'
    activeJob.current = updateResult.modifiedCount
    activeJob.completedAt = new Date().toISOString()
    activeJob.message = `Successfully marked ${updateResult.modifiedCount.toLocaleString()} test coupons as USED.`

    res.json({
      ok: true,
      message: `Successfully marked ${updateResult.modifiedCount.toLocaleString()} test coupons as USED.`,
      updatedCount: updateResult.modifiedCount,
      verifiedUsed,
      verifiedUnused,
    })
  } catch (error: any) {
    activeJob.status = 'failed'
    activeJob.error = error.message
    res.status(500).json({ ok: false, error: error.message })
  }
})

// POST /api/test/reset-unused - Reset all USED test coupons back to UNUSED
router.post('/reset-unused', requireAdminAuth, async (_req, res) => {
  if (activeJob.status === 'running') {
    return res.status(409).json({
      ok: false,
      error: 'Another testing operation is currently in progress. Please wait.',
    })
  }

  try {
    const usedCount = await Coupon.countDocuments({ isTest: true, status: 'Used' })
    if (usedCount === 0) {
      const verifiedUnused = await Coupon.countDocuments({ isTest: true, status: 'Unused' })
      return res.json({
        ok: true,
        message: 'No USED test coupons to reset. All test coupons are already UNUSED.',
        resetCount: 0,
        verifiedUnused,
        verifiedUsed: 0,
      })
    }

    activeJob = {
      type: 'reset-unused',
      current: 0,
      total: usedCount,
      status: 'running',
      message: `Resetting ${usedCount.toLocaleString()} test coupons from USED to UNUSED...`,
      startedAt: new Date().toISOString(),
      error: null,
    }

    // High performance bulk update targeting only isTest: true records
    const updateResult = await Coupon.updateMany(
      { isTest: true, status: 'Used' },
      {
        $set: { status: 'Unused' },
        $unset: {
          usedAt: 1,
          usedByParticipantId: 1,
          usedByParticipantName: 1,
          usedByParticipantPhone: 1,
        },
      }
    )

    // Verify final counts in database
    const [verifiedUnused, verifiedUsed] = await Promise.all([
      Coupon.countDocuments({ isTest: true, status: 'Unused' }),
      Coupon.countDocuments({ isTest: true, status: 'Used' }),
    ])

    activeJob.status = 'completed'
    activeJob.current = updateResult.modifiedCount
    activeJob.completedAt = new Date().toISOString()
    activeJob.message = `Successfully reset ${updateResult.modifiedCount.toLocaleString()} test coupons to UNUSED.`

    res.json({
      ok: true,
      message: `Successfully reset ${updateResult.modifiedCount.toLocaleString()} test coupons to UNUSED.`,
      resetCount: updateResult.modifiedCount,
      verifiedUnused,
      verifiedUsed,
    })
  } catch (error: any) {
    activeJob.status = 'failed'
    activeJob.error = error.message
    res.status(500).json({ ok: false, error: error.message })
  }
})

// GET /api/test/coupons - Paginated view of test coupons (never loads 1M into frontend)
router.get('/coupons', requireAdminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string, 10) || 50), 200)
    const status = (req.query.status as string) || 'all'
    const search = ((req.query.search as string) || '').trim().toUpperCase()

    const filter: Record<string, any> = { isTest: true }
    if (status === 'Used') filter.status = 'Used'
    if (status === 'Unused') filter.status = 'Unused'
    if (search) {
      filter.$or = [
        { id: { $regex: search, $options: 'i' } },
        { serialNo: { $regex: search, $options: 'i' } },
      ]
    }

    const [total, coupons] = await Promise.all([
      Coupon.countDocuments(filter),
      Coupon.find(filter)
        .sort({ createdAt: -1, serialNo: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ])

    res.json({
      ok: true,
      coupons,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// GET /api/test/participants - Paginated view of dummy participants
router.get('/participants', requireAdminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string, 10) || 50), 200)
    const search = ((req.query.search as string) || '').trim()

    const filter: Record<string, any> = { isTest: true }
    if (search) {
      filter.$or = [
        { id: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { couponId: { $regex: search, $options: 'i' } },
      ]
    }

    const [total, participants] = await Promise.all([
      Participant.countDocuments(filter),
      Participant.find(filter)
        .sort({ id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ])

    res.json({
      ok: true,
      participants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

/* ==========================================================================
   TEMPORARY TESTING FUNCTIONALITY - END
   ========================================================================== */

export default router
