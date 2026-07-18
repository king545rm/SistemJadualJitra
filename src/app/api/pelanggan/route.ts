import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('pelanggan:view')
    const { searchParams } = new URL(request.url)
    const telefon = searchParams.get('telefon')
    let where: any = {}
    if (telefon) where.telefon = { contains: telefon }
    const pelanggan = await db.pelanggan.findMany({
      where,
      include: { _count: { select: { pesanan: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return okResponse({ pelanggan })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('pelanggan:manage')
    let body: any
    try { body = await request.json() } catch { return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 }) }
    const nama = sanitizeString(body.nama)
    const telefon = sanitizeString(body.telefon)
    const catatan = body.catatan ? sanitizeString(body.catatan) : null
    if (!nama || !telefon) return Response.json({ error: 'Nama dan telefon diperlukan.' }, { status: 400 })
    const existing = await db.pelanggan.findUnique({ where: { telefon } })
    if (existing) return Response.json({ error: 'No telefon sudah wujud.' }, { status: 409 })
    const created = await db.pelanggan.create({ data: { nama, telefon, catatan, isDummy: false } })
    await auditLog({ session, action: 'CREATE', entity: 'PELANGGAN', entityId: created.id, after: created, ipAddress: getClientIp(request) })
    return okResponse({ pelanggan: created }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
