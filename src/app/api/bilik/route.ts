import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function GET() {
  try {
    await requirePermission('bilik:view')
    const bilik = await db.bilik.findMany({
      include: { _count: { select: { slotJadual: true } } },
      orderBy: { namaBilik: 'asc' },
    })
    return okResponse({ bilik })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('bilik:manage')
    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 })
    }
    const namaBilik = sanitizeString(body.namaBilik).toUpperCase()
    const jenis = sanitizeString(body.jenis)
    const kapasiti = Number(body.kapasiti) || 30
    if (!namaBilik || !jenis) return Response.json({ error: 'Nama dan jenis bilik diperlukan.' }, { status: 400 })
    if (!['KELAS', 'MAKMAL', 'BENGKEL'].includes(jenis)) return Response.json({ error: 'Jenis tidak sah.' }, { status: 400 })
    const existing = await db.bilik.findUnique({ where: { namaBilik } })
    if (existing) return Response.json({ error: 'Nama bilik sudah wujud.' }, { status: 409 })
    const created = await db.bilik.create({ data: { namaBilik, jenis, kapasiti, isDummy: false } })
    await auditLog({ session, action: 'CREATE', entity: 'BILIK', entityId: created.id, after: created, ipAddress: getClientIp(request) })
    return okResponse({ bilik: created }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
