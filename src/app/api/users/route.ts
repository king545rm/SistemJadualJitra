import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'
import { hashPassword, validatePasswordStrength } from '@/lib/auth'
import { ROLES } from '@/lib/rbac'

export async function GET() {
  try {
    await requirePermission('user:manage')
    const users = await db.user.findMany({
      orderBy: { createdAt: 'asc' },
    })
    return okResponse({ users: users.map((u) => ({ ...u, passwordHash: undefined })) })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('user:manage')
    let body: any
    try { body = await request.json() } catch { return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 }) }
    const name = sanitizeString(body.name)
    const email = sanitizeString(body.email).toLowerCase()
    const role = sanitizeString(body.role)
    const password = typeof body.password === 'string' ? body.password : ''
    if (!name || !email || !role || !password) return Response.json({ error: 'Nama, emel, peranan dan kata laluan diperlukan.' }, { status: 400 })
    if (!Object.values(ROLES).includes(role)) return Response.json({ error: 'Peranan tidak sah.' }, { status: 400 })
    const strength = validatePasswordStrength(password)
    if (!strength.valid) return Response.json({ error: strength.message }, { status: 400 })
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) return Response.json({ error: 'Emel sudah wujud.' }, { status: 409 })
    const passwordHash = await hashPassword(password)
    const created = await db.user.create({ data: { name, email, passwordHash, role, isDummy: false } })
    await auditLog({ session, action: 'CREATE', entity: 'USER', entityId: created.id, after: { ...created, passwordHash: '[REDACTED]' }, ipAddress: getClientIp(request) })
    return okResponse({ user: { ...created, passwordHash: undefined } }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
