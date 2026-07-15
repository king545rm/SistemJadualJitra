import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'
import { checkSlotClash, HARI_LIST } from '@/lib/clash-detection'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('jadual:manage')
    const { id } = await params
    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 })
    }
    const existing = await db.slotJadual.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Slot tidak dijumpai.' }, { status: 404 })

    const modulId = body.modulId ? sanitizeString(body.modulId) : existing.modulId
    const pensyarahId = body.pensyarahId ? sanitizeString(body.pensyarahId) : existing.pensyarahId
    const bilikId = body.bilikId !== undefined ? (body.bilikId ? sanitizeString(body.bilikId) : null) : existing.bilikId
    const hari = body.hari ? sanitizeString(body.hari) : existing.hari
    const masaMula = body.masaMula ? sanitizeString(body.masaMula) : existing.masaMula
    const masaTamat = body.masaTamat ? sanitizeString(body.masaTamat) : existing.masaTamat
    const force = body.force === true

    if (!HARI_LIST.includes(hari as any)) return Response.json({ error: 'Hari tidak sah.' }, { status: 400 })
    if (masaMula >= masaTamat) return Response.json({ error: 'Masa tidak sah.' }, { status: 400 })

    const clash = await checkSlotClash({ pensyarahId, bilikId, modulId, hari, masaMula, masaTamat, excludeSlotId: id })
    if (clash.hasClash && !force) {
      return Response.json({ error: 'Pertindihan dikesan.', clash }, { status: 409 })
    }

    const updated = await db.slotJadual.update({
      where: { id },
      data: { modulId, pensyarahId, bilikId, hari, masaMula, masaTamat },
      include: { modul: { include: { kumpulan: { include: { kursus: true } } } }, pensyarah: true, bilik: true },
    })
    await auditLog({ session, action: 'UPDATE', entity: 'SLOT_JADUAL', entityId: id, before: existing, after: updated, ipAddress: getClientIp(request) })
    return okResponse({ slot: updated, clash })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('jadual:manage')
    const { id } = await params
    const existing = await db.slotJadual.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Slot tidak dijumpai.' }, { status: 404 })
    await db.slotJadual.delete({ where: { id } })
    await auditLog({ session, action: 'DELETE', entity: 'SLOT_JADUAL', entityId: id, before: existing, ipAddress: getClientIp(request) })
    return okResponse({ success: true })
  } catch (e) {
    return errorResponse(e)
  }
}
