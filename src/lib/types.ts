// Shared types for ASTS

export type Role = 'TIMBALAN_PENGARAH' | 'HEA' | 'KETUA_KURSUS' | 'PENSYARAH' | 'IT'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  kursusId?: string | null
  pensyarahId?: string | null
  csrf?: string
}

export interface Kursus {
  id: string
  namaKursus: string
  kodKursus: string
  deskripsi?: string | null
  isDummy: boolean
  _count?: { kumpulan: number; pensyarahKursus: number }
  kumpulan?: KumpulanSemester[]
  pensyarahKursus?: Array<{ pensyarah: Pensyarah }>
}

export interface KumpulanSemester {
  id: string
  kursusId: string
  semesterNo: number
  bilPelajar: number
  status: 'BELAJAR' | 'LATIHAN_INDUSTRI' | 'TAMAT'
  kohortNama: string
  isDummy: boolean
  kursus?: Kursus
  _count?: { modul: number }
}

export interface Modul {
  id: string
  kumpulanId: string
  namaModul: string
  kodModul: string
  kategori: 'TERAS' | 'UMUM'
  jamKredit: number
  jamKontakMingguan: number
  isDummy: boolean
  kumpulan?: KumpulanSemester
  pensyarahModul?: Array<{ pensyarah: Pensyarah }>
  _count?: { slotJadual: number }
}

export interface Pensyarah {
  id: string
  nama: string
  email: string
  telefon?: string | null
  kepakaran: string // JSON array
  hadJamMaksimum: number
  isDummy: boolean
  pensyarahKursus?: Array<{ kursus: Kursus }>
  pensyarahModul?: Array<{ modul: Modul }>
  _count?: { slotJadual: number }
}

export interface Bilik {
  id: string
  namaBilik: string
  jenis: 'KELAS' | 'MAKMAL' | 'BENGKEL'
  kapasiti: number
  isDummy: boolean
  _count?: { slotJadual: number }
}

export interface SlotJadual {
  id: string
  modulId: string
  pensyarahId: string
  bilikId?: string | null
  hari: string
  masaMula: string
  masaTamat: string
  isDummy: boolean
  modul?: Modul
  pensyarah?: Pensyarah
  bilik?: Bilik | null
}

export interface PermohonanPertukaran {
  id: string
  pensyarahId: string
  slotAsalId: string
  slotCadanganHari?: string | null
  slotCadanganMasaMula?: string | null
  slotCadanganMasaTamat?: string | null
  alasan: string
  status: 'MENUNGGU' | 'DILULUSKAN' | 'DITOLAK'
  sumber: 'JOTFORM' | 'MANUAL'
  catatanPengurus?: string | null
  diluluskanOleh?: string | null
  createdAt: string
  pensyarah?: Pensyarah
  slotAsal?: SlotJadual
}

export interface AuditLogEntry {
  id: string
  userId?: string | null
  userName: string
  userRole?: string | null
  action: string
  entity: string
  entityId?: string | null
  before?: string | null
  after?: string | null
  ipAddress?: string | null
  timestamp: string
}

export interface ClashDetail {
  type: 'LECTURER' | 'ROOM' | 'GROUP'
  existingSlotId: string
  newSlotInfo: string
  existingSlotInfo: string
  message: string
}

export interface ClashResult {
  hasClash: boolean
  lecturerClashes: ClashDetail[]
  roomClashes: ClashDetail[]
  groupClashes: ClashDetail[]
}

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

export const HARI_LIST = ['ISNIN', 'SELASA', 'RABU', 'KHAMIS', 'JUMAAT'] as const
export const HARI_LABELS: Record<string, string> = {
  ISNIN: 'Isnin',
  SELASA: 'Selasa',
  RABU: 'Rabu',
  KHAMIS: 'Khamis',
  JUMAAT: 'Jumaat',
}

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

export const ROLE_LABELS: Record<Role, string> = {
  TIMBALAN_PENGARAH: 'Timbalan Pengarah',
  HEA: 'Unit Akademik (HEA)',
  KETUA_KURSUS: 'Ketua Kursus',
  PENSYARAH: 'Pensyarah',
  IT: 'Pentadbir Sistem (IT)',
}
