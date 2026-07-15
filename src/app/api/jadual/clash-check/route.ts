import { NextRequest } from 'next/server'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString } from '@/lib/security'
import { checkSlotClash } from '@/lib/clash-detection'

export async function POST(request: NextRequest) {
  try {
    await requirePermission('clash:check')
    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 })
    }
    const result = await checkSlotClash({
      pensyarahId: sanitizeString(body.pensyarahId),
      bilikId: body.bilikId ? sanitizeString(body.bilikId) : null,
      modulId: sanitizeString(body.modulId),
      hari: sanitizeString(body.hari),
      masaMula: sanitizeString(body.masaMula),
      masaTamat: sanitizeString(body.masaTamat),
      excludeSlotId: body.excludeSlotId ? sanitizeString(body.excludeSlotId) : undefined,
    })
    return okResponse(result)
  } catch (e) {
    return errorResponse(e)
  }
}
