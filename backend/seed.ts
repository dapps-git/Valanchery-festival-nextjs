import { Coupon } from './models/Coupon.js'
import { CouponBatch } from './models/CouponBatch.js'
import { Participant } from './models/Participant.js'
import { Prize } from './models/Prize.js'
import { Draw } from './models/Draw.js'
import { Winner } from './models/Winner.js'

export const seedPrizes = [
  {
    id: 'prize-tv',
    name: 'Smart TV',
    description: '55-inch 4K Ultra HD smart television for the festival home.',
    value: '₹42,000',
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80',
    assignedDrawId: 'draw-01',
    status: 'Assigned' as const,
  },

  {
    id: 'prize-voucher',
    name: 'Gift Voucher',
    description: 'Festival shopping voucher valid at all partner stores.',
    value: '₹10,000',
    image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=900&q=80',
    assignedDrawId: 'draw-02',
    status: 'Assigned' as const,
  },
  {
    id: 'prize-laptop',
    name: 'Premium Laptop',
    description: 'High-speed 16GB RAM laptop for work, study and celebration.',
    value: '₹58,000',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80',
    assignedDrawId: 'draw-03',
    status: 'Assigned' as const,
  },
  {
    id: 'prize-phone',
    name: 'Flagship Smartphone',
    description: 'Flagship 5G smartphone — the upcoming grand lucky draw prize.',
    value: '₹35,000',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80',
    assignedDrawId: 'draw-04',
    status: 'Assigned' as const,
  },
  {
    id: 'prize-fridge',
    name: 'Double-Door Refrigerator',
    description: 'Energy-efficient frost-free refrigerator for home.',
    value: '₹32,000',
    image: 'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?auto=format&fit=crop&w=900&q=80',
    assignedDrawId: 'draw-05',
    status: 'Assigned' as const,
  },
  {
    id: 'prize-washer',
    name: 'Washing Machine',
    description: 'Fully automatic inverter front-load washing machine.',
    value: '₹28,000',
    image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=80',
    assignedDrawId: 'draw-06',
    status: 'Assigned' as const,
  },
  {
    id: 'prize-festival',
    name: 'Special Gold Hamper',
    description: 'Grand festive gold coin hamper and celebration voucher.',
    value: '₹75,000',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=900&q=80',
    assignedDrawId: 'draw-10',
    status: 'Assigned' as const,
  },
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
    const prizeCount = await Prize.countDocuments()
    if (prizeCount === 0) {
      await Prize.insertMany(seedPrizes)
      console.log('✅ Seeded default festival prizes')
    }

    const drawCount = await Draw.countDocuments()
    if (drawCount === 0) {
      await Draw.insertMany(seedDraws)
      console.log('✅ Seeded 10 festival draws')
    }
  } catch (error) {
    console.error('Error seeding database:', error)
  }
}
