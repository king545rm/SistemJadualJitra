import { NextRequest } from 'next/server'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString } from '@/lib/security'
import { suggestAlternativeSlots, timeToMinutes } from '@/lib/clash-detection'

export async function POST(request: NextRequest) {
  try {
    await requirePermission('clash:check')
    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 })
    }
    const pensyarahId = sanitizeString(body.pensyarahId)
    const modulId = sanitizeString(body.modulId)
    const bilikId = body.bilikId ? sanitizeString(body.bilikId) : null
    const masaMula = sanitizeString(body.masaMula)
    const masaTamat = sanitizeString(body.masaTamat)
    const durationMinutes = timeToMinutes(masaTamat) - timeToMinutes(masaMula)
    const suggestions = await suggestAlternativeSlots({ pensyarahId, modulId, bilikId, durationMinutes })
    return okResponse({ suggestions })
  } catch (e) {
    return errorResponse(e)
  }
}
