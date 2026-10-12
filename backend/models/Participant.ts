import mongoose, { Schema, Document } from 'mongoose'

export interface IParticipant extends Document {
  id: string // e.g. VF2026-00101
  name: string
  phone: string
  address: string
  location?: string
  couponId?: string
  registeredAt: string
  eligibility: 'Eligible' | 'Ineligible'
  status: 'Active' | 'Suspended'
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, default: '' },
    location: { type: String, default: '' },
    couponId: { type: String, unique: true, sparse: true, index: true },
    registeredAt: { type: String, required: true },
    eligibility: { type: String, enum: ['Eligible', 'Ineligible'], default: 'Eligible', index: true },
    status: { type: String, enum: ['Active', 'Suspended'], default: 'Active', index: true },
  },
  {
    timestamps: true,
    autoIndex: false,
  }
)

export const Participant = mongoose.model<IParticipant>('Participant', ParticipantSchema)
