import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { participantId, drawId, prizeId, competitionType } = body || {}

    if (!participantId || !drawId || !prizeId || !competitionType) {
      return NextResponse.json(
        { ok: false, error: 'Missing participantId, drawId, prizeId, or competitionType' },
        { status: 400 }
      )
    }

    if (!['Mega', 'Normal'].includes(competitionType)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid competitionType. Must be Mega or Normal.' },
        { status: 400 }
      )
    }

    const db = await connectDB()
    const winnersCol = db.collection('winners')
    const drawsCol = db.collection('draws')
    const prizesCol = db.collection('prizes')

    // 1. Verify Prize matches competitionType
    const prize = await prizesCol.findOne({ id: prizeId })
    if (!prize) {
      return NextResponse.json({ ok: false, error: 'Selected prize not found' }, { status: 404 })
    }
    if (prize.competitionType && prize.competitionType !== competitionType) {
      return NextResponse.json(
        { ok: false, error: `This gift is for ${prize.competitionType} Competition, not ${competitionType}.` },
        { status: 400 }
      )
    }

    // 2. Exact Eligibility Validation from Database (DO NOT TRUST FRONTEND)
    // - If participant won Mega: Mega = ❌, Normal = ❌
    // - If participant won Normal: Normal = ❌, Mega = ✅
    // - If participant never won: Mega = ✅, Normal = ✅
    const existingWins = await winnersCol.find({ participantId, status: 'Confirmed' }).toArray()
    const hasWonMega = existingWins.some((w: any) => w.competitionType === 'Mega')
    const hasWonNormal = existingWins.some((w: any) => w.competitionType === 'Normal')

    if (competitionType === 'Mega') {
      if (hasWonMega) {
        return NextResponse.json(
          { ok: false, error: 'Participant has already won Mega Competition and cannot win again in Mega.' },
          { status: 400 }
        )
      }
      // Normal winners are permitted in Mega
    } else if (competitionType === 'Normal') {
      if (hasWonMega) {
        return NextResponse.json(
          { ok: false, error: 'Participant has already won Mega Competition and cannot participate in Normal Competition.' },
          { status: 400 }
        )
      }
      if (hasWonNormal) {
        return NextResponse.json(
          { ok: false, error: 'Participant has already won Normal Competition and cannot participate again in Normal.' },
          { status: 400 }
        )
      }
    }

    const awardedPrizeId = prizeId
    const winnerId = `win-${Date.now()}`
    const now = new Date().toISOString()
    const dateStr = now.slice(0, 10)

    let draw = await drawsCol.findOne({ id: drawId })
    if (!draw) {
      const totalDraws = await drawsCol.countDocuments()
      const newDraw = {
        id: drawId || `draw-${Date.now()}`,
        number: totalDraws + 1,
        date: dateStr,
        prizeId: awardedPrizeId,
        competitionType,
        winnerCount: 1,
        status: 'Completed',
        createdAt: now,
      }
      await drawsCol.insertOne(newDraw)
      draw = newDraw as any
    }

    const winner = {
      id: winnerId,
      drawId,
      participantId,
      prizeId: awardedPrizeId,
      competitionType,
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
      { $set: { status: 'Completed', prizeId: awardedPrizeId, competitionType } }
    )

    // Update prize status
    await prizesCol.updateOne(
      { id: awardedPrizeId },
      { $set: { status: 'Awarded', assignedDrawId: drawId } }
    )

    return NextResponse.json({ ok: true, winnerId, winner })
  } catch (err: any) {
    console.error('API confirm-winner error:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

