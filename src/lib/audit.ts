import { db } from '@/lib/db'
import type { SessionData } from '@/lib/auth'

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'APPROVE'
  | 'REJECT'
  | 'GENERATE'
  | 'CLASH_DETECTED'

export interface AuditParams {
  session?: SessionData | null
  action: AuditAction
  entity: string
  entityId?: string
  before?: unknown
  after?: unknown
  ipAddress?: string
}

export async function auditLog(params: AuditParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.session?.id ?? null,
        userName: params.session?.name ?? 'Sistem',
        userRole: params.session?.role ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        before: params.before ? JSON.stringify(params.before) : null,
        after: params.after ? JSON.stringify(params.after) : null,
        ipAddress: params.ipAddress ?? null,
      },
    })
  } catch (err) {
    console.error('Failed to write audit log:', err)
  }
}
