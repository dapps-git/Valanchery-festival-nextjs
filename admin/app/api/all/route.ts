import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const getJwtSecret = () => process.env.JWT_SECRET

export async function GET(request: Request) {
  try {
    let isAdmin = false
    const authHeader = request.headers.get('authorization') || ''
    let token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      const cookieHeader = request.headers.get('cookie') || ''
      const match = cookieHeader.match(/admin_token=([^;]+)/)
      if (match) token = match[1]
    }

    const jwtSecret = getJwtSecret()
    if (token && jwtSecret) {
      try {
        jwt.verify(token, jwtSecret)
        isAdmin = true
      } catch {}
    }

    const db = await connectDB()

    // Run all lightweight queries in parallel — NO full collection scan on coupons
    const [prizes, draws, participants, winners, batches, estimatedTotal, sampleCoupons, usedByBatch] =
      await Promise.all([
        db.collection('prizes').find({}).toArray(),
        db.collection('draws').find({}).sort({ number: 1 }).toArray(),
        isAdmin ? db.collection('participants').find({}).sort({ registeredAt: -1, createdAt: -1 }).toArray() : Promise.resolve([]),
        db.collection('winners').find({}).sort({ date: -1, drawnAt: -1 }).toArray(),
        isAdmin ? db.collection('couponbatches').find({}).sort({ createdAt: -1 }).toArray() : Promise.resolve([]),
        // estimatedDocumentCount is instant — no table scan
        db.collection('coupons').estimatedDocumentCount(),
        // Only fetch first 50 coupons for the dashboard preview
        isAdmin
          ? db
              .collection('coupons')
              .find(
                {},
                {
                  projection: {
                    id: 1,
                    serialNo: 1,
                    prefix: 1,
                    batchId: 1,
                    status: 1,
                    createdAt: 1,
                    usedAt: 1,
                    usedByParticipantName: 1,
                    usedByParticipantPhone: 1,
                    usedByParticipantId: 1,
                  },
                }
              )
              .sort({ _id: -1 })
              .limit(50)
              .toArray()
          : Promise.resolve([]),
        // Aggregate used counts per batch
        db
          .collection('coupons')
          .aggregate([
            { $match: { status: 'Used', batchId: { $exists: true, $ne: '' } } },
            { $group: { _id: '$batchId', count: { $sum: 1 } } },
          ])
          .toArray(),
      ])

    const usedMap = new Map<string, number>()
    if (usedByBatch && Array.isArray(usedByBatch)) {
      for (const item of usedByBatch) {
        if (item._id) usedMap.set(String(item._id), Number(item.count) || 0)
      }
    }

    const calculatedBatches = (batches || []).map((b: any) => {
      const realUsed = usedMap.has(b.id) ? usedMap.get(b.id)! : (b.usedCount || 0)
      const count = b.count || 0
      return {
        ...b,
        usedCount: realUsed,
        unusedCount: Math.max(0, count - realUsed),
      }
    })

    const batchesTotal = (calculatedBatches || []).reduce((sum: number, b: any) => sum + (b.count || 0), 0)
    const totalCouponsCount = batchesTotal > 0 ? batchesTotal : (estimatedTotal || 0)
    // Sum real used coupons belonging to batches (so available coupons = 10 - 3 = 7)
    const totalUsedInBatches = (calculatedBatches || []).reduce((sum: number, b: any) => sum + (b.usedCount || 0), 0)
    const usedCouponsCount = totalUsedInBatches

    return NextResponse.json(
      {
        ok: true,
        prizes: prizes || [],
        draws: draws || [],
        participants: participants || [],
        winners: winners || [],
        batches: calculatedBatches || [],
        totalCouponsCount,
        usedCouponsCount,
        coupons: sampleCoupons || [],
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (err: any) {
    console.error('App Router /api/all error:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

