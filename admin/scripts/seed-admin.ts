/**
 * Seed Script — Admin Credentials
 * Run with: node --env-file=.env -r tsx/esm scripts/seed-admin.ts
 * OR: npx tsx scripts/seed-admin.ts
 *
 * Seeds the default admin credentials into MongoDB.
 * Once seeded, login works with:
 *   Email:    admin@valancheryfestival.com
 *   Password: Admin@2026
 *
 * After the admin resets their password via OTP,
 * isCustomPassword = true → default password STOPS working.
 */

import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI!
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase().trim()
const DEFAULT_PASSWORD = 'Admin@2026'

async function seed() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env')
    process.exit(1)
  }

  const client = new MongoClient(MONGODB_URI)
  try {
    await client.connect()
    console.log('✅ Connected to MongoDB')

    const db = client.db('FESTIVAL')
    const col = db.collection('admin_settings')

    const existing = await col.findOne({ id: 'admin_credential' })
    if (existing) {
      console.log('⚠️  Admin credential already seeded. Skipping.')
      console.log(`   Email: ${existing.email}`)
      console.log(`   Custom password set: ${existing.isCustomPassword ? 'YES' : 'NO (default active)'}`)
      return
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12)

    await col.insertOne({
      id: 'admin_credential',
      email: ADMIN_EMAIL,
      password: hashedPassword,
      isCustomPassword: false,   // false = default password still valid
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    console.log('✅ Admin credentials seeded!')
    console.log(`   Email:    ${ADMIN_EMAIL}`)
    console.log(`   Password: ${DEFAULT_PASSWORD}  (hashed with bcrypt)`)
    console.log('   Change it via the admin panel → Forgot Password → OTP flow')
  } finally {
    await client.close()
  }
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message)
  process.exit(1)
})
