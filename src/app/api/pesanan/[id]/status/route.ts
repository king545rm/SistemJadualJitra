import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

// Update order status: DITERIMA → DIMASAK → SIAP → DIAMBIL (or DIBATALKAN)
const STATUS_FLOW: Record<string, string[]> = {
  DITERIMA: ['DIMASAK', 'DIBATALKAN'],
  DIMASAK: ['SIAP', 'DIBATALKAN'],
  SIAP: ['DIAMBIL'],
  DIAMBIL: [],
  DIBATALKAN: [],
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('pesanan:update_status')
    const { id } = await params
    let body: any
    try { body = await request.json() } catch { body = {} }
    const newStatus = sanitizeString(body.status)
    if (!newStatus || !['DITERIMA', 'DIMASAK', 'SIAP', 'DIAMBIL', 'DIBATALKAN'].includes(newStatus)) {
      return Response.json({ error: 'Status tidak sah.' }, { status: 400 })
    }

    const existing = await db.pesanan.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Pesanan tidak dijumpai.' }, { status: 404 })

    const allowed = STATUS_FLOW[existing.status] || []
    if (!allowed.includes(newStatus)) {
      return Response.json({ error: `Tidak boleh ubah dari ${existing.status} ke ${newStatus}.` }, { status: 400 })
    }

    const data: any = { status: newStatus }
    if (newStatus === 'SIAP') data.waktuSiap = new Date()
    if (newStatus === 'DIAMBIL') data.waktuAmbil = new Date()

    const updated = await db.pesanan.update({ where: { id }, data, include: { items: true } })
    await auditLog({ session, action: 'STATUS_UPDATE', entity: 'PESANAN', entityId: id, before: { status: existing.status }, after: { status: newStatus }, ipAddress: getClientIp(request) })
    return okResponse({ pesanan: updated })
  } catch (e) {
    return errorResponse(e)
  }
}
