import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('bilik:manage')
    const { id } = await params
    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 })
    }
    const existing = await db.bilik.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Bilik tidak dijumpai.' }, { status: 404 })
    const data: any = {}
    if (body.namaBilik) data.namaBilik = sanitizeString(body.namaBilik).toUpperCase()
    if (body.jenis) {
      if (!['KELAS', 'MAKMAL', 'BENGKEL'].includes(body.jenis)) return Response.json({ error: 'Jenis tidak sah.' }, { status: 400 })
      data.jenis = body.jenis
    }
    if (body.kapasiti !== undefined) data.kapasiti = Number(body.kapasiti)
    const updated = await db.bilik.update({ where: { id }, data })
    await auditLog({ session, action: 'UPDATE', entity: 'BILIK', entityId: id, before: existing, after: updated, ipAddress: getClientIp(request) })
    return okResponse({ bilik: updated })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('bilik:manage')
    const { id } = await params
    const existing = await db.bilik.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Bilik tidak dijumpai.' }, { status: 404 })
    await db.bilik.delete({ where: { id } })
    await auditLog({ session, action: 'DELETE', entity: 'BILIK', entityId: id, before: existing, ipAddress: getClientIp(request) })
    return okResponse({ success: true })
  } catch (e) {
    return errorResponse(e)
  }
}
