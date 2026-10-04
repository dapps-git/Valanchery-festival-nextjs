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

    const participantsCol = db.collection('participants')
    const participantDoc = await participantsCol.findOne({
      $or: [{ id: participantId }, { couponId: participantId }],
    })
    const actualParticipantId = participantDoc?.id || participantId
    const actualCouponId = participantDoc?.couponId || ''

    // 2. Strict Coupon-ID Based Eligibility Validation
    // - Mega winners CANNOT participate in Normal
    // - Normal winners CAN participate in Mega
    // - No coupon can win twice in Mega (cannot win Mega again)
    // - No coupon can win twice in Normal (cannot win Normal again)
    // Validated strictly by couponId / participantId, NEVER by phone number.
    const checkConditions: any[] = [{ participantId: actualParticipantId }]
    if (actualCouponId) {
      checkConditions.push({ couponId: actualCouponId })
      checkConditions.push({ participantId: actualCouponId })
    }

    const existingWins = await winnersCol.find({
      $or: checkConditions,
      status: 'Confirmed',
    }).toArray()

    const [allPrizes, allDraws] = await Promise.all([
      prizesCol.find({}).toArray(),
      drawsCol.find({}).toArray(),
    ])
    const prizeMap = new Map(allPrizes.map((p: any) => [p.id, p]))
    const drawMap = new Map(allDraws.map((d: any) => [d.id, d]))

    const hasWonMega = existingWins.some((w: any) => {
      const p = prizeMap.get(w.prizeId)
      const d = drawMap.get(w.drawId)
      const cType = w.competitionType || d?.competitionType || p?.competitionType
      return cType === 'Mega'
    })

    const hasWonNormal = existingWins.some((w: any) => {
      const p = prizeMap.get(w.prizeId)
      const d = drawMap.get(w.drawId)
      const cType = w.competitionType || d?.competitionType || p?.competitionType || 'Normal'
      return cType === 'Normal'
    })

    if (competitionType === 'Mega') {
      if (hasWonMega) {
        return NextResponse.json(
          { ok: false, error: 'This coupon has already won Mega Competition and cannot win again in Mega.' },
          { status: 400 }
        )
      }
      // Normal winners are allowed in Mega
    } else if (competitionType === 'Normal') {
      if (hasWonMega) {
        return NextResponse.json(
          { ok: false, error: 'Coupons that won Mega Competition cannot participate in Normal Competition.' },
          { status: 400 }
        )
      }
      if (hasWonNormal) {
        return NextResponse.json(
          { ok: false, error: 'This coupon has already won Normal Competition and cannot win again in Normal.' },
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
      participantId: actualParticipantId,
      couponId: actualCouponId,
      prizeId: awardedPrizeId,
      competitionType,
      date: dateStr,
      drawnAt: now,
      status: 'Confirmed',
    }

    // Insert or upsert winner
    await winnersCol.updateOne(
      { drawId, participantId: actualParticipantId },
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

