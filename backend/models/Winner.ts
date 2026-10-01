import mongoose, { Schema, Document } from 'mongoose'

export interface IWinner extends Document {
  id: string
  drawId: string
  participantId: string
  prizeId: string
  date: string
  status: 'Confirmed'
}

const WinnerSchema = new Schema<IWinner>(
  {
    id: { type: String, required: true, unique: true, index: true },
    drawId: { type: String, required: true, index: true },
    participantId: { type: String, required: true, index: true },
    prizeId: { type: String, required: true },
    date: { type: String, required: true },
    status: { type: String, enum: ['Confirmed'], default: 'Confirmed' },
  },
  {
    timestamps: true,
  }
)

export const Winner = mongoose.model<IWinner>('Winner', WinnerSchema)
