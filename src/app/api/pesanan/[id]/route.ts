import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, okResponse, errorResponse } from '@/lib/session'
import { getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id } = await params
    const pesanan = await db.pesanan.findUnique({
      where: { id },
      include: {
        items: { include: { menu: true } },
        pelanggan: true,
        user: { select: { name: true } },
      },
    })
    if (!pesanan) return Response.json({ error: 'Pesanan tidak dijumpai.' }, { status: 404 })
    return okResponse({ pesanan })
  } catch (e) {
    return errorResponse(e)
  }
}
