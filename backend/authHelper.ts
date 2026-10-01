import bcrypt from 'bcryptjs'

// Default fallback admin credentials
export const DEFAULT_ADMIN_EMAIL = 'admin@valancheryfestival.com'
export const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('Admin@2026', 10)

/**
 * Securely hashes a plain text password with salt
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(plainText, salt)
}

/**
 * Securely compares a plain text password with a stored bcrypt hash
 */
export async function verifyPassword(plainText: string, storedHashOrPlain: string): Promise<boolean> {
  if (!plainText || !storedHashOrPlain) return false

  // If already a bcrypt hash ($2a$, $2b$, $2y$)
  if (storedHashOrPlain.startsWith('$2a$') || storedHashOrPlain.startsWith('$2b$') || storedHashOrPlain.startsWith('$2y$')) {
    return bcrypt.compare(plainText, storedHashOrPlain)
  }

  // Fallback for legacy plain text: compare then re-hash
  return plainText === storedHashOrPlain
}
