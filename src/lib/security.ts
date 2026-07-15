// Security utilities: rate limiting, input sanitization, XSS prevention

// ---------- In-memory rate limiter (per IP) ----------
interface RateBucket {
  count: number
  resetAt: number
  blockedUntil?: number
}

const rateLimitStore = new Map<string, RateBucket>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of rateLimitStore.entries()) {
    if (bucket.resetAt < now && (!bucket.blockedUntil || bucket.blockedUntil < now)) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000).unref?.()

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  blockDurationMs?: number
}

export function rateLimit(
  key: string,
  config: RateLimitConfig,
): { allowed: boolean; retryAfterMs?: number; remaining: number } {
  const now = Date.now()
  const bucket = rateLimitStore.get(key)

  // Check if blocked
  if (bucket?.blockedUntil && bucket.blockedUntil > now) {
    return { allowed: false, retryAfterMs: bucket.blockedUntil - now, remaining: 0 }
  }

  // Reset window if expired
  if (!bucket || bucket.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1 }
  }

  bucket.count++
  if (bucket.count > config.maxRequests) {
    bucket.blockedUntil = now + (config.blockDurationMs ?? config.windowMs)
    return { allowed: false, retryAfterMs: bucket.blockedUntil - now, remaining: 0 }
  }

  return { allowed: true, remaining: config.maxRequests - bucket.count }
}

// ---------- Input sanitization (XSS prevention) ----------
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value)
    } else if (Array.isArray(value)) {
      result[key] = value.map((v) => (typeof v === 'string' ? sanitizeString(v) : v))
    } else if (value && typeof value === 'object') {
      result[key] = sanitizeObject(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result as T
}

// ---------- Security headers ----------
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
}

// ---------- IP extraction ----------
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}
