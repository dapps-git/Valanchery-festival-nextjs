import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = await connectDB()
    const winners = await db.collection('winners').find({}).sort({ date: -1, drawnAt: -1 }).toArray()
    return NextResponse.json({ ok: true, winners: winners || [] })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}



