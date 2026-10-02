import mongoose, { Schema, Document } from 'mongoose'

export interface ICoupon extends Document {
  id: string // 10-digit unique coupon token
  serialNo: string  // formatted serial like 'A00001', 'B00025'
  batchId: string
  status: 'Unused' | 'Used'
  createdAt: string
  usedAt?: string
  usedByParticipantId?: string
  usedByParticipantName?: string
  usedByParticipantPhone?: string
}

const CouponSchema = new Schema<ICoupon>(
  {
    id: { type: String, required: true, unique: true, index: true },
    serialNo: { type: String, index: true },
    batchId: { type: String, required: true, index: true },
    status: { type: String, enum: ['Unused', 'Used'], default: 'Unused', index: true },
    createdAt: { type: String, required: true },
    usedAt: { type: String },
    usedByParticipantId: { type: String },
    usedByParticipantName: { type: String },
    usedByParticipantPhone: { type: String },
  },
  {
    timestamps: true,
  }
)

export const Coupon = mongoose.model<ICoupon>('Coupon', CouponSchema)
