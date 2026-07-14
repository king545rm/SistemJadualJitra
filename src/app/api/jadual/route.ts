import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'
import { checkSlotClash, HARI_LIST } from '@/lib/clash-detection'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('jadual:view')
    const { searchParams } = new URL(request.url)
    const pensyarahId = searchParams.get('pensyarahId')
    const modulId = searchParams.get('modulId')
    const bilikId = searchParams.get('bilikId')
    const hari = searchParams.get('hari')

    const slots = await db.slotJadual.findMany({
      where: {
        ...(pensyarahId ? { pensyarahId } : {}),
        ...(modulId ? { modulId } : {}),
        ...(bilikId ? { bilikId } : {}),
        ...(hari ? { hari } : {}),
      },
      include: {
        modul: { include: { kumpulan: { include: { kursus: true } } } },
        pensyarah: true,
        bilik: true,
      },
      orderBy: [{ hari: 'asc' }, { masaMula: 'asc' }],
    })
    return okResponse({ slots })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('jadual:manage')
    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 })
    }
    const modulId = sanitizeString(body.modulId)
    const pensyarahId = sanitizeString(body.pensyarahId)
    const bilikId = body.bilikId ? sanitizeString(body.bilikId) : null
    const hari = sanitizeString(body.hari)
    const masaMula = sanitizeString(body.masaMula)
    const masaTamat = sanitizeString(body.masaTamat)
    const force = body.force === true // allow override even with clash

    if (!modulId || !pensyarahId || !hari || !masaMula || !masaTamat) {
      return Response.json({ error: 'Semua medan diperlukan.' }, { status: 400 })
    }
    if (!HARI_LIST.includes(hari as any)) {
      return Response.json({ error: 'Hari tidak sah.' }, { status: 400 })
    }
    if (masaMula >= masaTamat) {
      return Response.json({ error: 'Masa mula mesti lebih awal dari masa tamat.' }, { status: 400 })
    }

    // Clash detection
    const clash = await checkSlotClash({ pensyarahId, bilikId, modulId, hari, masaMula, masaTamat })
    if (clash.hasClash && !force) {
      return Response.json(
        {
          error: 'Pertindihan dikesan. Sila selesaikan konflik atau aktifkan "paksa jadual".',
          clash,
        },
        { status: 409 },
      )
    }

    const created = await db.slotJadual.create({
      data: { modulId, pensyarahId, bilikId, hari, masaMula, masaTamat, isDummy: false },
      include: { modul: { include: { kumpulan: { include: { kursus: true } } } }, pensyarah: true, bilik: true },
    })
    await auditLog({
      session,
      action: 'CREATE',
      entity: 'SLOT_JADUAL',
      entityId: created.id,
      after: created,
      ipAddress: getClientIp(request),
    })
    if (clash.hasClash) {
      await auditLog({ session, action: 'CLASH_DETECTED', entity: 'SLOT_JADUAL', entityId: created.id, after: clash, ipAddress: getClientIp(request) })
    }
    return okResponse({ slot: created, clash }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
