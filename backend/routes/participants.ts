import { Router } from 'express'
import { Participant } from '../models/Participant.js'
import { Coupon } from '../models/Coupon.js'
import { CouponBatch } from '../models/CouponBatch.js'

const router = Router()

// Helper to generate next sequential participant ID (guaranteed max suffix)
async function getNextParticipantId(): Promise<string> {
  const participants = await Participant.find({}, { id: 1 }).lean()
  if (!participants.length) return 'VF2026-00101'

  let maxNum = 100
  for (const p of participants) {
    const match = p.id.match(/\d+$/)
    if (match) {
      const num = parseInt(match[0], 10)
      if (num > maxNum) maxNum = num
    }
  }

  return `VF2026-${String(maxNum + 1).padStart(5, '0')}`
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
    if (!cleanCoupon || cleanCoupon.length < 8 || cleanCoupon.length > 16) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid 13-character coupon code' })
    }

    // Check if coupon already used by someone else
    const usedBy = await Participant.findOne({ couponId: cleanCoupon })
    if (usedBy) {
      return res.status(400).json({ ok: false, error: 'This coupon has already been used and is no longer valid.' })
    }

    // Check if coupon exists and is already marked Used
    const existingCoupon = await Coupon.findOne({ id: cleanCoupon })
    if (existingCoupon && existingCoupon.status === 'Used') {
      return res.status(400).json({ ok: false, error: 'This coupon has already been used and is no longer valid.' })
    }

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
          couponId: cleanCoupon,
          registeredAt: now,
          eligibility: 'Eligible',
          status: 'Active',
        })
        break
      } catch (err: any) {
        if (err?.code === 11000) {
          if (err.keyPattern?.couponId || err.message?.includes('couponId')) {
            return res.status(400).json({ ok: false, error: 'This coupon is already taken.' })
          }
          if (attempt < 4) {
            // Retry on concurrent sequential ID collision
            await new Promise((r) => setTimeout(r, 40 * (attempt + 1)))
            continue
          }
        }
        throw err
      }
    }
    const id = newParticipant.id

    // Update coupon state in DB
    if (cleanCoupon) {
      const existingCoupon = await Coupon.findOne({ id: cleanCoupon })
      if (existingCoupon) {
        existingCoupon.status = 'Used'
        existingCoupon.usedAt = now
        existingCoupon.usedByParticipantId = id
        existingCoupon.usedByParticipantName = participantName
        existingCoupon.usedByParticipantPhone = phone
        await existingCoupon.save()

        // Update batch counts
        await CouponBatch.updateOne(
          { id: existingCoupon.batchId },
          { $inc: { unusedCount: -1, usedCount: 1 } }
        )
      } else {
        // Record coupon in database
        await Coupon.create({
          id: cleanCoupon,
          batchId: 'BATCH-EXTERNAL',
          status: 'Used',
          createdAt: now,
          usedAt: now,
          usedByParticipantId: id,
          usedByParticipantName: participantName,
          usedByParticipantPhone: phone,
        })
      }
    }

    res.status(201).json({ ok: true, id, participant: newParticipant })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// 2. Bulk Register / CSV import
router.post('/bulk', async (req, res) => {
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

// 3. Get all participants
router.get('/', async (_req, res) => {
  try {
    const participants = await Participant.find().sort({ createdAt: -1 }).lean()
    res.json({ ok: true, participants })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// 4. Ticket Pass Lookup by phone or ID
router.get('/lookup/:query', async (req, res) => {
  try {
    const clean = req.params.query.trim().toLowerCase()
    const digitsOnly = clean.replace(/\D/g, '')

    const participant = await Participant.findOne({
      $or: [
        { id: { $regex: new RegExp(`^${clean}$`, 'i') } },
        { couponId: { $regex: new RegExp(`^${clean}$`, 'i') } },
        ...(digitsOnly.length >= 10 ? [{ phone: digitsOnly.slice(-10) }] : []),
      ],
    }).sort({ createdAt: -1 }).lean()

    if (!participant) {
      return res.status(404).json({ ok: false, error: 'No registration found for this phone number or ID.' })
    }

    res.json({ ok: true, participant })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// 5. Update participant
router.put('/:id', async (req, res) => {
  try {
    const updated = await Participant.findOneAndUpdate({ id: req.params.id }, req.body, { new: true }).lean()
    if (!updated) return res.status(404).json({ ok: false, error: 'Participant not found' })
    res.json({ ok: true, participant: updated })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// 6. Delete participant
router.delete('/:id', async (req, res) => {
  try {
    await Participant.deleteOne({ id: req.params.id })
    res.json({ ok: true, message: 'Participant deleted' })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
