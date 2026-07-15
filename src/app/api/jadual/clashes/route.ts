import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { findAllClashes } from '@/lib/clash-detection'

export async function GET() {
  try {
    await requirePermission('clash:check')
    const result = await findAllClashes()
    return okResponse(result)
  } catch (e) {
    return errorResponse(e)
  }
}
