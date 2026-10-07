import type { Coupon, CouponBatch } from '../types'

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '0123456789'

function getCryptoRandomInt(max: number): number {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const buf = new Uint32Array(1)
    window.crypto.getRandomValues(buf)
    return buf[0] % max
  }
  return Math.floor(Math.random() * max)
}

// Helper to generate 13-character ID with 5 letters and 8 numbers randomly mixed in between using CSPRNG
function generateMixed13Char(): string {
  const chars: string[] = []
  // 5 letters
  for (let i = 0; i < 5; i++) {
    chars.push(LETTERS[getCryptoRandomInt(LETTERS.length)])
  }
  // 8 digits
  for (let i = 0; i < 8; i++) {
    chars.push(DIGITS[getCryptoRandomInt(DIGITS.length)])
  }
  // Fisher-Yates shuffle so letters and numbers are randomly placed in between
  for (let i = chars.length - 1; i > 0; i--) {
    const j = getCryptoRandomInt(i + 1)
    const temp = chars[i]
    chars[i] = chars[j]
    chars[j] = temp
  }
  return chars.join('')
}

// Generate guaranteed unique 13-character coupon ID
export function generateUniqueCouponId(existingIds: Set<string>): string {
  while (true) {
    const id = generateMixed13Char()
    if (!existingIds.has(id)) {
      existingIds.add(id)
      return id
    }
  }
}

export const PREFIXES = ['A', 'B', 'C', 'D'] as const
export type CouponPrefix = (typeof PREFIXES)[number]

// Generate a batch of unique coupons with 4 prefixes (A, B, C, D)
// Each prefix gets 5 digits with leading zeros (A00001..A25000)
export function createCouponBatch(
  count: number,
  existingIds: Set<string> = new Set(),
  batchName?: string,
  batchIdOverride?: string
): { coupons: Coupon[]; batch: CouponBatch } {
  const batchId = batchIdOverride || `BATCH-${Date.now()}`
  const now = new Date().toISOString()
  const total = Math.max(1, count)

  // Distribute equally across 4 prefixes (A, B, C, D)
  const basePerPrefix = Math.floor(total / 4)
  const remainder = total % 4

  const prefixCounts: Record<CouponPrefix, number> = {
    A: basePerPrefix + (remainder >= 1 ? 1 : 0),
    B: basePerPrefix + (remainder >= 2 ? 1 : 0),
    C: basePerPrefix + (remainder >= 3 ? 1 : 0),
    D: basePerPrefix,
  }

  const maxRows = Math.max(...Object.values(prefixCounts))
  const coupons: Coupon[] = []

  // Generate sequentially across prefixes: A1, B1, C1, D1, A2, B2, C2, D2...
  for (let i = 1; i <= maxRows; i++) {
    for (const prefix of PREFIXES) {
      if (i <= prefixCounts[prefix]) {
        const serialNo = `${prefix}${String(i).padStart(5, '0')}`
        const regCode = generateUniqueCouponId(existingIds)

        coupons.push({
          id: regCode,       // Unique 13-character security registration code (e.g. SAR6LFPG6LO3I)
          serialNo,          // Formatted serial number (e.g. A00001, B00001..A25000)
          prefix,            // 'A' | 'B' | 'C' | 'D'
          batchId,
          status: 'Unused',
          createdAt: now,
        })
      }
    }
  }

  const startId = coupons[0]?.serialNo ? `${coupons[0].serialNo} - ${coupons[coupons.length - 1]?.serialNo}` : coupons[0]?.id || ''
  const endId = coupons[coupons.length - 1]?.serialNo || coupons[coupons.length - 1]?.id || ''

  const batch: CouponBatch = {
    id: batchId,
    name: batchName || `Coupons Batch (${coupons.length} pcs)`,
    count: coupons.length,
    startId,
    endId,
    createdAt: now,
    unusedCount: coupons.length,
    usedCount: 0,
  }

  return { coupons, batch }
}
