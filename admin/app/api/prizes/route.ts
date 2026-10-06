import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const competitionType = searchParams.get('competitionType')
    const query: any = {}
    if (competitionType && ['Mega', 'Normal'].includes(competitionType)) {
      query.competitionType = competitionType
    }
    const db = await connectDB()
    const prizes = await db.collection('prizes').find(query).toArray()
    return NextResponse.json({ ok: true, prizes: prizes || [] })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const db = await connectDB()
    const id = body.id || `prize-${Date.now()}`
    const prize = { ...body, id }
    await db.collection('prizes').updateOne({ id }, { $set: prize }, { upsert: true })
    return NextResponse.json({ ok: true, prize }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

