import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'

// Get receipt for a specific order
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('resit:view')
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
    const baki = pesanan.jumlah - pesanan.jumlahDibayar
    return okResponse({
      resit: {
        noPesanan: pesanan.noPesanan,
        waktuPesanan: pesanan.waktuPesanan,
        jenis: pesanan.jenis,
        mejaNama: pesanan.mejaNama,
        diambilOleh: pesanan.user?.name,
        items: pesanan.items.map((i) => ({
          nama: i.namaSewaktu,
          kuantiti: i.kuantiti,
          harga: i.hargaSewaktu,
          subtotal: i.subtotal,
          nota: i.nota,
        })),
        jumlah: pesanan.jumlah,
        jumlahDibayar: pesanan.jumlahDibayar,
        baki,
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
