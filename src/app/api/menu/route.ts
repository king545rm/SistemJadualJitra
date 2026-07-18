import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const kategori = searchParams.get('kategori')
    const tersedia = searchParams.get('tersedia')
    const menu = await db.menu.findMany({
      where: {
        ...(kategori ? { kategori } : {}),
        ...(tersedia !== null && tersedia !== undefined ? { tersedia: tersedia === 'true' } : {}),
      },
      orderBy: [{ kategori: 'asc' }, { nama: 'asc' }],
    })
    return okResponse({ menu })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('menu:manage')
    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 })
    }
    const nama = sanitizeString(body.nama)
    const kod = sanitizeString(body.kod).toUpperCase()
    const kategori = sanitizeString(body.kategori)
    const harga = Number(body.harga)
    const deskripsi = body.deskripsi ? sanitizeString(body.deskripsi) : null
    if (!nama || !kod || !kategori || !harga) {
      return Response.json({ error: 'Nama, kod, kategori dan harga diperlukan.' }, { status: 400 })
    }
    const existing = await db.menu.findUnique({ where: { kod } })
    if (existing) return Response.json({ error: 'Kod menu sudah wujud.' }, { status: 409 })
    const created = await db.menu.create({ data: { nama, kod, kategori, harga, deskripsi, isDummy: false } })
    await auditLog({ session, action: 'CREATE', entity: 'MENU', entityId: created.id, after: created, ipAddress: getClientIp(request) })
    return okResponse({ menu: created }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
