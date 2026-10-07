import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import type { Coupon, CouponBatch } from '../types'
import { formatCouponDisplay } from './tokenHelper'

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
  batchName?: string
): { coupons: Coupon[]; batch: CouponBatch } {
  const batchId = `BATCH-${Date.now()}`
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

// Cached template image
let cachedTemplateImg: HTMLImageElement | null = null

export async function loadTemplateImage(src = '/coupon-template.jpg'): Promise<HTMLImageElement> {
  if (cachedTemplateImg && cachedTemplateImg.src.includes(src)) {
    return cachedTemplateImg
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      cachedTemplateImg = img
      resolve(img)
    }
    img.onerror = (e) => reject(e)
    img.src = src
  })
}

// Generate QR Code data URL for registration link
export async function createQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
    color: {
      dark: '#111827',
      light: '#ffffff',
    },
  })
}

// Generate Barcode SVG / Canvas Data URL for 10-digit ID
export function createBarcodeDataUrl(couponId: string): string {
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, couponId, {
    format: 'CODE128',
    width: 1.8,
    height: 40,
    displayValue: false, // We will print custom styled text
    margin: 0,
    background: 'transparent',
    lineColor: '#111827',
  })
  return canvas.toDataURL('image/png')
}

// Render single coupon canvas preview (high resolution)
export async function renderCouponToCanvas(
  couponId: string,
  targetCanvas?: HTMLCanvasElement,
  baseUrl = window.location.origin
): Promise<HTMLCanvasElement> {
  const template = await loadTemplateImage()
  const canvas = targetCanvas || document.createElement('canvas')
  canvas.width = template.naturalWidth || 1750
  canvas.height = template.naturalHeight || 700
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  // Draw background template
  ctx.drawImage(template, 0, 0, canvas.width, canvas.height)

  const w = canvas.width
  const h = canvas.height

  // 1. Generate & Draw QR Code inside the left white box
  // Box position coordinates: x: 3.1% to 13.4% (w ~ 10.3%), y: 35.8% to 61.2% (h ~ 25.4%)
  const regUrl = `${baseUrl}/register?coupon=${couponId}`
  const qrDataUrl = await createQrDataUrl(regUrl)
  const qrImg = new Image()
  await new Promise((resolve) => {
    qrImg.onload = resolve
    qrImg.src = qrDataUrl
  })

  // Fit QR neatly inside the rounded white box on the left
  const qrX = w * 0.034
  const qrY = h * 0.365
  const qrSize = Math.min(w * 0.098, h * 0.24)
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)

  // 2. Generate & Draw Barcode directly below the box
  const barcodeDataUrl = createBarcodeDataUrl(couponId)
  const barcodeImg = new Image()
  await new Promise((resolve) => {
    barcodeImg.onload = resolve
    barcodeImg.src = barcodeDataUrl
  })

  const barcodeW = w * 0.124
  const barcodeH = h * 0.075
  const barcodeX = (qrX + qrSize / 2) - (barcodeW / 2)
  const barcodeY = h * 0.625
  ctx.drawImage(barcodeImg, barcodeX, barcodeY, barcodeW, barcodeH)

  // 3. Draw formatted Coupon ID Text below barcode (strictly within barcode width, no overflow)
  ctx.fillStyle = '#111827'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  // Spaced format: "A 1 D 3 S 1 2 3 F 8 9 K 2"
  const formattedId = couponId.split('').join(' ')

  // Dynamically calculate font size so it fits perfectly within barcode width
  let fontSize = Math.round(h * 0.022)
  ctx.font = `bold ${fontSize}px "Courier New", monospace`
  const maxAllowedWidth = barcodeW * 0.96
  while (ctx.measureText(formattedId).width > maxAllowedWidth && fontSize > 7) {
    fontSize -= 0.5
    ctx.font = `bold ${fontSize}px "Courier New", monospace`
  }

  ctx.fillText(formattedId, barcodeX + barcodeW / 2, barcodeY + barcodeH + 3)

  return canvas
}

// Generate multi-coupon PDF with high efficiency and small footprint
export async function generateCouponsPdf(
  coupons: Coupon[],
  options?: {
    baseUrl?: string
    onProgress?: (processed: number, total: number) => void
  }
): Promise<Blob> {
  const baseUrl = options?.baseUrl || window.location.origin
  const total = coupons.length

  // Ticket Dimensions in mm (210mm x 84mm - landscape ticket aspect ratio)
  const ticketWidthMm = 210
  const ticketHeightMm = 84

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [ticketWidthMm, ticketHeightMm],
    compress: true,
  })

  // Pre-load base template image data
  const template = await loadTemplateImage()

  for (let i = 0; i < total; i++) {
    const coupon = coupons[i]
    if (i > 0) {
      pdf.addPage([ticketWidthMm, ticketHeightMm], 'landscape')
    }

    // Render single ticket canvas
    const canvas = await renderCouponToCanvas(coupon.id, undefined, baseUrl)
    const ticketDataUrl = canvas.toDataURL('image/jpeg', 0.88)

    // Add to PDF page
    pdf.addImage(ticketDataUrl, 'JPEG', 0, 0, ticketWidthMm, ticketHeightMm, undefined, 'FAST')

    if (options?.onProgress) {
      options.onProgress(i + 1, total)
    }

    // Yield execution to keep UI responsive on large batches
    if (i % 10 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  return pdf.output('blob')
}

export interface A4QrPdfOptions {
  baseUrl?: string
  layout?: 'left-offset' | 'center'
  xOffsetMm?: number
  qrSizeMm?: number
  showCutGuides?: boolean
  duplicateToFillPage?: boolean
  onProgress?: (processed: number, total: number) => void
}

/**
 * Generates an A4 portrait PDF with 4 QR codes per sheet,
 * each with the coupon ID clearly printed beneath it.
 * Designed for standard A4 white paper and pre-printed ticket sheets.
 */
export async function generateA4QrSheetsPdf(
  inputCoupons: (string | Coupon)[],
  options?: A4QrPdfOptions
): Promise<Blob> {
  const baseUrl = options?.baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://www.valancheryfestival.com')
  const layout = options?.layout || 'left-offset'
  const qrSize = options?.qrSizeMm ?? 22
  const showCutGuides = options?.showCutGuides ?? false

  // Extract coupon IDs
  let couponIds = inputCoupons.map((c) => (typeof c === 'string' ? c : c.id)).filter(Boolean)

  // If duplicateToFillPage is requested (e.g. single coupon view wanting 4 copies on 1 A4 sheet)
  if (options?.duplicateToFillPage && couponIds.length === 1) {
    couponIds = [couponIds[0], couponIds[0], couponIds[0], couponIds[0]]
  }

  if (couponIds.length === 0) {
    throw new Error('No coupons provided for PDF generation')
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  // Standard A4 dimensions in mm
  const pageWidth = 210
  const pageHeight = 297
  const slotHeight = pageHeight / 4 // 74.25mm

  // Determine QR X coordinate
  // User's uploaded sample has QR positioned at X ≈ 36.4mm
  const qrX =
    layout === 'center'
      ? (pageWidth - qrSize) / 2
      : options?.xOffsetMm ?? 36.4

  const total = couponIds.length

  for (let i = 0; i < total; i++) {
    const pageIndex = Math.floor(i / 4)
    const slotIndex = i % 4

    // Add new page when moving to the next group of 4
    if (i > 0 && slotIndex === 0) {
      pdf.addPage('a4', 'portrait')
    }

    const slotTop = slotIndex * slotHeight
    const qrY = slotTop + (slotHeight - qrSize - 7) / 2

    // Cut guide lines between slots if requested
    if (showCutGuides && slotIndex > 0) {
      pdf.setDrawColor(220, 220, 220)
      pdf.setLineDashPattern([2, 3], 0)
      pdf.line(5, slotTop, pageWidth - 5, slotTop)
      pdf.setLineDashPattern([], 0) // reset dash pattern
    }

    const rawId = couponIds[i]
    const cleanId = rawId.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    const regUrl = `${baseUrl.replace(/\/$/, '')}/register?coupon=${cleanId}`

    // High quality QR Code
    const qrDataUrl = await QRCode.toDataURL(regUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })

    pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST')

    // Print Coupon ID below the QR code
    pdf.setFont('courier', 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(15, 23, 42)

    const formattedId = formatCouponDisplay(cleanId)
    const textX = qrX + qrSize / 2
    const textY = qrY + qrSize + 3.8

    pdf.text(formattedId, textX, textY, { align: 'center' })

    if (options?.onProgress) {
      options.onProgress(i + 1, total)
    }

    // Yield control periodically to keep browser UI smooth
    if (i % 8 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  return pdf.output('blob')
}

/**
 * Triggers instant browser download of the A4 QR Sheets PDF
 */
export async function downloadA4QrPdf(
  coupons: (string | Coupon)[],
  filename = 'coupons-a4-qr-sheet.pdf',
  options?: A4QrPdfOptions
): Promise<void> {
  const blob = await generateA4QrSheetsPdf(coupons, options)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

