import { Router } from 'express'
import { Participant } from '../models/Participant.js'
import { Coupon } from '../models/Coupon.js'
import { CouponBatch } from '../models/CouponBatch.js'
import { Counter } from '../models/Counter.js'
import { requireAdminAuth } from '../middleware/auth.js'

const router = Router()

// Initialize counter if needed (aligns with highest existing ID in DB)
export async function initParticipantCounter() {
  try {
    const existing = await Counter.findById('participant_id')
    if (!existing) {
      const participants = await Participant.find({}, { id: 1 }).lean()
      let maxNum = 100
      for (const p of participants) {
        const match = p.id?.match(/\d+$/)
        if (match) {
          const num = parseInt(match[0], 10)
          if (num > maxNum) maxNum = num
        }
      }
      await Counter.findByIdAndUpdate(
        'participant_id',
        { $setOnInsert: { seq: maxNum } },
        { upsert: true }
      )
      console.log(`✅ Participant sequence initialized at ${maxNum}`)
    }
  } catch (err) {
    console.error('Failed to initialize participant counter:', err)
  }
}

// Atomic sequential ID generator (100% collision-free even under 100+ concurrent requests)
export async function getNextParticipantId(): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    'participant_id',
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
  return `VF2026-${String(counter.seq).padStart(5, '0')}`
}

// 1. Register a single participant
router.post('/register', async (req, res) => {
  try {
    const { name, phone: rawPhone, address, location, couponId: rawCoupon } = req.body

    if (!rawPhone?.trim()) return res.status(400).json({ ok: false, error: 'Phone number is required' })

    const phone = rawPhone.replace(/\D/g, '').slice(-10)
    if (phone.length !== 10) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid 10-digit mobile number' })
    }

    // Clean and validate coupon
    let cleanCoupon = ''
    if (rawCoupon) {
      cleanCoupon = rawCoupon.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase()
    }
    if (!cleanCoupon || cleanCoupon.length !== 13) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid 13-character coupon code' })
    }

    // Check if coupon already used by someone else (indexed lean lookup)
    const usedBy = await Participant.findOne({ couponId: cleanCoupon }).select('name registeredAt').lean()
    if (usedBy) {
      return res.status(400).json({ ok: false, error: 'This coupon has already been used and is no longer valid.' })
    }

    // Resolve coupon — search by 13-character code (id) ONLY
    const existingCoupon = await Coupon.findOne({ id: cleanCoupon }).lean()
    if (!existingCoupon) {
      return res.status(400).json({ ok: false, error: 'Coupon not found. Please check the 13-character code.' })
    }
    if (existingCoupon.status === 'Used') {
      return res.status(400).json({ ok: false, error: 'This coupon has already been used and is no longer valid.' })
    }

    // Use the canonical coupon id for storage
    const canonicalCouponId = existingCoupon?.id || cleanCoupon

    const participantName = name?.trim() || `Shopper ${phone.slice(-4)}`
    const now = new Date().toISOString().slice(0, 10)
    let newParticipant: any = null

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const id = await getNextParticipantId()
        newParticipant = await Participant.create({
          id,
          name: participantName,
          phone,
          address: address?.trim() || 'Valanchery',
          location: location?.trim() || 'Valanchery',
          couponId: canonicalCouponId,
          registeredAt: now,
          eligibility: 'Eligible',
          status: 'Active',
        })
        break
      } catch (err: any) {
        if (err?.code === 11000) {
          if (err.keyPattern?.couponId || err.message?.includes('couponId')) {
            return res.status(400).json({ ok: false, error: 'This coupon has already been registered.' })
          }
          // In the rare event of ID collision, retry with next atomic ID
          if (attempt < 4) {
            await new Promise((r) => setTimeout(r, 20 * (attempt + 1)))
            continue
          }
        }
        throw err
      }
    }

    if (!newParticipant) {
      return res.status(500).json({ ok: false, error: 'Unable to complete registration. Please try again.' })
    }

    const id = newParticipant.id

    // Update coupon state in DB atomically with double-spend guard
    if (cleanCoupon) {
      const updatedCoupon = await Coupon.findOneAndUpdate(
        { id: cleanCoupon, status: { $ne: 'Used' } },
        {
          $set: {
            status: 'Used',
            usedAt: now,
            usedByParticipantId: id,
            usedByParticipantName: participantName,
            usedByParticipantPhone: phone,
          },
        },
        { new: true }
      )

      if (updatedCoupon) {
        // Update batch counts safely
        await CouponBatch.updateOne(
          { id: updatedCoupon.batchId },
          { $inc: { unusedCount: -1, usedCount: 1 } }
        ).catch(() => {})
      } else {
        // Rollback participant to prevent double-spend or invalid coupon registration
        await Participant.deleteOne({ id })
        return res.status(400).json({
          ok: false,
          error: 'This coupon was already redeemed or is no longer available.',
        })
      }
    }

    res.status(201).json({ ok: true, id, participant: newParticipant })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' })
  }
})

// 2. Bulk Register / CSV import (admin only)
router.post('/bulk', requireAdminAuth, async (req, res) => {
  try {
    const inputs: Array<{ name: string; phone: string; address?: string; location?: string; couponId?: string }> =
      req.body.participants || []

    const now = new Date().toISOString().slice(0, 10)
    let added = 0
    let invalid = 0
    const toInsert = []

    for (const input of inputs) {
      const phone = (input.phone || '').replace(/\D/g, '').slice(-10)
      if (phone.length < 10) {
        invalid++
        continue
      }
      const id = await getNextParticipantId()

      toInsert.push({
        id,
        name: (input.name || 'Participant').trim(),
        phone,
        address: (input.address || 'Valanchery').trim(),
        location: (input.location || 'Valanchery').trim(),
        couponId: input.couponId ? input.couponId.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase() : undefined,
        registeredAt: now,
        eligibility: 'Eligible' as const,
        status: 'Active' as const,
      })
      added++
    }

    if (toInsert.length > 0) {
      await Participant.insertMany(toInsert)
    }

    res.json({ ok: true, added, duplicates: 0, invalid })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// 3. Get all participants (ADMIN ONLY)
router.get('/', requireAdminAuth, async (_req, res) => {
  try {
    const participants = await Participant.find().sort({ createdAt: -1 }).lean()
    res.json({ ok: true, participants })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// 3b. Get dynamic eligible participants pool for Mega or Normal competition (ADMIN ONLY)
// ELIGIBILITY MATRIX:
// - Never won: Mega ✅, Normal ✅
// - Won Normal: Mega ✅, Normal ❌
// - Won Mega: Mega ❌, Normal ❌
router.get('/eligible', requireAdminAuth, async (req, res) => {
  try {
    const competitionType = (req.query.competitionType as string) || 'Normal'
    if (!['Mega', 'Normal'].includes(competitionType)) {
      return res.status(400).json({ ok: false, error: 'Invalid competitionType. Must be Mega or Normal.' })
    }

    const { Winner } = await import('../models/Winner.js')
    const allWinners = await Winner.find({ status: 'Confirmed' }).lean()

    const megaWinnerIds = new Set<string>()
    const normalWinnerIds = new Set<string>()

    for (const w of allWinners) {
      if (w.competitionType === 'Mega') {
        megaWinnerIds.add(w.participantId)
      } else {
        // Default or Normal
        normalWinnerIds.add(w.participantId)
      }
    }

    let excludeIds: Set<string>
    if (competitionType === 'Mega') {
      // Mega: Exclude only participants who already won Mega
      // (Participants who won Normal are STILL ELIGIBLE for Mega)
      excludeIds = megaWinnerIds
    } else {
      // Normal: Exclude anyone who won Mega OR who won Normal
      excludeIds = new Set<string>([...megaWinnerIds, ...normalWinnerIds])
    }

    const query: any = {
      status: 'Active',
      eligibility: { $ne: 'Ineligible' },
    }
    if (excludeIds.size > 0) {
      query.id = { $nin: Array.from(excludeIds) }
    }

    const eligible = await Participant.find(query).sort({ registeredAt: -1, createdAt: -1 }).lean()
    res.json({ ok: true, competitionType, count: eligible.length, participants: eligible })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// 4. Ticket Pass Lookup by phone or ID
router.get('/lookup/:query', async (req, res) => {
  try {
    const raw = (req.params.query || '').trim()
    if (!raw || raw.length > 50) {
      return res.status(400).json({ ok: false, error: 'Invalid search parameter.' })
    }
    const clean = raw.toLowerCase()
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const digitsOnly = clean.replace(/\D/g, '')

    const participant = await Participant.findOne({
      $or: [
        { id: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        { couponId: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        ...(digitsOnly.length >= 10 ? [{ phone: digitsOnly.slice(-10) }] : []),
      ],
    }).sort({ createdAt: -1 }).lean()

    if (!participant) {
      return res.status(404).json({ ok: false, error: 'No registration found for this phone number or ID.' })
    }

    res.json({
      ok: true,
      participant: {
        id: participant.id,
        name: participant.name,
        phone: participant.phone ? `******${participant.phone.slice(-4)}` : '',
        location: participant.location,
        couponId: participant.couponId,
        registeredAt: participant.registeredAt,
        status: participant.status,
      },
    })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// 5. Update participant (admin only)
router.put('/:id', requireAdminAuth, async (req, res) => {
  try {
    const updated = await Participant.findOneAndUpdate({ id: req.params.id }, req.body, { new: true }).lean()
    if (!updated) return res.status(404).json({ ok: false, error: 'Participant not found' })
    res.json({ ok: true, participant: updated })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// 6. Delete participant (admin only, and restore their coupon to Unused)
router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    const participant = await Participant.findOne({ id: req.params.id })
    if (participant && participant.couponId) {
      const coupon = await Coupon.findOneAndUpdate(
        { id: participant.couponId },
        {
          $set: { status: 'Unused' },
          $unset: {
            usedAt: 1,
            usedByParticipantId: 1,
            usedByParticipantName: 1,
            usedByParticipantPhone: 1,
          },
        },
        { new: true }
      )
      if (coupon && coupon.batchId) {
        await CouponBatch.updateOne(
          { id: coupon.batchId },
          { $inc: { usedCount: -1, unusedCount: 1 } }
        ).catch(() => {})
      }
    }
    await Participant.deleteOne({ id: req.params.id })
    res.json({ ok: true, message: 'Participant deleted and coupon restored' })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
