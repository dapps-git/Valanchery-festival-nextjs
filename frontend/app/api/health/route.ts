import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = await connectDB()
    const couponsCount = await db.collection('coupons').countDocuments()
    return NextResponse.json({
      status: 'online',
      database: 'connected',
      couponsCount,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ status: 'error', error: err.message }, { status: 500 })
  }
}

