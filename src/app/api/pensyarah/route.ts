import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, sanitizeObject, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('pensyarah:view')
    const { searchParams } = new URL(request.url)
    const kursusId = searchParams.get('kursusId')
    const pensyarah = await db.pensyarah.findMany({
      where: kursusId ? { pensyarahKursus: { some: { kursusId } } } : undefined,
      include: {
        pensyarahKursus: { include: { kursus: true } },
        pensyarahModul: { include: { modul: { include: { kumpulan: { include: { kursus: true } } } } } },
        _count: { select: { slotJadual: true } },
      },
      orderBy: { nama: 'asc' },
    })
    return okResponse({ pensyarah })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('pensyarah:manage')
    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 })
    }
    const nama = sanitizeString(body.nama)
    const email = sanitizeString(body.email).toLowerCase()
    const telefon = sanitizeString(body.telefon)
    const hadJamMaksimum = Number(body.hadJamMaksimum) || 20
    const kepakaranRaw = Array.isArray(body.kepakaran) ? body.kepakaran : []
    const kursusIds = Array.isArray(body.kursusIds) ? body.kursusIds : []
    if (!nama || !email) {
      return Response.json({ error: 'Nama dan emel diperlukan.' }, { status: 400 })
    }
    const existing = await db.pensyarah.findUnique({ where: { email } })
    if (existing) return Response.json({ error: 'Emel pensyarah sudah wujud.' }, { status: 409 })
    const created = await db.pensyarah.create({
      data: {
        nama,
        email,
        telefon,
        kepakaran: JSON.stringify(kepakaranRaw.map((k: string) => sanitizeString(k))),
        hadJamMaksimum,
        isDummy: false,
        pensyarahKursus: kursusIds.length > 0 ? { create: kursusIds.map((id: string) => ({ kursusId: id })) } : undefined,
      },
      include: { pensyarahKursus: { include: { kursus: true } } },
    })
    await auditLog({ session, action: 'CREATE', entity: 'PENSYARAH', entityId: created.id, after: { ...created, kepakaran: kepakaranRaw }, ipAddress: getClientIp(request) })
    return okResponse({ pensyarah: created }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
