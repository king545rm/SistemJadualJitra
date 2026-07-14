import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, validatePasswordStrength, hashPassword } from '@/lib/auth'
import { setSession, errorResponse, okResponse } from '@/lib/session'
import { rateLimit, sanitizeString, getClientIp, SECURITY_HEADERS } from '@/lib/security'
import { auditLog } from '@/lib/audit'

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rate = rateLimit(`login:${ip}`, { windowMs: 60_000, maxRequests: 10, blockDurationMs: 60_000 })
  if (!rate.allowed) {
    return Response.json(
      { error: `Terlalu banyak percubaan. Cuba lagi dalam ${Math.ceil((rate.retryAfterMs ?? 0) / 1000)} saat.` },
      { status: 429, headers: SECURITY_HEADERS },
    )
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 })
  }

  const email = sanitizeString(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return Response.json({ error: 'Emel dan kata laluan diperlukan.' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    await auditLog({ action: 'LOGIN_FAILED', entity: 'USER', after: { email }, ipAddress: ip })
    return Response.json({ error: 'Emel atau kata laluan tidak sah.' }, { status: 401, headers: SECURITY_HEADERS })
  }

  // Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const secs = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000)
    return Response.json(
      { error: `Akaun dikunci. Cuba lagi dalam ${secs} saat.` },
      { status: 423, headers: SECURITY_HEADERS },
    )
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1
    const lockUntil = attempts >= MAX_LOGIN_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: attempts, lockedUntil: lockUntil },
    })
    await auditLog({ action: 'LOGIN_FAILED', entity: 'USER', entityId: user.id, after: { email, attempts }, ipAddress: ip })
    if (lockUntil) {
      return Response.json(
        { error: 'Akaun dikunci selepas 5 percubaan gagal. Cuba lagi dalam 15 minit.' },
        { status: 423, headers: SECURITY_HEADERS },
      )
    }
    return Response.json(
      { error: `Emel atau kata laluan tidak sah. Percubaan tinggal: ${MAX_LOGIN_ATTEMPTS - attempts}.` },
      { status: 401, headers: SECURITY_HEADERS },
    )
  }

  // Successful login
  await db.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  })

  await setSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    kursusId: user.kursusId,
    pensyarahId: user.pensyarahId,
  })

  await auditLog({
    session: { id: user.id, email: user.email, name: user.name, role: user.role, kursusId: user.kursusId, pensyarahId: user.pensyarahId },
    action: 'LOGIN',
    entity: 'USER',
    entityId: user.id,
    ipAddress: ip,
  })

  return okResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      kursusId: user.kursusId,
      pensyarahId: user.pensyarahId,
    },
  })
}

// Change password (authenticated)
export async function PUT(request: NextRequest) {
  const { requireAuth } = await import('@/lib/session')
  let session
  try {
    session = await requireAuth()
  } catch {
    return errorResponse(new Error('Sesi tamat.'))
  }
  const ip = getClientIp(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 })
  }

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  const user = await db.user.findUnique({ where: { id: session.id } })
  if (!user) return Response.json({ error: 'Pengguna tidak dijumpai.' }, { status: 404 })

  const valid = await verifyPassword(currentPassword, user.passwordHash)
  if (!valid) return Response.json({ error: 'Kata laluan semasa tidak sah.' }, { status: 401 })

  const strength = validatePasswordStrength(newPassword)
  if (!strength.valid) return Response.json({ error: strength.message }, { status: 400 })

  const newHash = await hashPassword(newPassword)
  await db.user.update({ where: { id: user.id }, data: { passwordHash: newHash } })

  await auditLog({ session, action: 'UPDATE', entity: 'USER', entityId: user.id, after: { passwordChanged: true }, ipAddress: ip })

  return okResponse({ success: true })
}
