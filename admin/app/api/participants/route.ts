import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const eligibleOnly = searchParams.get('eligible') === 'true'
    const competitionType = searchParams.get('competitionType') || 'Normal'

    const db = await connectDB()

    if (eligibleOnly) {
      const [winners, prizes, draws] = await Promise.all([
        db.collection('winners').find({ status: 'Confirmed' }).toArray(),
        db.collection('prizes').find({}).toArray(),
        db.collection('draws').find({}).toArray(),
      ])

      const prizeMap = new Map(prizes.map((p: any) => [p.id, p]))
      const drawMap = new Map(draws.map((d: any) => [d.id, d]))

      const megaWinnerParticipantIds = new Set<string>()
      const megaWinnerCouponIds = new Set<string>()

      const normalWinnerParticipantIds = new Set<string>()
      const normalWinnerCouponIds = new Set<string>()

      for (const w of winners) {
        const prize = prizeMap.get(w.prizeId)
        const draw = drawMap.get(w.drawId)
        const compType: string =
          w.competitionType ||
          draw?.competitionType ||
          prize?.competitionType ||
          'Normal'

        if (compType === 'Mega') {
          if (w.participantId) megaWinnerParticipantIds.add(w.participantId)
          if (w.couponId) megaWinnerCouponIds.add(w.couponId)
        } else {
          if (w.participantId) normalWinnerParticipantIds.add(w.participantId)
          if (w.couponId) normalWinnerCouponIds.add(w.couponId)
        }
      }

      // Map participant IDs to coupon codes
      const allWinnerParticipantIds = Array.from(
        new Set([...megaWinnerParticipantIds, ...normalWinnerParticipantIds])
      )
      if (allWinnerParticipantIds.length > 0) {
        const winnerDocs = await db
          .collection('participants')
          .find({ id: { $in: allWinnerParticipantIds } })
          .toArray()

        for (const wp of winnerDocs) {
          if (wp.couponId) {
            if (megaWinnerParticipantIds.has(wp.id)) megaWinnerCouponIds.add(wp.couponId)
            if (normalWinnerParticipantIds.has(wp.id)) normalWinnerCouponIds.add(wp.couponId)
          }
        }
      }

      // RULES:
      // 1. Mega Draw:
      //    - Mega winners CANNOT participate again in Mega (cannot win twice in Mega)
      //    - Normal winners CAN participate in Mega
      // 2. Normal Draw:
      //    - Mega winners CANNOT participate in Normal
      //    - Normal winners CANNOT participate again in Normal (cannot win twice in Normal)
      // Validate STRICTLY by couponId / participantId, NEVER by phone number.
      let excludePartIds: Set<string>
      let excludeCoupons: Set<string>

      if (competitionType === 'Mega') {
        excludePartIds = megaWinnerParticipantIds
        excludeCoupons = megaWinnerCouponIds
      } else {
        excludePartIds = new Set([...megaWinnerParticipantIds, ...normalWinnerParticipantIds])
        excludeCoupons = new Set([...megaWinnerCouponIds, ...normalWinnerCouponIds])
      }

      const query: any = {
        status: 'Active',
        eligibility: { $ne: 'Ineligible' },
      }

      const andClauses: any[] = []
      if (excludePartIds.size > 0) {
        andClauses.push({ id: { $nin: Array.from(excludePartIds) } })
      }
      if (excludeCoupons.size > 0) {
        andClauses.push({ couponId: { $nin: Array.from(excludeCoupons) } })
      }
      if (andClauses.length > 0) {
        query.$and = andClauses
      }

      const eligible = await db
        .collection('participants')
        .find(query)
        .sort({ registeredAt: -1, createdAt: -1 })
        .toArray()

      return NextResponse.json({
        ok: true,
        competitionType,
        count: eligible.length,
        participants: eligible || [],
      })
    }

    const participants = await db
      .collection('participants')
      .find({})
      .sort({ registeredAt: -1, createdAt: -1 })
      .toArray()
    return NextResponse.json({ ok: true, participants: participants || [] })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

