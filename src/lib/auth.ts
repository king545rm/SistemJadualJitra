import bcrypt from 'bcryptjs'
import { createHmac, randomBytes } from 'crypto'

const SESSION_SECRET = process.env.SESSION_SECRET || 'asts-dev-secret-change-in-production-32chars!'
const SALT_ROUNDS = 12

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
  kursusId?: string | null
  pensyarahId?: string | null
}

export interface SessionData extends SessionUser {
  issuedAt: number
  expiresAt: number
  csrf: string
}

// ---------- Password hashing ----------
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ---------- Password policy (security requirement) ----------
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Kata laluan mesti sekurang-kurangnya 8 aksara.' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Kata laluan mesti mengandungi sekurang-kurangnya satu huruf besar.' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Kata laluan mesti mengandungi sekurang-kurangnya satu huruf kecil.' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Kata laluan mesti mengandungi sekurang-kurangnya satu nombor.' }
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Kata laluan mesti mengandungi sekurang-kurangnya satu aksara khas.' }
  }
  return { valid: true }
}

// ---------- Session token (HMAC-signed, tamper-proof) ----------
const SESSION_COOKIE = 'asts_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 8 // 8 hours

function sign(payload: string): string {
  return createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url')
}

export function createSessionToken(user: SessionUser): string {
  const csrf = randomBytes(16).toString('hex')
  const data: SessionData = {
    ...user,
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    csrf,
  }
  const payload = Buffer.from(JSON.stringify(data), 'utf8').toString('base64url')
  const sig = sign(payload)
  return `${payload}.${sig}`
}

export function verifySessionToken(token: string | undefined | null): SessionData | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  const expectedSig = sign(payload)
  // timing-safe compare
  if (sig.length !== expectedSig.length) return null
  let diff = 0
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i)
  }
  if (diff !== 0) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionData
    if (data.expiresAt < Date.now()) return null
    return data
  } catch {
    return null
  }
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE
}

export function getSessionTtlMs(): number {
  return SESSION_TTL_MS
}

// ---------- CSRF token validation ----------
export function validateCsrf(session: SessionData, token: string | null | undefined): boolean {
  if (!token) return false
  return session.csrf === token
}

export function generateCsrfToken(): string {
  return randomBytes(24).toString('hex')
}
