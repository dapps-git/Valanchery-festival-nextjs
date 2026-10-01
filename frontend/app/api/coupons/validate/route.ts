import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id') || searchParams.get('couponId') || ''
    if (!id) {
      return NextResponse.json({ valid: false, status: 'Invalid', message: 'Coupon ID required' }, { status: 400 })
    }

    const clean = id.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    const db = await connectDB()

    // 1. Check participants
    const p = await db.collection('participants').findOne({ couponId: clean })
    if (p) {
      return NextResponse.json({
        valid: false,
        status: 'Used',
        coupon: { id: clean, status: 'Used', usedByParticipantName: p.name },
        message: 'This coupon has already been used and is no longer valid.',
      })
    }

    const coupon = await db.collection('coupons').findOne({
      $or: [{ id: clean }, { serialNo: clean }],
    })
    if (coupon && coupon.status === 'Used') {
      return NextResponse.json({
        valid: false,
        status: 'Used',
        coupon,
        message: 'This coupon has already been used and is no longer valid.',
      })
    }

    return NextResponse.json({
      valid: true,
      status: 'Unused',
      coupon: coupon || { id: clean, status: 'Unused' },
      message: 'Valid Festival Coupon! Ready for registration.',
    })
  } catch (err: any) {
    return NextResponse.json({ valid: false, status: 'Invalid', message: err.message }, { status: 500 })
  }
}

