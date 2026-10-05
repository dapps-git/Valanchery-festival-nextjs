import { Router } from 'express'
import { Winner } from '../models/Winner.js'
import { Participant } from '../models/Participant.js'
import { Prize } from '../models/Prize.js'
import { Draw } from '../models/Draw.js'

const router = Router()

// Get all winners (sanitized and populated with masked phone numbers for public display)
router.get('/', async (_req, res) => {
  try {
    const winners = await Winner.find({ status: { $ne: 'Cancelled' } }).sort({ date: -1, createdAt: -1 }).lean()

    const participantIds = winners.map((w: any) => w.participantId).filter(Boolean)
    const prizeIds = winners.map((w: any) => w.prizeId).filter(Boolean)
    const drawIds = winners.map((w: any) => w.drawId).filter(Boolean)

    const [participants, prizes, draws] = await Promise.all([
      Participant.find({ id: { $in: participantIds } }, { id: 1, name: 1, phone: 1, location: 1 }).lean(),
      Prize.find({ id: { $in: prizeIds } }, { id: 1, name: 1, value: 1, image: 1, description: 1 }).lean(),
      Draw.find({ id: { $in: drawIds } }, { id: 1, number: 1, date: 1, competitionType: 1 }).lean(),
    ])

    const partMap = new Map(participants.map((p: any) => [p.id, p]))
    const prizeMap = new Map(prizes.map((p: any) => [p.id, p]))
    const drawMap = new Map(draws.map((d: any) => [d.id, d]))

    const sanitizedWinners = winners.map((w: any) => {
      const p = partMap.get(w.participantId)
      const prize = prizeMap.get(w.prizeId)
      const draw = drawMap.get(w.drawId)

      const maskedPhone = p?.phone ? `******${p.phone.slice(-4)}` : ''

      return {
        id: w.id,
        drawId: w.drawId,
        participantId: w.participantId,
        prizeId: w.prizeId,
        competitionType: w.competitionType,
        date: w.date,
        status: w.status,
        participantName: p?.name || 'Festival Shopper',
        participantPhone: maskedPhone,
        participantLocation: p?.location || 'Valanchery',
        prizeName: prize?.name || 'Festival Prize',
        prizeValue: prize?.value || '',
        prizeImage: prize?.image || '',
        drawNumber: draw?.number || 1,
      }
    })

    res.json({ ok: true, winners: sanitizedWinners })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
