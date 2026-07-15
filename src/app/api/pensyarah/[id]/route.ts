import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('pensyarah:view')
    const { id } = await params
    const pensyarah = await db.pensyarah.findUnique({
      where: { id },
      include: {
        pensyarahKursus: { include: { kursus: true } },
        pensyarahModul: { include: { modul: { include: { kumpulan: { include: { kursus: true } } } } } },
        slotJadual: { include: { modul: { include: { kumpulan: { include: { kursus: true } } } }, bilik: true } },
      },
    })
    if (!pensyarah) return Response.json({ error: 'Pensyarah tidak dijumpai.' }, { status: 404 })
    return okResponse({ pensyarah })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('pensyarah:manage')
    const { id } = await params
    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 })
    }
    const existing = await db.pensyarah.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Pensyarah tidak dijumpai.' }, { status: 404 })
    const data: any = {}
    if (body.nama) data.nama = sanitizeString(body.nama)
    if (body.email) {
      const email = sanitizeString(body.email).toLowerCase()
      if (email !== existing.email) {
        const dup = await db.pensyarah.findUnique({ where: { email } })
        if (dup) return Response.json({ error: 'Emel sudah wujud.' }, { status: 409 })
        data.email = email
      }
    }
    if (body.telefon !== undefined) data.telefon = sanitizeString(body.telefon)
    if (body.hadJamMaksimum !== undefined) data.hadJamMaksimum = Number(body.hadJamMaksimum)
    if (Array.isArray(body.kepakaran)) data.kepakaran = JSON.stringify(body.kepakaran.map((k: string) => sanitizeString(k)))

    // Update kursus links if provided
    if (Array.isArray(body.kursusIds)) {
      await db.pensyarahKursus.deleteMany({ where: { pensyarahId: id } })
      if (body.kursusIds.length > 0) {
        await db.pensyarahKursus.createMany({ data: body.kursusIds.map((kid: string) => ({ pensyarahId: id, kursusId: kid })) })
      }
    }

    const updated = await db.pensyarah.update({ where: { id }, data })
    await auditLog({ session, action: 'UPDATE', entity: 'PENSYARAH', entityId: id, before: existing, after: updated, ipAddress: getClientIp(request) })
    return okResponse({ pensyarah: updated })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('pensyarah:manage')
    const { id } = await params
    const existing = await db.pensyarah.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Pensyarah tidak dijumpai.' }, { status: 404 })
    await db.pensyarah.delete({ where: { id } })
    await auditLog({ session, action: 'DELETE', entity: 'PENSYARAH', entityId: id, before: existing, ipAddress: getClientIp(request) })
    return okResponse({ success: true })
  } catch (e) {
    return errorResponse(e)
  }
}
