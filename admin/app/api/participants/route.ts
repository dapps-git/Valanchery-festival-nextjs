import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = await connectDB()
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

