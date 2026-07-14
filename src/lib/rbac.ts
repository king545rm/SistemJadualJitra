// RBAC (Role-Based Access Control) per PRD section 3 & 7

export const ROLES = {
  TIMBALAN_PENGARAH: 'TIMBALAN_PENGARAH', // full access - all courses & reports
  HEA: 'HEA', // Unit Akademik - coordinate all, resolve cross-course conflicts
  KETUA_KURSUS: 'KETUA_KURSUS', // manage own course only
  PENSYARAH: 'PENSYARAH', // view own schedule, request transfers
  IT: 'IT', // system admin - config, users, integration
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export type Permission =
  | 'dashboard:view'
  | 'kursus:view'
  | 'kursus:manage'
  | 'pensyarah:view'
  | 'pensyarah:manage'
  | 'modul:view'
  | 'modul:manage'
  | 'bilik:view'
  | 'bilik:manage'
  | 'jadual:view'
  | 'jadual:manage'
  | 'jadual:generate'
  | 'beban:view'
  | 'permohonan:create'
  | 'permohonan:view'
  | 'permohonan:approve'
  | 'audit:view'
  | 'user:manage'
  | 'clash:check'

const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  TIMBALAN_PENGARAH: [
    'dashboard:view', 'kursus:view', 'kursus:manage', 'pensyarah:view', 'pensyarah:manage',
    'modul:view', 'modul:manage', 'bilik:view', 'bilik:manage', 'jadual:view', 'jadual:manage',
    'jadual:generate', 'beban:view', 'permohonan:create', 'permohonan:view', 'permohonan:approve',
    'audit:view', 'user:manage', 'clash:check',
  ],
  HEA: [
    'dashboard:view', 'kursus:view', 'kursus:manage', 'pensyarah:view', 'pensyarah:manage',
    'modul:view', 'modul:manage', 'bilik:view', 'bilik:manage', 'jadual:view', 'jadual:manage',
    'jadual:generate', 'beban:view', 'permohonan:create', 'permohonan:view', 'permohonan:approve',
    'audit:view', 'clash:check',
  ],
  KETUA_KURSUS: [
    'dashboard:view', 'kursus:view', 'pensyarah:view', 'pensyarah:manage', 'modul:view',
    'modul:manage', 'bilik:view', 'jadual:view', 'jadual:manage', 'jadual:generate', 'beban:view',
    'permohonan:create', 'permohonan:view', 'permohonan:approve', 'clash:check',
  ],
  PENSYARAH: [
    'dashboard:view', 'kursus:view', 'pensyarah:view', 'modul:view', 'bilik:view', 'jadual:view',
    'beban:view', 'permohonan:create', 'permohonan:view',
  ],
  IT: [
    'dashboard:view', 'kursus:view', 'pensyarah:view', 'modul:view', 'bilik:view', 'bilik:manage',
    'jadual:view', 'beban:view', 'audit:view', 'user:manage',
  ],
}

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = PERMISSION_MATRIX[role as Role]
  return !!perms && perms.includes(permission)
}

export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

export function getPermissions(role: string): Permission[] {
  return PERMISSION_MATRIX[role as Role] ?? []
}

export const ROLE_LABELS: Record<Role, string> = {
  TIMBALAN_PENGARAH: 'Timbalan Pengarah',
  HEA: 'Unit Akademik (HEA)',
  KETUA_KURSUS: 'Ketua Kursus',
  PENSYARAH: 'Pensyarah',
  IT: 'Pentadbir Sistem (IT)',
}
