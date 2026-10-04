export const ADMIN_EMAIL = (typeof process !== 'undefined' && process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL : '').toLowerCase().trim()

// Preset gift options (empty - gifts are managed dynamically from database)
export const GIFT_PRESETS: Array<{
  name: string
  value: string
  description: string
  image: string
  category: string
}> = []

export const PRIZE_IMAGES: Record<string, string> = {}


export const LOCATIONS = [
  'Valanchery',
  'Malappuram',
  'Tirur',
  'Kuttippuram',
  'Edappal',
  'Ponnani',
  'Kottakkal',
  'Perinthalmanna',
]
