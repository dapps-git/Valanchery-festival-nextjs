import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = await connectDB()
    const draws = await db.collection('draws').find({}).sort({ number: 1 }).toArray()
    return NextResponse.json({ ok: true, draws: draws || [] })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const db = await connectDB()
    const id = body.id || `draw-${Date.now()}`
    const draw = { ...body, id }
    await db.collection('draws').insertOne(draw)
    return NextResponse.json({ ok: true, draw }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

