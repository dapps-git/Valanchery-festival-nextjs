import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await context.params
    const id = params.id
    const body = await request.json()
    const db = await connectDB()

    const updateResult = await db.collection('participants').findOneAndUpdate(
      { id },
      { $set: body },
      { returnDocument: 'after' }
    )

    if (!updateResult) {
      return NextResponse.json({ ok: false, error: 'Participant not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, participant: updateResult })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await context.params
    const id = params.id
    const db = await connectDB()

    const participantsCol = db.collection('participants')
    const couponsCol = db.collection('coupons')
    const batchesCol = db.collection('couponbatches')

    // Find participant to restore their coupon
    const participant = await participantsCol.findOne({ id })
    if (participant && participant.couponId) {
      const cleanCouponId = String(participant.couponId).toUpperCase()
      const updatedCoupon = await couponsCol.findOneAndUpdate(
        { id: cleanCouponId },
        {
          $set: { status: 'Unused' },
          $unset: {
            usedAt: 1,
            usedByParticipantId: 1,
            usedByParticipantName: 1,
            usedByParticipantPhone: 1,
          },
        },
        { returnDocument: 'after' }
      )

      if (updatedCoupon && updatedCoupon.batchId) {
        await batchesCol.updateOne(
          { id: updatedCoupon.batchId },
          { $inc: { usedCount: -1, unusedCount: 1 } }
        ).catch(() => {})
      }
    }

    await participantsCol.deleteOne({ id })
    return NextResponse.json({ ok: true, message: 'Participant deleted and coupon restored' })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
