import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('code') || searchParams.get('id') || searchParams.get('couponId') || ''
    if (!id) {
      return NextResponse.json({ valid: false, status: 'Invalid', message: 'Coupon ID required' }, { status: 400 })
    }

    const clean = id.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    if (!clean || clean.length !== 13) {
      return NextResponse.json({ valid: false, status: 'Invalid', message: 'Please enter a valid 13-character coupon code.' }, { status: 400 })
    }

    const db = await connectDB()

    // 1. Check participants
    const p = await db.collection('participants').findOne({ couponId: clean }, { projection: { id: 1 } })
    if (p) {
      return NextResponse.json({
        valid: false,
        status: 'Used',
        coupon: { id: clean, status: 'Used' },
        message: 'This coupon has already been used and is no longer valid.',
      })
    }

    // 2. Search coupon by 13-character code (id) ONLY
    const coupon = await db.collection('coupons').findOne({ id: clean }, { projection: { id: 1, status: 1 } })
    if (!coupon) {
      return NextResponse.json({
        valid: false,
        status: 'Invalid',
        message: 'Coupon not found. Please check the 13-character code and try again.',
      })
    }

    if (coupon.status === 'Used') {
      return NextResponse.json({
        valid: false,
        status: 'Used',
        coupon: { id: clean, status: 'Used' },
        message: 'This coupon has already been used and is no longer valid.',
      })
    }

    return NextResponse.json({
      valid: true,
      status: 'Unused',
      coupon: { id: clean, status: 'Unused' },
      message: 'Valid Festival Coupon! Ready for registration.',
    })
  } catch (err: any) {
    return NextResponse.json({ valid: false, status: 'Invalid', message: err.message }, { status: 500 })
  }
}

