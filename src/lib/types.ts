// Shared types for CAOMS

export type Role = 'PEMILIK' | 'KAUNTER' | 'DAPUR'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  csrf?: string
}

export interface Menu {
  id: string
  nama: string
  kod: string
  kategori: string
  harga: number
  deskripsi?: string | null
  tersedia: boolean
  isDummy: boolean
  createdAt: string
  updatedAt: string
}

export interface Pelanggan {
  id: string
  nama: string
  telefon: string
  catatan?: string | null
  isDummy: boolean
  createdAt: string
  pesanan?: Pesanan[]
}

export type StatusPesanan = 'DITERIMA' | 'DIMASAK' | 'SIAP' | 'DIAMBIL' | 'DIBATALKAN'
export type JenisPesanan = 'DINE_IN' | 'BUNGKUS' | 'DELIVERY'

export interface OrderItem {
  id: string
  pesananId: string
  menuId: string
  namaSewaktu: string
  hargaSewaktu: number
  kuantiti: number
  opsyen?: string | null
  nota?: string | null
  subtotal: number
  menu?: Menu
}

export interface Pesanan {
  id: string
  noPesanan: string
  jenis: JenisPesanan
  mejaNama?: string | null
  pelangganId?: string | null
  status: StatusPesanan
  jumlah: number
  jumlahDibayar: number
  baki: number
  catatan?: string | null
  waktuPesanan: string
  waktuSiap?: string | null
  waktuAmbil?: string | null
  diambilOleh?: string | null
  isDummy: boolean
  pelanggan?: Pelanggan | null
  user?: { name: string } | null
  items: OrderItem[]
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

export const KATEGORI_MENU = {
  MEE_KUEY_TEOW: 'Mee / Kuey Teow',
  NASI: 'Nasi',
  MINUMAN: 'Minuman',
  SNEK: 'Snek',
  TAMBAHAN: 'Tambahan',
} as const

export const KATEGORI_LIST = Object.entries(KATEGORI_MENU).map(([key, label]) => ({ key, label }))

export const STATUS_PESANAN = {
  DITERIMA: { label: 'Diterima', color: 'blue' },
  DIMASAK: { label: 'Sedang Dimasak', color: 'amber' },
  SIAP: { label: 'Siap', color: 'green' },
  DIAMBIL: { label: 'Telah Diambil', color: 'gray' },
  DIBATALKAN: { label: 'Dibatalkan', color: 'red' },
} as const

export const JENIS_PESANAN = {
  DINE_IN: { label: 'Makan Di Sini', icon: 'utensils' },
  BUNGKUS: { label: 'Bungkus', icon: 'bag' },
  DELIVERY: { label: 'Penghantaran', icon: 'truck' },
} as const

export const ROLE_LABELS: Record<Role, string> = {
  PEMILIK: 'Pemilik',
  KAUNTER: 'Pekerja Kaunter',
  DAPUR: 'Pekerja Dapur',
}

// Alert thresholds (per PRD F2, F6)
export const ALERT_KUNING_MINIT = 15 // yellow if > 15 min
export const ALERT_MERAH_MINIT = 25 // red if > 25 min
export const AMARAN_TERTUNGGAK_MINIT = 20 // pending order alert threshold
