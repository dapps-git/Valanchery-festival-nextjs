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

// Calculate the highest serial number across all batches and coupons
export function getMaxSerialNumber(
  batches: Array<{ startId?: string; endId?: string }>,
  coupons?: Array<{ serialNo?: string }>
): number {
  let max = 0
  if (Array.isArray(batches)) {
    for (const b of batches) {
      const text = `${b.startId || ''} ${b.endId || ''}`
      const matches = text.match(/\d+/g) || []
      for (const m of matches) {
        const val = parseInt(m, 10)
        if (val > max) max = val
      }
    }
  }
  if (Array.isArray(coupons)) {
    for (const c of coupons) {
      if (c && c.serialNo) {
        const match = c.serialNo.match(/\d+/)
        if (match) {
          const val = parseInt(match[0], 10)
          if (val > max) max = val
        }
      }
    }
  }
  return max
}

// Generate a batch of unique coupons with 4 prefixes (A, B, C, D)
// Each prefix gets 5 digits with leading zeros (A00001..A25000, A00011..A00020, etc.)
export function createCouponBatch(
  count: number,
  existingIds: Set<string> = new Set(),
  batchName?: string,
  batchIdOverride?: string,
  startSerial: number = 1
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
  const startNum = Math.max(1, startSerial || 1)

  // Generate sequentially across prefixes: A(start), B(start), C(start), D(start)...
  for (let offset = 0; offset < maxRows; offset++) {
    const i = startNum + offset
    for (const prefix of PREFIXES) {
      if (offset < prefixCounts[prefix]) {
        const serialNo = `${prefix}${String(i).padStart(5, '0')}`
        const regCode = generateUniqueCouponId(existingIds)

        coupons.push({
          id: regCode,       // Unique 13-character security registration code (e.g. SAR6LFPG6LO3I)
          serialNo,          // Formatted serial number (e.g. A00011, B00011..A00020)
          prefix,            // 'A' | 'B' | 'C' | 'D'
          batchId,
          batchName: batchName || `Coupons Batch (${total} pcs)`,
          status: 'Unused',
          createdAt: now,
        })
      }
    }
  }

  const firstSerial = coupons[0]?.serialNo || coupons[0]?.id || ''
  const lastSerial = coupons[coupons.length - 1]?.serialNo || coupons[coupons.length - 1]?.id || ''
  const startId = coupons.length > 1 ? `${firstSerial} - ${lastSerial}` : firstSerial
  const endId = lastSerial

  const resolvedBatchName = batchName || `Coupons Batch (${coupons.length} pcs)`
  const batch: CouponBatch = {
    id: batchId,
    name: resolvedBatchName,
    batchName: resolvedBatchName,
    count: coupons.length,
    startId,
    endId,
    createdAt: now,
    usedCount: 0,
    unusedCount: coupons.length,
  }

  return { coupons, batch }
}
