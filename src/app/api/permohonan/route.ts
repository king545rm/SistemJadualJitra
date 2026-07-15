import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('permohonan:view')
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const permohonan = await db.permohonanPertukaran.findMany({
      where: status ? { status } : undefined,
      include: {
        pensyarah: true,
        slotAsal: { include: { modul: { include: { kumpulan: { include: { kursus: true } } } }, bilik: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return okResponse({ permohonan })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('permohonan:create')
    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 })
    }
    const pensyarahId = sanitizeString(body.pensyarahId)
    const slotAsalId = sanitizeString(body.slotAsalId)
    const slotCadanganHari = body.slotCadanganHari ? sanitizeString(body.slotCadanganHari) : null
    const slotCadanganMasaMula = body.slotCadanganMasaMula ? sanitizeString(body.slotCadanganMasaMula) : null
    const slotCadanganMasaTamat = body.slotCadanganMasaTamat ? sanitizeString(body.slotCadanganMasaTamat) : null
    const alasan = sanitizeString(body.alasan)
    const sumber = body.sumber === 'JOTFORM' ? 'JOTFORM' : 'MANUAL'

    if (!pensyarahId || !slotAsalId || !alasan) {
      return Response.json({ error: 'Pensyarah, slot asal dan alasan diperlukan.' }, { status: 400 })
    }
    const created = await db.permohonanPertukaran.create({
      data: {
        pensyarahId,
        slotAsalId,
        slotCadanganHari,
        slotCadanganMasaMula,
        slotCadanganMasaTamat,
        alasan,
        status: 'MENUNGGU',
        sumber,
      },
    })
    await auditLog({ session, action: 'CREATE', entity: 'PERMOHONAN', entityId: created.id, after: created, ipAddress: getClientIp(request) })
    return okResponse({ permohonan: created }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
