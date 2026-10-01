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
    const participantsCol = db.collection('participants')
    const couponsCol = db.collection('coupons')

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
      const couponAlreadyUsed = await participantsCol.findOne({
        couponId: cleanCouponId,
      })
      if (couponAlreadyUsed) {
        return NextResponse.json(
          { ok: false, error: 'This coupon has already been used and is no longer valid.' },
          { status: 400 }
        )
      }

      // 3. Check if coupon is marked Used in coupons collection
      const existingCouponDoc = await couponsCol.findOne({
        $or: [{ id: cleanCouponId }, { serialNo: cleanCouponId }],
      })
      if (existingCouponDoc && existingCouponDoc.status === 'Used') {
        return NextResponse.json(
          { ok: false, error: 'This coupon has already been used and is no longer valid.' },
          { status: 400 }
        )
      }
    }

    // Guaranteed unique incremental participant ID (calculates highest existing suffix)
    const existingParticipants = await participantsCol
      .find({}, { projection: { id: 1 } })
      .toArray()

    let maxNum = 0
    for (const p of existingParticipants) {
      if (p.id) {
        const match = p.id.match(/\d+$/)
        if (match) {
          const num = parseInt(match[0], 10)
          if (!isNaN(num) && num > maxNum) maxNum = num
        }
      }
    }

    const now = new Date().toISOString()
    let newParticipant: any = null
    let participantId = ''

    for (let attempt = 0; attempt < 10; attempt++) {
      participantId = `VF2026-${String(maxNum + attempt + 1).padStart(5, '0')}`
      newParticipant = {
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
        break
      } catch (err: any) {
        if (err?.code === 11000 && attempt < 9) {
          continue // retry with next suffix
        }
        throw err
      }
    }

    // Mark coupon as used in MongoDB and update batch registered person count
    if (cleanCouponId) {
      const updatedCoupon = await couponsCol.findOneAndUpdate(
        { $or: [{ id: cleanCouponId }, { serialNo: cleanCouponId }] },
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

