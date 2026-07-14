import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('modul:view')
    const { searchParams } = new URL(request.url)
    const kumpulanId = searchParams.get('kumpulanId')
    const kategori = searchParams.get('kategori')
    const modul = await db.modul.findMany({
      where: {
        ...(kumpulanId ? { kumpulanId } : {}),
        ...(kategori ? { kategori } : {}),
      },
      include: {
        kumpulan: { include: { kursus: true } },
        pensyarahModul: { include: { pensyarah: true } },
        _count: { select: { slotJadual: true } },
      },
      orderBy: { kodModul: 'asc' },
    })
    return okResponse({ modul })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('modul:manage')
    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 })
    }
    const kumpulanId = sanitizeString(body.kumpulanId)
    const namaModul = sanitizeString(body.namaModul)
    const kodModul = sanitizeString(body.kodModul).toUpperCase()
    const kategori = sanitizeString(body.kategori)
    const jamKredit = Number(body.jamKredit) || 3
    const jamKontakMingguan = Number(body.jamKontakMingguan) || 4
    if (!kumpulanId || !namaModul || !kodModul || !kategori) {
      return Response.json({ error: 'Semua medan diperlukan.' }, { status: 400 })
    }
    if (!['TERAS', 'UMUM'].includes(kategori)) {
      return Response.json({ error: 'Kategori mesti TERAS atau UMUM.' }, { status: 400 })
    }
    const created = await db.modul.create({
      data: { kumpulanId, namaModul, kodModul, kategori, jamKredit, jamKontakMingguan, isDummy: false },
    })
    await auditLog({ session, action: 'CREATE', entity: 'MODUL', entityId: created.id, after: created, ipAddress: getClientIp(request) })
    return okResponse({ modul: created }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
