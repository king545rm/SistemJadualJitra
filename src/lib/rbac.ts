// RBAC for CAOMS — CKT Adik Order Management System

export const ROLES = {
  PEMILIK: 'PEMILIK', // Owner — full access
  KAUNTER: 'KAUNTER', // Counter staff — take orders, update status
  DAPUR: 'DAPUR', // Kitchen staff — view pending orders, update cooking status
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export type Permission =
  | 'dashboard:view'
  | 'pesanan:create'
  | 'pesanan:view'
  | 'pesanan:update_status'
  | 'pesanan:cancel'
  | 'menu:view'
  | 'menu:manage'
  | 'laporan:view'
  | 'pelanggan:view'
  | 'pelanggan:manage'
  | 'resit:view'
  | 'audit:view'
  | 'user:manage'

const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  PEMILIK: [
    'dashboard:view', 'pesanan:create', 'pesanan:view', 'pesanan:update_status', 'pesanan:cancel',
    'menu:view', 'menu:manage', 'laporan:view', 'pelanggan:view', 'pelanggan:manage',
    'resit:view', 'audit:view', 'user:manage',
  ],
  KAUNTER: [
    'dashboard:view', 'pesanan:create', 'pesanan:view', 'pesanan:update_status', 'pesanan:cancel',
    'menu:view', 'pelanggan:view', 'pelanggan:manage', 'resit:view',
  ],
  DAPUR: [
    'dashboard:view', 'pesanan:view', 'pesanan:update_status',
  ],
}

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = PERMISSION_MATRIX[role as Role]
  return !!perms && perms.includes(permission)
}

export function getPermissions(role: string): Permission[] {
  return PERMISSION_MATRIX[role as Role] ?? []
}

export const ROLE_LABELS: Record<Role, string> = {
  PEMILIK: 'Pemilik',
  KAUNTER: 'Pekerja Kaunter',
  DAPUR: 'Pekerja Dapur',
}
