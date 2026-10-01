import mongoose, { Schema, Document } from 'mongoose'

export interface ICouponBatch extends Document {
  id: string
  name: string
  count: number
  startId: string
  endId: string
  createdAt: string
  unusedCount: number
  usedCount: number
}

const CouponBatchSchema = new Schema<ICouponBatch>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    count: { type: Number, required: true },
    startId: { type: String, required: true },
    endId: { type: String, required: true },
    createdAt: { type: String, required: true },
    unusedCount: { type: Number, default: 0 },
    usedCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
)

export const CouponBatch = mongoose.model<ICouponBatch>('CouponBatch', CouponBatchSchema)
