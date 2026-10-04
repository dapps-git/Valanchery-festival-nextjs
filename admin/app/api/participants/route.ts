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
      const winners = await db.collection('winners').find({ status: 'Confirmed' }).toArray()
      const megaWinnerIds = new Set<string>()
      const normalWinnerIds = new Set<string>()

      for (const w of winners) {
        if (w.competitionType === 'Mega') {
          megaWinnerIds.add(w.participantId)
        } else {
          normalWinnerIds.add(w.participantId)
        }
      }

      let excludeIds: Set<string>
      if (competitionType === 'Mega') {
        // Mega: Exclude only participants who already won Mega
        // (Normal winners remain eligible for Mega)
        excludeIds = megaWinnerIds
      } else {
        // Normal: Exclude anyone who won Mega OR who won Normal
        excludeIds = new Set<string>([...megaWinnerIds, ...normalWinnerIds])
      }

      const query: any = {
        status: 'Active',
        eligibility: { $ne: 'Ineligible' },
      }
      if (excludeIds.size > 0) {
        query.id = { $nin: Array.from(excludeIds) }
      }

      const eligible = await db
        .collection('participants')
        .find(query)
        .sort({ registeredAt: -1, createdAt: -1 })
        .toArray()

      return NextResponse.json({ ok: true, competitionType, count: eligible.length, participants: eligible || [] })
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

