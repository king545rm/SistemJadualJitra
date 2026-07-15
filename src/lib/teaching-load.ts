import { db } from '@/lib/db'

export interface LecturerLoad {
  pensyarahId: string
  pensyarahNama: string
  email: string
  hadJamMaksimum: number
  totalJamMingguan: number
  bakiJam: number
  peratusBeban: number
  status: 'SELAMAT' | 'HAMPIR_HAD' | 'MELEBIHI'
  kursusDiajar: string[]
  bilangSlot: number
}

export async function calculateLecturerLoad(pensyarahId?: string): Promise<LecturerLoad[]> {
  const lecturers = await db.pensyarah.findMany({
    where: pensyarahId ? { id: pensyarahId } : undefined,
    include: {
      slotJadual: {
        include: { modul: { include: { kumpulan: { include: { kursus: true } } } } },
      },
      pensyarahKursus: { include: { kursus: true } },
    },
    orderBy: { nama: 'asc' },
  })

  return lecturers.map((l) => {
    const totalMinutes = l.slotJadual.reduce((sum, s) => {
      const [sh, sm] = s.masaMula.split(':').map(Number)
      const [eh, em] = s.masaTamat.split(':').map(Number)
      return sum + (eh * 60 + em - sh * 60 - sm)
    }, 0)
    const totalJamMingguan = Math.round((totalMinutes / 60) * 10) / 10
    const peratusBeban = l.hadJamMaksimum > 0 ? (totalJamMingguan / l.hadJamMaksimum) * 100 : 0
    let status: 'SELAMAT' | 'HAMPIR_HAD' | 'MELEBIHI' = 'SELAMAT'
    if (peratusBeban > 100) status = 'MELEBIHI'
    else if (peratusBeban >= 80) status = 'HAMPIR_HAD'

    const kursusDiajar = Array.from(
      new Set(l.slotJadual.map((s) => s.modul.kumpulan.kursus.namaKursus)),
    )

    return {
      pensyarahId: l.id,
      pensyarahNama: l.nama,
      email: l.email,
      hadJamMaksimum: l.hadJamMaksimum,
      totalJamMingguan,
      bakiJam: Math.round((l.hadJamMaksimum - totalJamMingguan) * 10) / 10,
      peratusBeban: Math.round(peratusBeban * 10) / 10,
      status,
      kursusDiajar,
      bilangSlot: l.slotJadual.length,
    }
  })
}

export async function getLoadDistribution() {
  const loads = await calculateLecturerLoad()
  const byStatus = {
    SELAMAT: loads.filter((l) => l.status === 'SELAMAT').length,
    HAMPIR_HAD: loads.filter((l) => l.status === 'HAMPIR_HAD').length,
    MELEBIHI: loads.filter((l) => l.status === 'MELEBIHI').length,
  }
  const avgLoad =
    loads.length > 0
      ? Math.round((loads.reduce((s, l) => s + l.peratusBeban, 0) / loads.length) * 10) / 10
      : 0
  return { loads, byStatus, avgLoad, totalLecturers: loads.length }
}
