import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()
    const db = await connectDB()

    const updateResult = await db.collection('prizes').findOneAndUpdate(
      { id },
      { $set: body },
      { returnDocument: 'after' }
    )

    if (!updateResult) {
      return NextResponse.json({ ok: false, error: 'Prize not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, prize: updateResult })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const db = await connectDB()

    await db.collection('prizes').deleteOne({ id })
    return NextResponse.json({ ok: true, message: 'Prize deleted' })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
