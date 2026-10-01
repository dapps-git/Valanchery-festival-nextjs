import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { participantId, drawId, prizeId } = body || {}

    if (!participantId || !drawId) {
      return NextResponse.json(
        { ok: false, error: 'Missing participantId or drawId' },
        { status: 400 }
      )
    }

    const db = await connectDB()
    const winnersCol = db.collection('winners')
    const drawsCol = db.collection('draws')
    const prizesCol = db.collection('prizes')

    const draw = await drawsCol.findOne({ id: drawId })
    if (!draw) {
      return NextResponse.json({ ok: false, error: 'Draw not found' }, { status: 404 })
    }

    const awardedPrizeId = prizeId || draw.prizeId
    const winnerId = `win-${Date.now()}`
    const now = new Date().toISOString()
    const dateStr = now.slice(0, 10)

    const winner = {
      id: winnerId,
      drawId,
      participantId,
      prizeId: awardedPrizeId,
      date: dateStr,
      drawnAt: now,
      status: 'Confirmed',
    }

    // Insert or upsert winner
    await winnersCol.updateOne(
      { drawId, participantId },
      { $set: winner },
      { upsert: true }
    )

    // Update draw status
    await drawsCol.updateOne(
      { id: drawId },
      { $set: { status: 'Completed', prizeId: awardedPrizeId } }
    )

    // Update prize status if prizeId provided
    if (awardedPrizeId) {
      await prizesCol.updateOne(
        { id: awardedPrizeId },
        { $set: { status: 'Awarded', assignedDrawId: drawId } }
      )
    }

    return NextResponse.json({ ok: true, winnerId, winner })
  } catch (err: any) {
    console.error('API confirm-winner error:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

