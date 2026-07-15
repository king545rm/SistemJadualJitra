import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, requireCourseAccess, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('kursus:view')
    const { id } = await params
    const kursus = await db.kursus.findUnique({
      where: { id },
      include: {
        kumpulan: {
          include: { _count: { select: { modul: true } } },
          orderBy: { semesterNo: 'asc' },
        },
        pensyarahKursus: { include: { pensyarah: true } },
      },
    })
    if (!kursus) return Response.json({ error: 'Kursus tidak dijumpai.' }, { status: 404 })
    return okResponse({ kursus })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('kursus:manage')
    const { id } = await params
    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 })
    }
    const existing = await db.kursus.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Kursus tidak dijumpai.' }, { status: 404 })
    const data: any = {}
    if (body.namaKursus) data.namaKursus = sanitizeString(body.namaKursus)
    if (body.kodKursus) {
      const kod = sanitizeString(body.kodKursus).toUpperCase()
      if (kod !== existing.kodKursus) {
        const dup = await db.kursus.findUnique({ where: { kodKursus: kod } })
        if (dup) return Response.json({ error: 'Kod kursus sudah wujud.' }, { status: 409 })
        data.kodKursus = kod
      }
    }
    if (body.deskripsi !== undefined) data.deskripsi = sanitizeString(body.deskripsi)
    const updated = await db.kursus.update({ where: { id }, data })
    await auditLog({ session, action: 'UPDATE', entity: 'KURSUS', entityId: id, before: existing, after: updated, ipAddress: getClientIp(request) })
    return okResponse({ kursus: updated })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('kursus:manage')
    const { id } = await params
    const existing = await db.kursus.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Kursus tidak dijumpai.' }, { status: 404 })
    await db.kursus.delete({ where: { id } })
    await auditLog({ session, action: 'DELETE', entity: 'KURSUS', entityId: id, before: existing, ipAddress: getClientIp(request) })
    return okResponse({ success: true })
  } catch (e) {
    return errorResponse(e)
  }
}
