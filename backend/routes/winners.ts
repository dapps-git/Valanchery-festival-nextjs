import { Router } from 'express'
import { Winner } from '../models/Winner.js'

const router = Router()

// Get all winners
router.get('/', async (_req, res) => {
  try {
    const winners = await Winner.find().sort({ createdAt: -1 }).lean()
    res.json({ ok: true, winners })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
