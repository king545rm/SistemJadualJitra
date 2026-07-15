import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('audit:view')
    const { searchParams } = new URL(request.url)
    const entity = searchParams.get('entity')
    const action = searchParams.get('action')
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500)

    const logs = await db.auditLog.findMany({
      where: {
        ...(entity ? { entity } : {}),
        ...(action ? { action } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })
    const total = await db.auditLog.count({
      where: {
        ...(entity ? { entity } : {}),
        ...(action ? { action } : {}),
      },
    })
    return okResponse({ logs, total })
  } catch (e) {
    return errorResponse(e)
  }
}
