import { Router } from 'express'
import { Prize } from '../models/Prize.js'
import { requireAdminAuth } from '../middleware/auth.js'

const router = Router()

// Get all prizes (optionally filtered by competitionType: Mega or Normal)
router.get('/', async (req, res) => {
  try {
    const { competitionType } = req.query
    const query: any = {}
    if (competitionType && ['Mega', 'Normal'].includes(competitionType as string)) {
      query.competitionType = competitionType
    }
    const prizes = await Prize.find(query).lean()
    res.json({ ok: true, prizes })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Create or upsert prize (admin only)
router.post('/', requireAdminAuth, async (req, res) => {
  try {
    const id = req.body.id || `prize-${Date.now()}`
    const status = req.body.status || 'Available'
    const competitionType = req.body.competitionType || 'Normal'
    const image = req.body.image || ''
    const value = req.body.value || '₹0'
    const description = req.body.description || ''
    const name = req.body.name || 'Festival Prize'

    const prize = await Prize.findOneAndUpdate(
      { id },
      {
        $set: {
          id,
          name,
          description,
          value,
          image,
          status,
          competitionType,
          assignedDrawId: req.body.assignedDrawId || null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    res.status(201).json({ ok: true, prize })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Update prize (admin only)
router.put('/:id', requireAdminAuth, async (req, res) => {
  try {
    const patch = { ...req.body }
    const updated = await Prize.findOneAndUpdate({ id: req.params.id }, { $set: patch }, { new: true }).lean()
    res.json({ ok: true, prize: updated })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Delete prize (admin only)
router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    await Prize.deleteOne({ id: req.params.id })
    res.json({ ok: true, message: 'Prize deleted' })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
