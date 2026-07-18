import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('pelanggan:view')
    const { id } = await params
    const pelanggan = await db.pelanggan.findUnique({
      where: { id },
      include: {
        pesanan: {
          include: { items: true },
          orderBy: { waktuPesanan: 'desc' },
          take: 20,
        },
      },
    })
    if (!pelanggan) return Response.json({ error: 'Pelanggan tidak dijumpai.' }, { status: 404 })
    return okResponse({ pelanggan })
  } catch (e) {
    return errorResponse(e)
  }
}
