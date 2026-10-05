import { Router } from 'express'
import { Draw } from '../models/Draw.js'
import { Winner } from '../models/Winner.js'
import { Prize } from '../models/Prize.js'
import { Participant } from '../models/Participant.js'
import { requireAdminAuth } from '../middleware/auth.js'

const router = Router()

// Get all draws
router.get('/', async (_req, res) => {
  try {
    const draws = await Draw.find().sort({ number: 1 }).lean()
    res.json({ ok: true, draws })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Create draw (admin only)
router.post('/', requireAdminAuth, async (req, res) => {
  try {
    const { competitionType, ...rest } = req.body
    if (!competitionType || !['Mega', 'Normal'].includes(competitionType)) {
      return res.status(400).json({ ok: false, error: 'Invalid or missing competitionType' })
    }
    const id = `draw-${Date.now()}`
    const draw = await Draw.create({ ...rest, competitionType, id })
    res.status(201).json({ ok: true, draw })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Update draw (admin only)
router.put('/:id', requireAdminAuth, async (req, res) => {
  try {
    const updated = await Draw.findOneAndUpdate({ id: req.params.id }, req.body, { new: true }).lean()
    res.json({ ok: true, draw: updated })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Delete draw (admin only, and revert assigned prize)
router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    const draw = await Draw.findOne({ id: req.params.id })
    if (draw) {
      if (draw.prizeId) {
        await Prize.updateOne(
          { id: draw.prizeId },
          { $set: { status: 'Available' }, $unset: { assignedDrawId: 1 } }
        ).catch(() => {})
      }
      await Winner.deleteMany({ drawId: draw.id }).catch(() => {})
      await Draw.deleteOne({ id: req.params.id })
    }
    res.json({ ok: true, message: 'Draw deleted' })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Confirm lucky draw winner (admin only - atomic winner recording & status updates)
router.post('/confirm-winner', requireAdminAuth, async (req, res) => {
  try {
    const { participantId, drawId, prizeId, competitionType } = req.body

    if (!participantId || !prizeId || !competitionType) {
      return res.status(400).json({ ok: false, error: 'Missing participantId, prizeId, or competitionType' })
    }

    if (!['Mega', 'Normal'].includes(competitionType)) {
      return res.status(400).json({ ok: false, error: 'Invalid competitionType. Must be Mega or Normal.' })
    }

    // 1. Verify prize exists, matches competitionType, and is not already awarded
    const prize = await Prize.findOne({ id: prizeId })
    if (!prize) {
      return res.status(404).json({ ok: false, error: 'Selected prize not found' })
    }
    if (prize.competitionType && prize.competitionType !== competitionType) {
      return res.status(400).json({ ok: false, error: `This gift is designated for ${prize.competitionType} Competition, not ${competitionType}.` })
    }

    // 2. BACKEND ELIGIBILITY VALIDATION - Exact Matrix Rule from Database
    // Validated strictly by couponId / entrant ID, NEVER by phone number.
    const participantDoc = await Participant.findOne({ id: participantId })
    const actualCoupon = (participantDoc?.couponId || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()

    const checkConditions: any[] = [{ participantId }]
    if (actualCoupon) {
      checkConditions.push({ couponId: actualCoupon })
      checkConditions.push({ participantCouponId: actualCoupon })
    }

    const existingWins = await Winner.find({
      $or: checkConditions,
      status: 'Confirmed',
    }).lean()

    const hasWonMega = existingWins.some((w: any) => w.competitionType === 'Mega')
    const hasWonNormal = existingWins.some((w: any) => w.competitionType === 'Normal')

    if (competitionType === 'Mega') {
      // MEGA WINNER cannot win Mega again with the SAME coupon
      if (hasWonMega) {
        return res.status(400).json({ ok: false, error: 'This coupon has already won Mega Competition and cannot win again in Mega.' })
      }
      // Participant coupon that has won Normal IS ELIGIBLE for Mega (hasWonNormal is OK)
    } else if (competitionType === 'Normal') {
      // MEGA WINNER cannot participate in Normal
      if (hasWonMega) {
        return res.status(400).json({ ok: false, error: 'This coupon has already won Mega Competition and cannot participate in Normal Competition.' })
      }
      // NORMAL WINNER cannot win Normal again with the same coupon
      if (hasWonNormal) {
        return res.status(400).json({ ok: false, error: 'This coupon has already won Normal Competition and cannot win again in Normal.' })
      }
    }

    const awardedPrizeId = prizeId
    const winnerId = `win-${Date.now()}`
    const now = new Date().toISOString().slice(0, 10)

    let draw = await Draw.findOne({ id: drawId })
    if (!draw) {
      const count = await Draw.countDocuments()
      draw = await Draw.create({
        id: drawId || `draw-${Date.now()}`,
        number: count + 1,
        date: now,
        prizeId: awardedPrizeId,
        competitionType,
        winnerCount: 1,
        status: 'Completed',
      })
    }

    const winner = await Winner.create({
      id: winnerId,
      drawId: draw.id,
      participantId,
      prizeId: awardedPrizeId,
      competitionType,
      date: now,
      status: 'Confirmed',
    })

    // Update draw status
    draw.status = 'Completed'
    draw.prizeId = awardedPrizeId
    draw.competitionType = competitionType
    await draw.save()

    // Update prize status
    await Prize.updateOne({ id: awardedPrizeId }, { status: 'Awarded', assignedDrawId: draw.id })

    res.json({ ok: true, winnerId, winner })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
