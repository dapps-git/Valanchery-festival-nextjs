import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { Coupon } from './models/Coupon.js'
import { CouponBatch } from './models/CouponBatch.js'
import { Participant } from './models/Participant.js'
import { Prize } from './models/Prize.js'
import { Draw } from './models/Draw.js'
import { Winner } from './models/Winner.js'

export const seedPrizes = [
  // Mega Competition: 1 Car (Grand Bumper Prize)
  {
    id: 'mega-car-01',
    name: 'Brand New Car (Maruti Suzuki Swift)',
    description: 'Mega Grand Bumper Prize — Maruti Suzuki Swift',
    value: '₹8,50,000',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=900&q=80',
    assignedDrawId: null,
    status: 'Available' as const,
    competitionType: 'Mega' as const,
  },

  // Normal Competition: 10 Motorbikes
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `normal-bike-${String(i + 1).padStart(2, '0')}`,
    name: `Brand New Motorbike #${i + 1}`,
    description: `Normal Competition Prize — Brand New Motorbike #${i + 1}`,
    value: '₹85,000',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=900&q=80',
    assignedDrawId: null,
    status: 'Available' as const,
    competitionType: 'Normal' as const,
  })),

  // Normal Competition: 10 Gold Coins
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `normal-gold-${String(i + 1).padStart(2, '0')}`,
    name: `Pure Gold Coin #${i + 1}`,
    description: `Normal Competition Prize — 916 Pure Gold Coin #${i + 1}`,
    value: '₹7,500',
    image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=900&q=80',
    assignedDrawId: null,
    status: 'Available' as const,
    competitionType: 'Normal' as const,
  })),
]

export const seedDraws = [
  { id: 'draw-01', number: 1, date: '2026-08-15', prizeId: 'prize-tv', winnerCount: 1, status: 'Upcoming' as const },
  { id: 'draw-02', number: 2, date: '2026-08-30', prizeId: 'prize-voucher', winnerCount: 1, status: 'Upcoming' as const },
  { id: 'draw-03', number: 3, date: '2026-09-15', prizeId: 'prize-laptop', winnerCount: 1, status: 'Upcoming' as const },
  { id: 'draw-04', number: 4, date: '2026-09-30', prizeId: 'prize-phone', winnerCount: 1, status: 'Upcoming' as const },
  { id: 'draw-05', number: 5, date: '2026-10-15', prizeId: 'prize-fridge', winnerCount: 1, status: 'Upcoming' as const },
  { id: 'draw-06', number: 6, date: '2026-10-30', prizeId: 'prize-washer', winnerCount: 1, status: 'Upcoming' as const },
  { id: 'draw-07', number: 7, date: '2026-11-15', prizeId: 'prize-laptop', winnerCount: 1, status: 'Upcoming' as const },
  { id: 'draw-08', number: 8, date: '2026-11-30', prizeId: 'prize-tv', winnerCount: 1, status: 'Upcoming' as const },
  { id: 'draw-09', number: 9, date: '2026-12-15', prizeId: 'prize-phone', winnerCount: 1, status: 'Upcoming' as const },
  { id: 'draw-10', number: 10, date: '2026-12-30', prizeId: 'prize-festival', winnerCount: 1, status: 'Upcoming' as const },
]

export const seedParticipants: any[] = []

export const seedWinners: any[] = []

export async function seedDatabase() {
  try {
    // Seed official festival prizes if empty (1 Car, 10 Bikes, 10 Gold Coins)
    const prizeCount = await Prize.countDocuments()
    if (prizeCount === 0) {
      await Prize.insertMany(seedPrizes)
      console.log('✅ Initialized 21 official festival prizes: 1 Car, 10 Bikes, 10 Gold Coins')
    }

    // Seed admin credentials into MongoDB if not present
    const db = mongoose.connection.db
    if (db) {
      const col = db.collection('admin_settings')
      const existing = await col.findOne({ id: 'admin_credential' })
      if (!existing) {
        const defaultEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim()
        const hashedPassword = await bcrypt.hash('Festival@2027', 12)
        await col.insertOne({
          id: 'admin_credential',
          email: defaultEmail,
          password: hashedPassword,
          isCustomPassword: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        console.log('✅ Admin credentials securely seeded into MongoDB (hashed with bcrypt)')
      }
    }
  } catch (error) {
    console.error('Error seeding database:', error)
  }
}
