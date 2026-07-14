import { NextRequest } from 'next/server'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { calculateLecturerLoad, getLoadDistribution } from '@/lib/teaching-load'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('beban:view')
    const { searchParams } = new URL(request.url)
    const pensyarahId = searchParams.get('pensyarahId')
    if (pensyarahId) {
      const loads = await calculateLecturerLoad(pensyarahId)
      return okResponse({ loads })
    }
    const distribution = await getLoadDistribution()
    return okResponse(distribution)
  } catch (e) {
    return errorResponse(e)
  }
}
