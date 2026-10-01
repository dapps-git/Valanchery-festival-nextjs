import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const batchId = searchParams.get('batchId')
    const rawLimit = Number(searchParams.get('limit')) || 50
    // Allow up to 200,000 for batch download, cap at 100 for directory pagination
    const limit = batchId ? Math.min(200000, rawLimit) : Math.min(100, rawLimit)
    const skip = (page - 1) * limit
    const search = (searchParams.get('search') || '').trim()
    const status = searchParams.get('status') || ''

    const query: any = {}
    if (batchId) {
      query.batchId = batchId
    }
    if (status && status !== 'all') {
      query.status = status
    }
    if (search) {
      const cleanSearch = search.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
      query.$or = [
        { id: { $regex: cleanSearch, $options: 'i' } },
        { serialNo: { $regex: cleanSearch, $options: 'i' } },
        { usedByParticipantName: { $regex: search, $options: 'i' } },
        { usedByParticipantPhone: { $regex: search, $options: 'i' } },
      ]
    }

    const db = await connectDB()
    const couponsCol = db.collection('coupons')
    const batchesCol = db.collection('couponbatches')

    const hasFilter = Boolean(search || batchId || (status && status !== 'all'))
    const sortOrder: any = batchId ? { serialNo: 1, _id: 1 } : { _id: -1 }

    // Use estimatedDocumentCount for total — instant, no scan
    // Use countDocuments only when filtering (much smaller result set)
    const [totalCoupons, filteredCount, coupons, batches] = await Promise.all([
      couponsCol.estimatedDocumentCount(),
      hasFilter ? couponsCol.countDocuments(query) : couponsCol.estimatedDocumentCount(),
      couponsCol
        .find(query, {
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
        })
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .toArray(),
      batchesCol.find({}).sort({ createdAt: -1 }).toArray(),
    ])

    const batchesTotal = (batches || []).reduce((sum: number, b: any) => sum + (b.count || 0), 0)
    const safeTotal = batchesTotal > 0 ? batchesTotal : (totalCoupons || 0)
    const safeFiltered = hasFilter ? (filteredCount || 0) : safeTotal

    return NextResponse.json(
      {
        ok: true,
        totalCoupons: safeTotal,
        filteredCount: safeFiltered,
        page,
        limit,
        totalPages: Math.ceil(safeFiltered / limit),
        coupons,
        batches,
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
    console.error('App Router /api/coupons error:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'
    const batchId = searchParams.get('batchId')

    const db = await connectDB()
    const couponsCol = db.collection('coupons')
    const batchesCol = db.collection('couponbatches')

    const cleanOrphans = searchParams.get('cleanOrphans') === 'true'

    if (cleanOrphans) {
      const activeBatches = await batchesCol.find({}, { projection: { id: 1 } }).toArray()
      const activeIds = activeBatches.map((b: any) => b.id).filter(Boolean)
      const couponsRes = await couponsCol.deleteMany({ batchId: { $nin: activeIds } })
      return NextResponse.json({
        ok: true,
        message: `Purged ${couponsRes.deletedCount} orphan coupons from deleted batches`,
        deletedCoupons: couponsRes.deletedCount,
      })
    }

    if (batchId) {
      const [batchRes, couponsRes] = await Promise.all([
        batchesCol.deleteOne({ id: batchId }),
        couponsCol.deleteMany({ batchId }),
      ])
      return NextResponse.json({
        ok: true,
        message: `Deleted batch ${batchId} and ${couponsRes.deletedCount} coupons`,
        deletedBatches: batchRes.deletedCount,
        deletedCoupons: couponsRes.deletedCount,
      })
    }

    if (all) {
      const [batchRes, couponsRes] = await Promise.all([
        batchesCol.deleteMany({}),
        couponsCol.deleteMany({}),
      ])
      return NextResponse.json({
        ok: true,
        message: 'Deleted all batches and coupons successfully',
        deletedBatches: batchRes.deletedCount,
        deletedCoupons: couponsRes.deletedCount,
      })
    }

    return NextResponse.json({ ok: false, error: 'Specify ?batchId=<id>, ?cleanOrphans=true, or ?all=true' }, { status: 400 })
  } catch (err: any) {
    console.error('DELETE /api/coupons error:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}


