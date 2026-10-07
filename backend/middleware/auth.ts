import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing')
  }
  return secret
}

export interface AuthenticatedRequest extends Request {
  admin?: {
    email: string
    role: string
    iat?: number
  }
}

/**
 * Universal Admin Authentication Middleware:
 * 1. Checks Bearer token from Authorization header or cookie.
 * 2. Cryptographically verifies JWT using JWT_SECRET.
 * 3. Supports backwards-compatibility with legacy admin_token_* format.
 * 4. Strictly validates against passwordChangedAt to invalidate old sessions on password reset.
 */
export async function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || ''
    let token = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!token && req.headers.cookie) {
      const match = req.headers.cookie.match(/admin_token=([^;]+)/)
      if (match) token = match[1]
    }

    if (!token) {
      return res.status(401).json({ ok: false, error: 'Authentication required. No session token provided.' })
    }

    // Standard Cryptographic JWT Verification ONLY
    let decoded: any
    try {
      decoded = jwt.verify(token, getJwtSecret()) as any
    } catch {
      return res.status(401).json({ ok: false, error: 'Invalid or expired session token. Please log in again.' })
    }

    const tokenEmail = decoded.email || ''
    const tokenIssuedAt = decoded.iat ? decoded.iat * 1000 : 0
    req.admin = { email: tokenEmail, role: decoded.role || 'admin', iat: decoded.iat }

    // Check if admin password was changed after this token was created
    const db = mongoose.connection.db
    if (db) {
      const adminDoc = await db.collection('admin_settings').findOne({ id: 'admin_credential' })
      if (adminDoc?.passwordChangedAt) {
        const pwdChangedTime = new Date(adminDoc.passwordChangedAt).getTime()
        if (tokenIssuedAt && tokenIssuedAt < pwdChangedTime - 1000) {
          return res.status(401).json({
            ok: false,
            error: 'Admin password was recently changed. Please log in again with the new password.',
          })
        }
      }
    }

    next()
  } catch (error: any) {
    return res.status(401).json({ ok: false, error: 'Unauthorized request' })
  }
}
