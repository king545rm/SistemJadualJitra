import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('kursus:view')
    const { searchParams } = new URL(request.url)
    const kursusId = searchParams.get('kursusId')
    const kumpulan = await db.kumpulanSemester.findMany({
      where: kursusId ? { kursusId } : undefined,
      include: {
        kursus: true,
        _count: { select: { modul: true } },
      },
      orderBy: [{ kursus: { kodKursus: 'asc' } }, { semesterNo: 'asc' }],
    })
    return okResponse({ kumpulan })
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
    const kursusId = sanitizeString(body.kursusId)
    const semesterNo = Number(body.semesterNo)
    const bilPelajar = Number(body.bilPelajar) || 30
    const status = sanitizeString(body.status) || 'BELAJAR'
    const kohortNama = sanitizeString(body.kohortNama)
    if (!kursusId || !semesterNo || !kohortNama) {
      return Response.json({ error: 'Kursus, semester dan kohort diperlukan.' }, { status: 400 })
    }
    if (semesterNo < 1 || semesterNo > 4) {
      return Response.json({ error: 'Semester mesti antara 1-4.' }, { status: 400 })
    }
    const created = await db.kumpulanSemester.create({
      data: { kursusId, semesterNo, bilPelajar, status, kohortNama, isDummy: false },
    })
    await auditLog({ session, action: 'CREATE', entity: 'KUMPULAN', entityId: created.id, after: created, ipAddress: getClientIp(request) })
    return okResponse({ kumpulan: created }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
