import { Request, Response, NextFunction } from 'express'

interface RateLimitOptions {
  windowMs: number
  max: number
  message?: string
}

export function createRateLimiter(options: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetTime: number }>()

  // Cleanup expired entries periodically to prevent memory leaks
  const interval = setInterval(() => {
    const now = Date.now()
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key)
      }
    }
  }, Math.max(options.windowMs, 60000))
  if (interval.unref) interval.unref()

  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown'

    const now = Date.now()
    const record = hits.get(ip)

    if (!record || now > record.resetTime) {
      hits.set(ip, { count: 1, resetTime: now + options.windowMs })
      return next()
    }

    record.count++
    if (record.count > options.max) {
      const retrySec = Math.ceil((record.resetTime - now) / 1000)
      res.setHeader('Retry-After', retrySec)
      return res.status(429).json({
        ok: false,
        error: options.message || `Too many requests. Please try again in ${retrySec} seconds.`,
      })
    }

    next()
  }
}

// 10 attempts per 15 mins for login
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again in 15 minutes.',
})

// 5 requests per 15 mins for OTP
export const otpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many OTP requests. Please wait 15 minutes before requesting again.',
})

// 200 registrations per minute per IP — each person has a unique coupon so this is generous but safe
export const registerLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 200,
  message: 'Registration rate limit exceeded. Please wait a moment and try again.',
})

// 60 coupon validations per minute per IP
export const couponValidateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Coupon validation limit exceeded. Please wait a moment.',
})
