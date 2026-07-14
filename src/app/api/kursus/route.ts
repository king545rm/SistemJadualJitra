import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function GET() {
  try {
    await requirePermission('kursus:view')
    const kursus = await db.kursus.findMany({
      include: {
        kumpulan: { include: { _count: { select: { modul: true } } } },
        _count: { select: { pensyarahKursus: true } },
      },
      orderBy: { kodKursus: 'asc' },
    })
    return okResponse({ kursus })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('kursus:manage')
    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 })
    }
    const namaKursus = sanitizeString(body.namaKursus)
    const kodKursus = sanitizeString(body.kodKursus).toUpperCase()
    const deskripsi = sanitizeString(body.deskripsi)
    if (!namaKursus || !kodKursus) {
      return Response.json({ error: 'Nama kursus dan kod kursus diperlukan.' }, { status: 400 })
    }
    const existing = await db.kursus.findUnique({ where: { kodKursus } })
    if (existing) {
      return Response.json({ error: 'Kod kursus sudah wujud.' }, { status: 409 })
    }
    const created = await db.kursus.create({ data: { namaKursus, kodKursus, deskripsi, isDummy: false } })
    await auditLog({ session, action: 'CREATE', entity: 'KURSUS', entityId: created.id, after: created, ipAddress: getClientIp(request) })
    return okResponse({ kursus: created }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
