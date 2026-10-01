import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60


export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { batch, coupons } = body || {}
    if (!coupons || !Array.isArray(coupons) || coupons.length === 0) {
      return NextResponse.json({ ok: false, error: 'Coupons array is required' }, { status: 400 })
    }

    const db = await connectDB()
    const couponsCol = db.collection('coupons')
    const batchesCol = db.collection('couponbatches')

    try {
      await couponsCol.insertMany(coupons, { ordered: false })
    } catch (insertErr: any) {
      if (!insertErr.writeErrors && !insertErr.insertedDocs) {
        throw insertErr
      }
    }

    if (batch && batch.id) {
      await batchesCol.updateOne(
        { id: batch.id },
        {
          $set: {
            id: batch.id,
            name: batch.name || `Batch ${batch.id}`,
            count: batch.count || coupons.length,
            startId: batch.startId || coupons[0]?.id || '',
            endId: batch.endId || coupons[coupons.length - 1]?.id || '',
            createdAt: batch.createdAt || new Date().toISOString(),
            unusedCount: batch.unusedCount ?? batch.count ?? coupons.length,
            usedCount: batch.usedCount ?? 0,
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      )
    }

    return NextResponse.json({
      ok: true,
      insertedCount: coupons.length,
      batchId: batch?.id,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

