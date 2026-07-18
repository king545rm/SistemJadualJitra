import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('menu:manage')
    const { id } = await params
    let body: any
    try { body = await request.json() } catch { return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 }) }
    const existing = await db.menu.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Menu tidak dijumpai.' }, { status: 404 })
    const data: any = {}
    if (body.nama) data.nama = sanitizeString(body.nama)
    if (body.kategori) data.kategori = sanitizeString(body.kategori)
    if (body.harga !== undefined) data.harga = Number(body.harga)
    if (body.deskripsi !== undefined) data.deskripsi = body.deskripsi ? sanitizeString(body.deskripsi) : null
    if (body.tersedia !== undefined) data.tersedia = Boolean(body.tersedia)
    const updated = await db.menu.update({ where: { id }, data })
    await auditLog({ session, action: 'UPDATE', entity: 'MENU', entityId: id, before: existing, after: updated, ipAddress: getClientIp(request) })
    return okResponse({ menu: updated })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('menu:manage')
    const { id } = await params
    const existing = await db.menu.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Menu tidak dijumpai.' }, { status: 404 })
    // Soft delete: mark as not available
    const updated = await db.menu.update({ where: { id }, data: { tersedia: false } })
    await auditLog({ session, action: 'DELETE', entity: 'MENU', entityId: id, before: existing, after: updated, ipAddress: getClientIp(request) })
    return okResponse({ success: true, menu: updated })
  } catch (e) { return errorResponse(e) }
}
