import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requirePermission, okResponse, errorResponse } from '@/lib/session'
import { sanitizeString, getClientIp } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const jenis = searchParams.get('jenis')
    const tarikh = searchParams.get('tarikh') // YYYY-MM-DD
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500)

    let where: any = {}
    if (status) where.status = status
    if (jenis) where.jenis = jenis
    if (tarikh) {
      const d = new Date(tarikh)
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      where.waktuPesanan = { gte: d, lt: next }
    }

    const pesanan = await db.pesanan.findMany({
      where,
      include: {
        items: { include: { menu: true } },
        pelanggan: true,
        user: { select: { name: true } },
      },
      orderBy: { waktuPesanan: 'desc' },
      take: limit,
    })
    return okResponse({ pesanan })
  } catch (e) {
    return errorResponse(e)
  }
}

// Generate next order number: ORD-001, ORD-002...
async function generateOrderNumber(): Promise<string> {
  // Use timestamp-based unique number to avoid collisions with seed data
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0')
  return `ORD-${yy}${mm}${dd}-${time}`
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('pesanan:create')
    let body: any
    try { body = await request.json() } catch { return Response.json({ error: 'Format JSON tidak sah.' }, { status: 400 }) }

    const jenis = sanitizeString(body.jenis) // DINE_IN | BUNGKUS | DELIVERY
    const mejaNama = body.mejaNama ? sanitizeString(body.mejaNama) : null
    const pelangganId = body.pelangganId ? sanitizeString(body.pelangganId) : null
    const catatan = body.catatan ? sanitizeString(body.catatan) : null
    const items = Array.isArray(body.items) ? body.items : []
    const jumlahDibayar = Number(body.jumlahDibayar) || 0

    if (!jenis || !['DINE_IN', 'BUNGKUS', 'DELIVERY'].includes(jenis)) {
      return Response.json({ error: 'Jenis pesanan tidak sah.' }, { status: 400 })
    }
    if (items.length === 0) {
      return Response.json({ error: 'Sekurang-kurangnya satu item diperlukan.' }, { status: 400 })
    }
    if (jenis === 'DINE_IN' && !mejaNama) {
      return Response.json({ error: 'Nombor meja diperlukan untuk makan di sini.' }, { status: 400 })
    }

    // Validate items & calculate total
    let jumlah = 0
    const orderItemsData: any[] = []
    for (const item of items) {
      const menu = await db.menu.findUnique({ where: { id: sanitizeString(item.menuId) } })
      if (!menu || !menu.tersedia) {
        return Response.json({ error: `Menu tidak tersedia: ${item.menuId}` }, { status: 400 })
      }
      const kuantiti = Number(item.kuantiti) || 1
      const nota = item.nota ? sanitizeString(item.nota) : null
      const opsyen = item.opsyen ? JSON.stringify(item.opsyen) : null
      const subtotal = menu.harga * kuantiti
      jumlah += subtotal
      orderItemsData.push({
        menuId: menu.id,
        namaSewaktu: menu.nama,
        hargaSewaktu: menu.harga,
        kuantiti,
        opsyen,
        nota,
        subtotal,
      })
    }

    const noPesanan = await generateOrderNumber()
    const baki = jumlah - jumlahDibayar

    const created = await db.pesanan.create({
      data: {
        noPesanan,
        jenis,
        mejaNama,
        pelangganId,
        status: 'DITERIMA',
        jumlah,
        jumlahDibayar,
        baki,
        catatan,
        diambilOleh: session.id,
        isDummy: false,
        items: { create: orderItemsData },
      },
      include: { items: { include: { menu: true } }, pelanggan: true },
    })

    await auditLog({ session, action: 'CREATE', entity: 'PESANAN', entityId: created.id, after: { ...created, items: orderItemsData.length }, ipAddress: getClientIp(request) })
    return okResponse({ pesanan: created }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
