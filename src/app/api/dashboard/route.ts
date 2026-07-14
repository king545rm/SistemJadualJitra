import { db } from '@/lib/db'
import { requireAuth, okResponse, errorResponse } from '@/lib/session'
import { findAllClashes } from '@/lib/clash-detection'
import { getLoadDistribution } from '@/lib/teaching-load'

export async function GET() {
  try {
    const session = await requireAuth()

    const [kursusCount, kumpulanCount, modulCount, pensyarahCount, bilikCount, slotCount, permohonanCount, clashes, load] =
      await Promise.all([
        db.kursus.count(),
        db.kumpulanSemester.count(),
        db.modul.count(),
        db.pensyarah.count(),
        db.bilik.count(),
        db.slotJadual.count(),
        db.permohonanPertukaran.count({ where: { status: 'MENUNGGU' } }),
        findAllClashes(),
        getLoadDistribution(),
      ])

    // Modules by category
    const terasCount = await db.modul.count({ where: { kategori: 'TERAS' } })
    const umumCount = await db.modul.count({ where: { kategori: 'UMUM' } })

    // Kumpulan by status
    const belajarCount = await db.kumpulanSemester.count({ where: { status: 'BELAJAR' } })
    const latihanCount = await db.kumpulanSemester.count({ where: { status: 'LATIHAN_INDUSTRI' } })

    // Per-course stats
    const kursusList = await db.kursus.findMany({
      include: {
        _count: { select: { kumpulan: true, pensyarahKursus: true } },
      },
      orderBy: { kodKursus: 'asc' },
    })

    return okResponse({
      session,
      stats: {
        kursus: kursusCount,
        kumpulan: kumpulanCount,
        modul: modulCount,
        pensyarah: pensyarahCount,
        bilik: bilikCount,
        slot: slotCount,
        permohonanMenunggu: permohonanCount,
        clashes: clashes.totalClashes,
        modulTeras: terasCount,
        modulUmum: umumCount,
        kumpulanBelajar: belajarCount,
        kumpulanLatihan: latihanCount,
        loadStatus: load.byStatus,
        avgLoad: load.avgLoad,
      },
      kursusList: kursusList.map((k) => ({
        id: k.id,
        namaKursus: k.namaKursus,
        kodKursus: k.kodKursus,
        kumpulanCount: k._count.kumpulan,
        pensyarahCount: k._count.pensyarahKursus,
      })),
    })
  } catch (e) {
    return errorResponse(e)
  }
}
