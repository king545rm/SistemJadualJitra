import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'
import { hashPassword, validatePasswordStrength } from '@/lib/auth'
import { ROLES } from '@/lib/rbac'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('user:manage')
    const { id } = await params
    let body: any
    try { body = await request.json() } catch { return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 }) }
    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Pengguna tidak dijumpai.' }, { status: 404 })
    const data: any = {}
    if (body.name) data.name = sanitizeString(body.name)
    if (body.email) {
      const email = sanitizeString(body.email).toLowerCase()
      if (email !== existing.email) {
        const dup = await db.user.findUnique({ where: { email } })
        if (dup) return Response.json({ error: 'Emel sudah wujud.' }, { status: 409 })
        data.email = email
      }
    }
    if (body.role) {
      if (!Object.values(ROLES).includes(body.role)) return Response.json({ error: 'Peranan tidak sah.' }, { status: 400 })
      data.role = body.role
    }
    if (body.resetPassword && typeof body.resetPassword === 'string') {
      const strength = validatePasswordStrength(body.resetPassword)
      if (!strength.valid) return Response.json({ error: strength.message }, { status: 400 })
      data.passwordHash = await hashPassword(body.resetPassword)
      data.failedLoginAttempts = 0
      data.lockedUntil = null
    }
    if (body.unlock === true) { data.failedLoginAttempts = 0; data.lockedUntil = null }
    const updated = await db.user.update({ where: { id }, data })
    await auditLog({ session, action: 'UPDATE', entity: 'USER', entityId: id, before: { ...existing, passwordHash: '[REDACTED]' }, after: { ...updated, passwordHash: '[REDACTED]' }, ipAddress: getClientIp(request) })
    return okResponse({ user: { ...updated, passwordHash: undefined } })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('user:manage')
    const { id } = await params
    if (id === session.id) return Response.json({ error: 'Tidak boleh memadam akaun sendiri.' }, { status: 400 })
    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Pengguna tidak dijumpai.' }, { status: 404 })
    await db.user.delete({ where: { id } })
    await auditLog({ session, action: 'DELETE', entity: 'USER', entityId: id, before: { ...existing, passwordHash: '[REDACTED]' }, ipAddress: getClientIp(request) })
    return okResponse({ success: true })
  } catch (e) { return errorResponse(e) }
}
