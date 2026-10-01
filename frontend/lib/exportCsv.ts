import * as XLSX from 'xlsx'
import type { Participant } from '../types'

/**
 * Generates an Excel-friendly CSV string.
 * Uses UTF-8 BOM (\uFEFF) and Excel literal formula format `="PHONE"`
 * to prevent Microsoft Excel from converting 10-digit phone numbers
 * into scientific exponential notation (e.g. 9.88E+09).
 */
export function formatParticipantsForExcelCsv(
  participants: Array<{ name: string; phone: string }>,
): string {
  const header = 'Full Name,Phone Number\r\n'
  const rows = participants.map((p) => {
    const cleanPhone = p.phone.replace(/\D/g, '').slice(-10)
    const escapedName = `"${(p.name || '').replace(/"/g, '""')}"`
    // Excel formula format `="9876543210"` guarantees Excel treats it as literal string without scientific notation (E+09)
    const excelPhone = `="""${cleanPhone}"""`
    return `${escapedName},${excelPhone}`
  })

  return '\uFEFF' + header + rows.join('\r\n')
}

export function exportCouponsToXlsx(
  coupons: Array<{ id: string; serialNo?: string; prefix?: string }>,
  filename: string
): void {
  // Separate coupons into 4 prefix groups: A, B, C, D
  const groupA: Array<{ id: string; serialNo: string }> = []
  const groupB: Array<{ id: string; serialNo: string }> = []
  const groupC: Array<{ id: string; serialNo: string }> = []
  const groupD: Array<{ id: string; serialNo: string }> = []

  const hasExplicitPrefixes = coupons.some(
    (c) => c.prefix || (c.serialNo && /^[A-D]/i.test(c.serialNo))
  )

  if (hasExplicitPrefixes) {
    for (const c of coupons) {
      const p = (c.prefix || (c.serialNo ? c.serialNo[0] : 'A')).toUpperCase()
      const item = { id: c.id, serialNo: c.serialNo || c.id }
      if (p === 'A') groupA.push(item)
      else if (p === 'B') groupB.push(item)
      else if (p === 'C') groupC.push(item)
      else if (p === 'D') groupD.push(item)
      else groupA.push(item)
    }
  } else {
    // Split into 4 equal groups
    const count = coupons.length
    const base = Math.floor(count / 4)
    const rem = count % 4
    const countA = base + (rem >= 1 ? 1 : 0)
    const countB = base + (rem >= 2 ? 1 : 0)
    const countC = base + (rem >= 3 ? 1 : 0)

    let idx = 0
    for (let i = 0; i < countA; i++) {
      const c = coupons[idx++]
      if (c) groupA.push({ id: c.id, serialNo: `A${String(i + 1).padStart(5, '0')}` })
    }
    for (let i = 0; i < countB; i++) {
      const c = coupons[idx++]
      if (c) groupB.push({ id: c.id, serialNo: `B${String(i + 1).padStart(5, '0')}` })
    }
    for (let i = 0; i < countC; i++) {
      const c = coupons[idx++]
      if (c) groupC.push({ id: c.id, serialNo: `C${String(i + 1).padStart(5, '0')}` })
    }
    while (idx < count) {
      const c = coupons[idx++]
      const i = groupD.length
      if (c) groupD.push({ id: c.id, serialNo: `D${String(i + 1).padStart(5, '0')}` })
    }
  }

  // Sort every prefix group in ascending sequential order (1 -> 25000)
  const sortBySerialAsc = (a: { id: string; serialNo: string }, b: { id: string; serialNo: string }) => {
    const numA = parseInt(a.serialNo.replace(/\D/g, ''), 10) || 0
    const numB = parseInt(b.serialNo.replace(/\D/g, ''), 10) || 0
    return numA - numB
  }

  groupA.sort(sortBySerialAsc)
  groupB.sort(sortBySerialAsc)
  groupC.sort(sortBySerialAsc)
  groupD.sort(sortBySerialAsc)

  const maxRows = Math.max(groupA.length, groupB.length, groupC.length, groupD.length)

  // 8 Headers matching exact spreadsheet design: Sl No. 1 | Reg Code 01 | Sl No. 2 ...
  const headers = [
    'Sl No. 1',
    'Reg Code 01',
    'Sl No. 2',
    'Reg Code 02',
    'Sl No. 3',
    'Reg Code 03',
    'Sl No. 4',
    'Reg Code 04',
  ]

  const rows: any[][] = [headers]

  const format5Digit = (prefix: string, item?: { id: string; serialNo: string }, fallbackIdx = 1) => {
    if (!item) return ''
    const match = item.serialNo.match(/\d+/)
    const num = match ? parseInt(match[0], 10) : fallbackIdx
    return `${prefix}${String(num).padStart(5, '0')}`
  }

  for (let i = 0; i < maxRows; i++) {
    const row = [
      format5Digit('A', groupA[i], i + 1),
      groupA[i]?.id || '',
      format5Digit('B', groupB[i], i + 1),
      groupB[i]?.id || '',
      format5Digit('C', groupC[i], i + 1),
      groupC[i]?.id || '',
      format5Digit('D', groupD[i], i + 1),
      groupD[i]?.id || '',
    ]
    rows.push(row)
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, // Sl No. 1
    { wch: 18 }, // Reg Code 01
    { wch: 14 }, // Sl No. 2
    { wch: 18 }, // Reg Code 02
    { wch: 14 }, // Sl No. 3
    { wch: 18 }, // Reg Code 03
    { wch: 14 }, // Sl No. 4
    { wch: 18 }, // Reg Code 04
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Coupons')

  const finalName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  XLSX.writeFile(wb, finalName)
}

export function formatCouponsForExcelCsv(
  coupons: Array<{ id: string; serialNo?: string; prefix?: string }>
): string {
  const header = 'Sl No. 1,Reg Code 01,Sl No. 2,Reg Code 02,Sl No. 3,Reg Code 03,Sl No. 4,Reg Code 04\r\n'
  const groupA: any[] = []
  const groupB: any[] = []
  const groupC: any[] = []
  const groupD: any[] = []

  for (const c of coupons) {
    const p = (c.prefix || (c.serialNo ? c.serialNo[0] : 'A')).toUpperCase()
    if (p === 'A') groupA.push(c)
    else if (p === 'B') groupB.push(c)
    else if (p === 'C') groupC.push(c)
    else groupD.push(c)
  }

  const max = Math.max(groupA.length, groupB.length, groupC.length, groupD.length)
  const rows: string[] = []

  for (let i = 0; i < max; i++) {
    const aSn = groupA[i]?.serialNo || `A${String(i + 1).padStart(5, '0')}`
    const aId = groupA[i]?.id || ''
    const bSn = groupB[i]?.serialNo || `B${String(i + 1).padStart(5, '0')}`
    const bId = groupB[i]?.id || ''
    const cSn = groupC[i]?.serialNo || `C${String(i + 1).padStart(5, '0')}`
    const cId = groupC[i]?.id || ''
    const dSn = groupD[i]?.serialNo || `D${String(i + 1).padStart(5, '0')}`
    const dId = groupD[i]?.id || ''
    rows.push(`${aSn},${aId},${bSn},${bId},${cSn},${cId},${dSn},${dId}`)
  }

  return '\uFEFF' + header + rows.join('\r\n')
}

/**
 * Triggers a file download in the browser.
 */
export function downloadCsvFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.setAttribute('download', filename)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Parses uploaded CSV text into structured participant records.
 */
export function parseCsvText(
  text: string,
): Array<{ name: string; phone: string; address: string; location: string }> {
  // Normalize newlines and remove BOM
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = clean.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length <= 1) return []

  // Skip header
  const dataLines = lines.slice(1)
  const results: Array<{ name: string; phone: string; address: string; location: string }> = []

  for (const line of dataLines) {
    const cols = parseCsvLine(line)
    if (cols.length >= 2) {
      const name = cleanCell(cols[0])
      const phone = cleanCell(cols[1]).replace(/\D/g, '').slice(-10)
      const address = cols[2] ? cleanCell(cols[2]) : 'Valanchery'
      const location = cols[3] ? cleanCell(cols[3]) : 'Valanchery'

      if (name && phone.length >= 10) {
        results.push({ name, phone, address, location })
      }
    }
  }

  return results
}

function cleanCell(val: string): string {
  if (!val) return ''
  let res = val.trim()
  // Strip excel formula syntax like `="9876543210"` or `"""9876543210"""`
  if (res.startsWith('="') && res.endsWith('"')) {
    res = res.slice(2, -1)
  }
  if (res.startsWith('"') && res.endsWith('"')) {
    res = res.slice(1, -1)
  }
  return res.replace(/""/g, '"').trim()
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}
