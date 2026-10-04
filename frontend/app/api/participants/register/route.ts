import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, phone, address, location, couponId } = body || {}
    if (!phone) {
      return NextResponse.json({ ok: false, error: 'Phone number is required' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10)
    const cleanCouponId = couponId ? couponId.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : ''
    const db = await connectDB()
    const participantsCol = db.collection<any>('participants')
    const couponsCol = db.collection<any>('coupons')
    const countersCol = db.collection<any>('counters')

    // 1. Check if the exact same participant (same phone + coupon) already registered
    const existingSameUser = await participantsCol.findOne({
      phone: cleanPhone,
      couponId: cleanCouponId,
    })
    if (existingSameUser) {
      return NextResponse.json({ ok: true, id: existingSameUser.id, participant: existingSameUser })
    }

    // 2. Check if this coupon has already been used by someone else
    if (cleanCouponId) {
      if (cleanCouponId.length !== 13) {
        return NextResponse.json(
          { ok: false, error: 'Please enter a valid 13-character coupon code.' },
          { status: 400 }
        )
      }

      const couponAlreadyUsed = await participantsCol.findOne({
        couponId: cleanCouponId,
      })
      if (couponAlreadyUsed) {
        return NextResponse.json(
          { ok: false, error: 'This coupon has already been used and is no longer valid.' },
          { status: 400 }
        )
      }

      // 3. Check if coupon exists and is marked Used in coupons collection
      const existingCouponDoc = await couponsCol.findOne({ id: cleanCouponId })
      if (!existingCouponDoc) {
        return NextResponse.json(
          { ok: false, error: 'Coupon not found. Please check the 13-character code.' },
          { status: 400 }
        )
      }
      if (existingCouponDoc.status === 'Used') {
        return NextResponse.json(
          { ok: false, error: 'This coupon has already been used and is no longer valid.' },
          { status: 400 }
        )
      }
    }

    // Atomic sequential participant ID (eliminates collection scanning and avoids race conditions)
    let counterDoc: any = await countersCol.findOneAndUpdate(
      { _id: 'participant_id' },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    )

    // Calibration if counter was uninitialized or below 100
    if (!counterDoc || counterDoc.seq <= 1) {
      const highestDoc = await participantsCol
        .find({}, { projection: { id: 1 } })
        .sort({ id: -1 })
        .limit(1)
        .toArray()
      let maxNum = 100
      if (highestDoc.length > 0 && highestDoc[0].id) {
        const match = highestDoc[0].id.match(/\d+$/)
        if (match) {
          const parsed = parseInt(match[0], 10)
          if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed
        }
      }
      counterDoc = await countersCol.findOneAndUpdate(
        { _id: 'participant_id' },
        { $set: { seq: maxNum + 1 } },
        { returnDocument: 'after' }
      )
    }

    const seq = counterDoc?.seq || 101
    const participantId = `VF2026-${String(seq).padStart(5, '0')}`
    const now = new Date().toISOString()

    const newParticipant = {
      id: participantId,
      name: name || 'Festival Participant',
      phone: cleanPhone,
      address: address || '',
      location: location || '',
      couponId: cleanCouponId,
      registeredAt: now,
      createdAt: now,
      eligibility: 'Eligible',
      status: 'Active',
    }

    try {
      await participantsCol.insertOne(newParticipant)
    } catch (insertErr: any) {
      if (insertErr?.code === 11000) {
        if (insertErr.keyPattern?.couponId || insertErr.message?.includes('couponId')) {
          return NextResponse.json(
            { ok: false, error: 'This coupon has already been registered.' },
            { status: 400 }
          )
        }
        // Fallback retry with next seq
        const retryDoc: any = await countersCol.findOneAndUpdate(
          { _id: 'participant_id' },
          { $inc: { seq: 1 } },
          { returnDocument: 'after' }
        )
        const retryId = `VF2026-${String(retryDoc?.seq || seq + 1).padStart(5, '0')}`
        newParticipant.id = retryId
        await participantsCol.insertOne(newParticipant)
      } else {
        throw insertErr
      }
    }

    // Mark coupon as used in MongoDB and update batch registered person count
    if (cleanCouponId) {
      const updatedCoupon = await couponsCol.findOneAndUpdate(
        { id: cleanCouponId },
        {
          $set: {
            status: 'Used',
            usedAt: now,
            usedByParticipantId: participantId,
            usedByParticipantName: name || 'Festival Participant',
            usedByParticipantPhone: cleanPhone,
          },
        },
        { returnDocument: 'after' }
      )

      const batchesCol = db.collection('couponbatches')
      if (updatedCoupon && updatedCoupon.batchId) {
        await batchesCol.updateOne(
          { id: updatedCoupon.batchId },
          { $inc: { usedCount: 1, unusedCount: -1 } }
        )
      }
    }

    return NextResponse.json({
      ok: true,
      id: participantId,
      participant: newParticipant,
    })
  } catch (err: any) {
    console.error('App Router /api/participants/register error:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

