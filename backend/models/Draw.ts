import mongoose, { Schema, Document } from 'mongoose'

export interface IDraw extends Document {
  id: string
  number: number
  date: string
  prizeId: string
  winnerCount: number
  status: 'Upcoming' | 'Completed'
  competitionType: 'Mega' | 'Normal'
}

const DrawSchema = new Schema<IDraw>(
  {
    id: { type: String, required: true, unique: true, index: true },
    number: { type: Number, required: true },
    date: { type: String, required: true },
    prizeId: { type: String, required: true },
    winnerCount: { type: Number, default: 1 },
    status: { type: String, enum: ['Upcoming', 'Completed'], default: 'Upcoming' },
    competitionType: { type: String, enum: ['Mega', 'Normal'], required: true },
  },
  {
    timestamps: true,
  }
)

export const Draw = mongoose.model<IDraw>('Draw', DrawSchema)
