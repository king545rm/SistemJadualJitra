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
    const existing = await db.modul.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Modul tidak dijumpai.' }, { status: 404 })
    const data: any = {}
    if (body.namaModul) data.namaModul = sanitizeString(body.namaModul)
    if (body.kodModul) data.kodModul = sanitizeString(body.kodModul).toUpperCase()
    if (body.kategori) {
      if (!['TERAS', 'UMUM'].includes(body.kategori)) return Response.json({ error: 'Kategori tidak sah.' }, { status: 400 })
      data.kategori = body.kategori
    }
    if (body.jamKredit !== undefined) data.jamKredit = Number(body.jamKredit)
    if (body.jamKontakMingguan !== undefined) data.jamKontakMingguan = Number(body.jamKontakMingguan)
    const updated = await db.modul.update({ where: { id }, data })
    await auditLog({ session, action: 'UPDATE', entity: 'MODUL', entityId: id, before: existing, after: updated, ipAddress: getClientIp(request) })
    return okResponse({ modul: updated })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('modul:manage')
    const { id } = await params
    const existing = await db.modul.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Modul tidak dijumpai.' }, { status: 404 })
    await db.modul.delete({ where: { id } })
    await auditLog({ session, action: 'DELETE', entity: 'MODUL', entityId: id, before: existing, ipAddress: getClientIp(request) })
    return okResponse({ success: true })
  } catch (e) {
    return errorResponse(e)
  }
}
