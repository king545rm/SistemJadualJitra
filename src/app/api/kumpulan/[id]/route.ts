import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('modul:manage')
    const { id } = await params
    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 })
    }
    const existing = await db.kumpulanSemester.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Kumpulan tidak dijumpai.' }, { status: 404 })
    const data: any = {}
    if (body.bilPelajar !== undefined) data.bilPelajar = Number(body.bilPelajar)
    if (body.status) data.status = sanitizeString(body.status)
    if (body.kohortNama) data.kohortNama = sanitizeString(body.kohortNama)
    const updated = await db.kumpulanSemester.update({ where: { id }, data })
    await auditLog({ session, action: 'UPDATE', entity: 'KUMPULAN', entityId: id, before: existing, after: updated, ipAddress: getClientIp(request) })
    return okResponse({ kumpulan: updated })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('modul:manage')
    const { id } = await params
    const existing = await db.kumpulanSemester.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Kumpulan tidak dijumpai.' }, { status: 404 })
    await db.kumpulanSemester.delete({ where: { id } })
    await auditLog({ session, action: 'DELETE', entity: 'KUMPULAN', entityId: id, before: existing, ipAddress: getClientIp(request) })
    return okResponse({ success: true })
  } catch (e) {
    return errorResponse(e)
  }
}
