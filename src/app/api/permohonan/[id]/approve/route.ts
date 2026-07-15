import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'
import { checkSlotClash } from '@/lib/clash-detection'

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

    const permohonan = await db.permohonanPertukaran.findUnique({
      where: { id },
      include: { slotAsal: true },
    })
    if (!permohonan) return Response.json({ error: 'Permohonan tidak dijumpai.' }, { status: 404 })
    if (permohonan.status !== 'MENUNGGU') return Response.json({ error: 'Permohonan telah diproses.' }, { status: 400 })

    // If the permohonan has a proposed slot, check clash and apply
    if (permohonan.slotCadanganHari && permohonan.slotCadanganMasaMula && permohonan.slotCadanganMasaTamat) {
      const clash = await checkSlotClash({
        pensyarahId: permohonan.pensyarahId,
        modulId: permohonan.slotAsal.modulId,
        hari: permohonan.slotCadanganHari,
        masaMula: permohonan.slotCadanganMasaMula,
        masaTamat: permohonan.slotCadanganMasaTamat,
        excludeSlotId: permohonan.slotAsalId,
      })
      if (clash.hasClash) {
        return Response.json({ error: 'Slot cadangan mempunyai pertindihan. Permohonan tidak boleh diluluskan.', clash }, { status: 409 })
      }
      await db.slotJadual.update({
        where: { id: permohonan.slotAsalId },
        data: {
          hari: permohonan.slotCadanganHari,
          masaMula: permohonan.slotCadanganMasaMula,
          masaTamat: permohonan.slotCadanganMasaTamat,
        },
      })
    }

    const updated = await db.permohonanPertukaran.update({
      where: { id },
      data: { status: 'DILULUSKAN', catatanPengurus: catatan, diluluskanOleh: session.name },
    })
    await auditLog({ session, action: 'APPROVE', entity: 'PERMOHONAN', entityId: id, after: updated, ipAddress: getClientIp(request) })
    return okResponse({ permohonan: updated })
  } catch (e) {
    return errorResponse(e)
  }
}
