import mongoose, { Schema, Document } from 'mongoose'

export interface IPrize extends Document {
  id: string
  name: string
  description?: string
  value?: string
  image?: string
  assignedDrawId?: string
  status: 'Available' | 'Unassigned' | 'Assigned' | 'Awarded'
  competitionType: 'Mega' | 'Normal'
}

const PrizeSchema = new Schema<IPrize>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    value: { type: String, default: '₹0' },
    image: { type: String, default: '' },
    assignedDrawId: { type: String, default: null },
    status: { type: String, enum: ['Available', 'Unassigned', 'Assigned', 'Awarded'], default: 'Available' },
    competitionType: { type: String, enum: ['Mega', 'Normal'], default: 'Normal', required: true },
  },
  {
    timestamps: true,
  }
)

export const Prize = mongoose.model<IPrize>('Prize', PrizeSchema)
