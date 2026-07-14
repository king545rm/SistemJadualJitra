import { NextRequest } from 'next/server'
import { clearSession, getCurrentUser, okResponse } from '@/lib/session'
import { auditLog } from '@/lib/audit'
import { getClientIp } from '@/lib/security'

export async function POST(request: NextRequest) {
  const session = await getCurrentUser()
  if (session) {
    await auditLog({ session, action: 'LOGOUT', entity: 'USER', entityId: session.id, ipAddress: getClientIp(request) })
  }
  await clearSession()
  return okResponse({ success: true })
}
