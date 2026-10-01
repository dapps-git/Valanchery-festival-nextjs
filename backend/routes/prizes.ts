import { Router } from 'express'
import { Prize } from '../models/Prize.js'

const router = Router()

// Get all prizes
router.get('/', async (_req, res) => {
  try {
    const prizes = await Prize.find().lean()
    res.json({ ok: true, prizes })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Create prize
router.post('/', async (req, res) => {
  try {
    const id = `prize-${Date.now()}`
    const prize = await Prize.create({ ...req.body, id })
    res.status(201).json({ ok: true, prize })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Update prize
router.put('/:id', async (req, res) => {
  try {
    const updated = await Prize.findOneAndUpdate({ id: req.params.id }, req.body, { new: true }).lean()
    res.json({ ok: true, prize: updated })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Delete prize
router.delete('/:id', async (req, res) => {
  try {
    await Prize.deleteOne({ id: req.params.id })
    res.json({ ok: true, message: 'Prize deleted' })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
