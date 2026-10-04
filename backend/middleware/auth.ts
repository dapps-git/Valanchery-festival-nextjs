import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

const JWT_SECRET = process.env.JWT_SECRET || 'vf2026_token_sign_key'

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

    let tokenEmail = ''
    let tokenIssuedAt = 0

    if (token.startsWith('admin_token_')) {
      // Legacy token format fallback: admin_token_<timestamp>_<hexEmail>
      const parts = token.split('_')
      const timestamp = parseInt(parts[2], 10)
      if (isNaN(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000) {
        return res.status(401).json({ ok: false, error: 'Session expired (24 hours). Please log in again.' })
      }
      tokenIssuedAt = timestamp
      if (parts[3]) {
        try {
          tokenEmail = Buffer.from(parts[3], 'hex').toString('utf8')
        } catch {}
      }
      req.admin = { email: tokenEmail || 'admin@valancheryfestival.com', role: 'admin', iat: Math.floor(timestamp / 1000) }
    } else {
      // Standard Cryptographic JWT
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any
        tokenEmail = decoded.email || ''
        tokenIssuedAt = decoded.iat ? decoded.iat * 1000 : 0
        req.admin = { email: tokenEmail, role: decoded.role || 'admin', iat: decoded.iat }
      } catch (jwtErr: any) {
        return res.status(401).json({ ok: false, error: 'Invalid or expired session token. Please log in again.' })
      }
    }

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
