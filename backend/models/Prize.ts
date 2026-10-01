import mongoose, { Schema, Document } from 'mongoose'

export interface IPrize extends Document {
  id: string
  name: string
  description: string
  value: string
  image: string
  assignedDrawId?: string
  status: 'Unassigned' | 'Assigned' | 'Awarded'
}

const PrizeSchema = new Schema<IPrize>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    value: { type: String, required: true },
    image: { type: String, required: true },
    assignedDrawId: { type: String },
    status: { type: String, enum: ['Unassigned', 'Assigned', 'Awarded'], default: 'Unassigned' },
  },
  {
    timestamps: true,
  }
)

export const Prize = mongoose.model<IPrize>('Prize', PrizeSchema)
