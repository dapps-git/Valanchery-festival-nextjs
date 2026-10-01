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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { participantId, drawId, prizeId, date } = body || {}
    if (!participantId || !drawId || !prizeId) {
      return NextResponse.json({ ok: false, error: 'Missing required winner fields' }, { status: 400 })
    }

    const db = await connectDB()
    const winnersCol = db.collection('winners')
    const drawsCol = db.collection('draws')

    const winnerId = `WIN-${Date.now()}`
    const now = new Date().toISOString()

    const winner = {
      id: winnerId,
      drawId,
      participantId,
      prizeId,
      date: date || now.slice(0, 10),
      drawnAt: now,
      status: 'Confirmed',
    }

    await winnersCol.updateOne({ drawId, participantId }, { $set: winner }, { upsert: true })
    await drawsCol.updateOne({ id: drawId }, { $set: { status: 'Completed' } })

    return NextResponse.json({ ok: true, winnerId, winner })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

