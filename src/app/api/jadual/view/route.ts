import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { HARI_LIST, TIME_SLOTS } from '@/lib/clash-detection'

// F7: Multiple timetable views
// view=master       -> all slots grouped by day
// view=kursus       -> requires kursusId
// view=pensyarah    -> requires pensyarahId
// view=kumpulan     -> requires kumpulanId
export async function GET(request: NextRequest) {
  try {
    await requirePermission('jadual:view')
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'master'
    const kursusId = searchParams.get('kursusId')
    const pensyarahId = searchParams.get('pensyarahId')
    const kumpulanId = searchParams.get('kumpulanId')

    let where: any = {}
    if (view === 'kursus' && kursusId) {
      where = { modul: { kumpulan: { kursusId } } }
    } else if (view === 'pensyarah' && pensyarahId) {
      where = { pensyarahId }
    } else if (view === 'kumpulan' && kumpulanId) {
      where = { modul: { kumpulanId } }
    }

    const slots = await db.slotJadual.findMany({
      where,
      include: {
        modul: { include: { kumpulan: { include: { kursus: true } } } },
        pensyarah: true,
        bilik: true,
      },
      orderBy: [{ hari: 'asc' }, { masaMula: 'asc' }],
    })

    // Build a grid: { [hari]: { [masaMula]: slot } }
    const grid: Record<string, Record<string, any[]>> = {}
    for (const hari of HARI_LIST) {
      grid[hari] = {}
      for (const ts of TIME_SLOTS) {
        grid[hari][ts.mula] = []
      }
    }
    for (const slot of slots) {
      if (!grid[slot.hari]) continue
      // place into matching time slot
      for (const ts of TIME_SLOTS) {
        if (slot.masaMula >= ts.mula && slot.masaMula < ts.tamat) {
          grid[slot.hari][ts.mula].push(slot)
          break
        }
      }
    }

    // For master view, also group by course
    let byKursus: any = null
    if (view === 'master') {
      byKursus = {}
      for (const slot of slots) {
        const kod = slot.modul.kumpulan.kursus.kodKursus
        if (!byKursus[kod]) byKursus[kod] = []
        byKursus[kod].push(slot)
      }
    }

    return okResponse({
      view,
      slots,
      grid,
      byKursus,
      hari: HARI_LIST,
      timeSlots: TIME_SLOTS,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
