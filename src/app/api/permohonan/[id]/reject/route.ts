import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('permohonan:approve')
    const { id } = await params
    let body: any
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const catatan = body.catatan ? sanitizeString(body.catatan) : null

    const permohonan = await db.permohonanPertukaran.findUnique({ where: { id } })
    if (!permohonan) return Response.json({ error: 'Permohonan tidak dijumpai.' }, { status: 404 })
    if (permohonan.status !== 'MENUNGGU') return Response.json({ error: 'Permohonan telah diproses.' }, { status: 400 })

    const updated = await db.permohonanPertukaran.update({
      where: { id },
      data: { status: 'DITOLAK', catatanPengurus: catatan, diluluskanOleh: session.name },
    })
    await auditLog({ session, action: 'REJECT', entity: 'PERMOHONAN', entityId: id, after: updated, ipAddress: getClientIp(request) })
    return okResponse({ permohonan: updated })
  } catch (e) {
    return errorResponse(e)
  }
}
