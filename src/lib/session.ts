import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import {
  type SessionData,
  type SessionUser,
  createSessionToken,
  getSessionCookieName,
  getSessionTtlMs,
  verifySessionToken,
} from '@/lib/auth'
import { hasPermission, type Permission } from '@/lib/rbac'

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(getSessionCookieName())?.value
  return verifySessionToken(token)
}

export async function getCurrentUser(): Promise<SessionData | null> {
  return getSession()
}

export async function setSession(user: SessionUser): Promise<void> {
  const cookieStore = await cookies()
  const token = createSessionToken(user)
  cookieStore.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(getSessionTtlMs() / 1000),
  })
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(getSessionCookieName())
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession()
  if (!session) {
    throw new UnauthorizedError('Sesi tamat. Sila log masuk semula.')
  }
  return session
}

export async function requirePermission(permission: Permission): Promise<SessionData> {
  const session = await requireAuth()
  if (!hasPermission(session.role, permission)) {
    throw new ForbiddenError('Anda tidak mempunyai kebenaran untuk akses fungsi ini.')
  }
  return session
}

// For KETUA_KURSUS - ensure they only access their own course
export async function requireCourseAccess(kursusId: string): Promise<SessionData> {
  const session = await requireAuth()
  if (session.role === 'TIMBALAN_PENGARAH' || session.role === 'HEA' || session.role === 'IT') {
    return session
  }
  if (session.role === 'KETUA_KURSUS' && session.kursusId === kursusId) {
    return session
  }
  throw new ForbiddenError('Anda hanya boleh mengurus kursus anda sendiri.')
}

export class UnauthorizedError extends Error {
  status = 401
}
export class ForbiddenError extends Error {
  status = 403
}

export function errorResponse(error: unknown): Response {
  if (error instanceof UnauthorizedError) {
    return Response.json({ error: error.message }, { status: 401 })
  }
  if (error instanceof ForbiddenError) {
    return Response.json({ error: error.message }, { status: 403 })
  }
  console.error('API error:', error)
  const message = error instanceof Error ? error.message : 'Ralat pelayan dalaman.'
  return Response.json({ error: message }, { status: 500 })
}

export function okResponse<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init)
}

// Sync user's lastLoginAt + reset failed attempts (called on successful login)
export async function recordSuccessfulLogin(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  })
}
