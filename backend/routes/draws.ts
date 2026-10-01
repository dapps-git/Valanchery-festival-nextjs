import { Router } from 'express'
import { Draw } from '../models/Draw.js'
import { Winner } from '../models/Winner.js'
import { Prize } from '../models/Prize.js'

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

// Create draw
router.post('/', async (req, res) => {
  try {
    const id = `draw-${Date.now()}`
    const draw = await Draw.create({ ...req.body, id })
    res.status(201).json({ ok: true, draw })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Update draw
router.put('/:id', async (req, res) => {
  try {
    const updated = await Draw.findOneAndUpdate({ id: req.params.id }, req.body, { new: true }).lean()
    res.json({ ok: true, draw: updated })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Confirm lucky draw winner (atomic winner recording & status updates)
router.post('/confirm-winner', async (req, res) => {
  try {
    const { participantId, drawId, prizeId } = req.body

    const draw = await Draw.findOne({ id: drawId })
    if (!draw) return res.status(404).json({ ok: false, error: 'Draw not found' })

    const awardedPrizeId = prizeId || draw.prizeId
    const winnerId = `win-${Date.now()}`
    const now = new Date().toISOString().slice(0, 10)

    const winner = await Winner.create({
      id: winnerId,
      drawId,
      participantId,
      prizeId: awardedPrizeId,
      date: now,
      status: 'Confirmed',
    })

    // Update draw status
    draw.status = 'Completed'
    draw.prizeId = awardedPrizeId
    await draw.save()

    // Update prize status
    await Prize.updateOne({ id: awardedPrizeId }, { status: 'Awarded', assignedDrawId: drawId })

    res.json({ ok: true, winnerId, winner })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
