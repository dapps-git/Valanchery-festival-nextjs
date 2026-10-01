export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return phone
  return `${digits.slice(0, 2)}${'*'.repeat(6)}${digits.slice(-2)}`
}

export function isValidIndianPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  const national = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits
  return /^[6-9]\d{9}$/.test(national)
}

export function formatDate(iso?: string): string {
  if (!iso) return ''
  const d = iso.includes('T') ? new Date(iso) : new Date(`${iso}T12:00:00`)
  if (isNaN(d.getTime())) {
    const fallback = new Date(iso)
    return isNaN(fallback.getTime()) ? iso : fallback.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatShortDate(iso?: string): string {
  if (!iso) return ''
  const d = iso.includes('T') ? new Date(iso) : new Date(`${iso}T12:00:00`)
  if (isNaN(d.getTime())) {
    const fallback = new Date(iso)
    return isNaN(fallback.getTime()) ? iso : fallback.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function nextParticipantId(existingIds: string[]): string {
  const nums = existingIds
    .map((id) => Number(id.replace(/\D/g, '').slice(-5)))
    .filter((n) => !Number.isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 100) + 1
  return `VF2026-${String(next).padStart(5, '0')}`
}

export function monthLabel(iso?: string): string {
  if (!iso) return ''
  const d = iso.includes('T') ? new Date(iso) : new Date(`${iso}T12:00:00`)
  if (isNaN(d.getTime())) {
    const fallback = new Date(iso)
    return isNaN(fallback.getTime()) ? iso : fallback.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  }
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export function pad(n: number): string {
  return String(n).padStart(2, '0')
}
