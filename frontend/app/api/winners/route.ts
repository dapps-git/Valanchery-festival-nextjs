import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = await connectDB()
    const winners = await db
      .collection('winners')
      .find({ status: { $ne: 'Cancelled' } })
      .sort({ date: -1, drawnAt: -1 })
      .toArray()

    const participantIds = winners.map((w: any) => w.participantId).filter(Boolean)
    const prizeIds = winners.map((w: any) => w.prizeId).filter(Boolean)
    const drawIds = winners.map((w: any) => w.drawId).filter(Boolean)

    const [participants, prizes, draws] = await Promise.all([
      db
        .collection('participants')
        .find({ id: { $in: participantIds } }, { projection: { id: 1, name: 1, phone: 1, location: 1 } })
        .toArray(),
      db
        .collection('prizes')
        .find({ id: { $in: prizeIds } }, { projection: { id: 1, name: 1, value: 1, image: 1, description: 1 } })
        .toArray(),
      db
        .collection('draws')
        .find({ id: { $in: drawIds } }, { projection: { id: 1, number: 1, date: 1, competitionType: 1 } })
        .toArray(),
    ])

    const partMap = new Map(participants.map((p: any) => [p.id, p]))
    const prizeMap = new Map(prizes.map((p: any) => [p.id, p]))
    const drawMap = new Map(draws.map((d: any) => [d.id, d]))

    const sanitizedWinners = winners.map((w: any) => {
      const p = partMap.get(w.participantId)
      const prize = prizeMap.get(w.prizeId)
      const draw = drawMap.get(w.drawId)

      // Strictly mask phone number to protect participant PII
      const rawDigits = (p?.phone || '').replace(/\D/g, '')
      const maskedPhone = rawDigits.length >= 4 ? `******${rawDigits.slice(-4)}` : ''

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

    return NextResponse.json({ ok: true, winners: sanitizedWinners })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: 'Failed to retrieve winners' }, { status: 500 })
  }
}



