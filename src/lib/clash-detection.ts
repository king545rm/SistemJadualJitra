import { db } from '@/lib/db'

export interface TimeSlot {
  hari: string
  masaMula: string // "HH:MM"
  masaTamat: string // "HH:MM"
}

export interface ClashResult {
  hasClash: boolean
  lecturerClashes: ClashDetail[]
  roomClashes: ClashDetail[]
  groupClashes: ClashDetail[]
}

export interface ClashDetail {
  type: 'LECTURER' | 'ROOM' | 'GROUP'
  existingSlotId: string
  newSlotInfo: string
  existingSlotInfo: string
  message: string
}

export const HARI_LIST = ['ISNIN', 'SELASA', 'RABU', 'KHAMIS', 'JUMAAT'] as const
export type Hari = (typeof HARI_LIST)[number]

// Standard time slots for the timetable grid
export const TIME_SLOTS = [
  { mula: '08:00', tamat: '09:00' },
  { mula: '09:00', tamat: '10:00' },
  { mula: '10:00', tamat: '11:00' },
  { mula: '11:00', tamat: '12:00' },
  { mula: '12:00', tamat: '13:00' },
  { mula: '14:00', tamat: '15:00' },
  { mula: '15:00', tamat: '16:00' },
  { mula: '16:00', tamat: '17:00' },
]

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean {
  const s1 = timeToMinutes(start1)
  const e1 = timeToMinutes(end1)
  const s2 = timeToMinutes(start2)
  const e2 = timeToMinutes(end2)
  return s1 < e2 && s2 < e1
}

export function isSameDay(d1: string, d2: string): boolean {
  return d1 === d2
}

// Check if a new/edited slot would cause any clash
export async function checkSlotClash(params: {
  pensyarahId: string
  bilikId?: string | null
  modulId: string
  hari: string
  masaMula: string
  masaTamat: string
  excludeSlotId?: string // for edit - don't compare with itself
}): Promise<ClashResult> {
  const { pensyarahId, bilikId, modulId, hari, masaMula, masaTamat, excludeSlotId } = params

  // Find the modul to get kumpulan (for group clash)
  const modul = await db.modul.findUnique({
    where: { id: modulId },
    include: { kumpulan: true },
  })

  // Get all slots on the same day that could overlap (broad filter)
  const sameDaySlots = await db.slotJadual.findMany({
    where: {
      hari,
      ...(excludeSlotId ? { id: { not: excludeSlotId } } : {}),
    },
    include: {
      modul: { include: { kumpulan: { include: { kursus: true } } } },
      pensyarah: true,
      bilik: true,
    },
  })

  const lecturerClashes: ClashDetail[] = []
  const roomClashes: ClashDetail[] = []
  const groupClashes: ClashDetail[] = []

  for (const slot of sameDaySlots) {
    if (!timesOverlap(masaMula, masaTamat, slot.masaMula, slot.masaTamat)) continue

    // Lecturer clash
    if (slot.pensyarahId === pensyarahId) {
      lecturerClashes.push({
        type: 'LECTURER',
        existingSlotId: slot.id,
        newSlotInfo: `${hari} ${masaMula}-${masaTamat}`,
        existingSlotInfo: `${slot.modul.namaModul} (${slot.hari} ${slot.masaMula}-${slot.masaTamat})`,
        message: `Pensyarah ${slot.pensyarah.nama} sudah mengajar ${slot.modul.namaModul} pada ${slot.hari} ${slot.masaMula}-${slot.masaTamat}.`,
      })
    }

    // Room clash
    if (bilikId && slot.bilikId === bilikId) {
      roomClashes.push({
        type: 'ROOM',
        existingSlotId: slot.id,
        newSlotInfo: `${hari} ${masaMula}-${masaTamat}`,
        existingSlotInfo: `${slot.modul.namaModul} (${slot.hari} ${slot.masaMula}-${slot.masaTamat})`,
        message: `Bilik ${slot.bilik?.namaBilik} telah ditempah untuk ${slot.modul.namaModul} pada ${slot.hari} ${slot.masaMula}-${slot.masaTamat}.`,
      })
    }

    // Group clash (same kumpulan)
    if (modul && slot.modul.kumpulanId === modul.kumpulanId) {
      groupClashes.push({
        type: 'GROUP',
        existingSlotId: slot.id,
        newSlotInfo: `${hari} ${masaMula}-${masaTamat}`,
        existingSlotInfo: `${slot.modul.namaModul} (${slot.hari} ${slot.masaMula}-${slot.masaTamat})`,
        message: `Kumpulan ${modul.kumpulan.kohortNama} Sem ${modul.kumpulan.semesterNo} sudah ada kelas ${slot.modul.namaModul} pada ${slot.hari} ${slot.masaMula}-${slot.masaTamat}.`,
      })
    }
  }

  return {
    hasClash: lecturerClashes.length > 0 || roomClashes.length > 0 || groupClashes.length > 0,
    lecturerClashes,
    roomClashes,
    groupClashes,
  }
}

// Scan ALL existing slots and return any clashes found (for dashboard / validation)
export async function findAllClashes(): Promise<{
  clashes: Array<{
    slotA: SlotClashInfo
    slotB: SlotClashInfo
    type: 'LECTURER' | 'ROOM' | 'GROUP'
  }>
  totalClashes: number
}> {
  const allSlots = await db.slotJadual.findMany({
    include: {
      modul: { include: { kumpulan: { include: { kursus: true } } } },
      pensyarah: true,
      bilik: true,
    },
    orderBy: { hari: 'asc' },
  })

  const clashes: Array<{
    slotA: SlotClashInfo
    slotB: SlotClashInfo
    type: 'LECTURER' | 'ROOM' | 'GROUP'
  }> = []

  for (let i = 0; i < allSlots.length; i++) {
    for (let j = i + 1; j < allSlots.length; j++) {
      const a = allSlots[i]
      const b = allSlots[j]
      if (!isSameDay(a.hari, b.hari)) continue
      if (!timesOverlap(a.masaMula, a.masaTamat, b.masaMula, b.masaTamat)) continue

      const infoA = toClashInfo(a)
      const infoB = toClashInfo(b)

      if (a.pensyarahId === b.pensyarahId) {
        clashes.push({ slotA: infoA, slotB: infoB, type: 'LECTURER' })
      }
      if (a.bilikId && a.bilikId === b.bilikId) {
        clashes.push({ slotA: infoA, slotB: infoB, type: 'ROOM' })
      }
      if (a.modul.kumpulanId === b.modul.kumpulanId) {
        clashes.push({ slotA: infoA, slotB: infoB, type: 'GROUP' })
      }
    }
  }

  return { clashes, totalClashes: clashes.length }
}

interface SlotClashInfo {
  id: string
  hari: string
  masaMula: string
  masaTamat: string
  modulNama: string
  pensyarahNama: string
  bilikNama: string | null
  kursusKod: string
  semesterNo: number
}

function toClashInfo(slot: any): SlotClashInfo {
  return {
    id: slot.id,
    hari: slot.hari,
    masaMula: slot.masaMula,
    masaTamat: slot.masaTamat,
    modulNama: slot.modul.namaModul,
    pensyarahNama: slot.pensyarah.nama,
    bilikNama: slot.bilik?.namaBilik ?? null,
    kursusKod: slot.modul.kumpulan.kursus.kodKursus,
    semesterNo: slot.modul.kumpulan.semesterNo,
  }
}

// Suggest alternative slots for a conflicted slot
export async function suggestAlternativeSlots(params: {
  pensyarahId: string
  modulId: string
  bilikId?: string | null
  durationMinutes: number
}): Promise<
  Array<{
    hari: string
    masaMula: string
    masaTamat: string
    clashFree: boolean
  }>
> {
  const { pensyarahId, modulId, bilikId, durationMinutes } = params
  const suggestions: Array<{ hari: string; masaMula: string; masaTamat: string; clashFree: boolean }> = []

  for (const hari of HARI_LIST) {
    for (const slot of TIME_SLOTS) {
      const duration = timeToMinutes(slot.tamat) - timeToMinutes(slot.mula)
      if (duration < durationMinutes) continue
      const result = await checkSlotClash({
        pensyarahId,
        modulId,
        bilikId: bilikId ?? null,
        hari,
        masaMula: slot.mula,
        masaTamat: slot.tamat,
      })
      suggestions.push({
        hari,
        masaMula: slot.mula,
        masaTamat: slot.tamat,
        clashFree: !result.hasClash,
      })
    }
  }

  // Return clash-free first, then others
  return suggestions.sort((a, b) => Number(b.clashFree) - Number(a.clashFree))
}
