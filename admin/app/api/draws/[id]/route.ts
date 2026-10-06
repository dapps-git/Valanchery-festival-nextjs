import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await context.params
    const id = params.id
    const body = await request.json()
    const db = await connectDB()

    const updateResult = await db.collection('draws').findOneAndUpdate(
      { id },
      { $set: body },
      { returnDocument: 'after' }
    )

    if (!updateResult) {
      return NextResponse.json({ ok: false, error: 'Draw not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, draw: updateResult })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await context.params
    const id = params.id
    const db = await connectDB()

    const drawsCol = db.collection('draws')
    const prizesCol = db.collection('prizes')
    const winnersCol = db.collection('winners')

    const draw = await drawsCol.findOne({ id })
    if (draw) {
      if (draw.prizeId) {
        await prizesCol.updateOne(
          { id: draw.prizeId },
          { $set: { status: 'Available' }, $unset: { assignedDrawId: 1 } }
        ).catch(() => {})
      }
      await winnersCol.deleteMany({ drawId: draw.id }).catch(() => {})
      await drawsCol.deleteOne({ id })
    }

    return NextResponse.json({ ok: true, message: 'Draw deleted' })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
