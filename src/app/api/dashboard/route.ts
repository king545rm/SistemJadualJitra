import { db } from '@/lib/db'
import { requireAuth, okResponse, errorResponse } from '@/lib/session'
import { ALERT_KUNING_MINIT, ALERT_MERAH_MINIT, AMARAN_TERTUNGGAK_MINIT } from '@/lib/types'

function minsBetween(start: string | Date, end: number = Date.now()): number {
  const s = typeof start === 'string' ? new Date(start).getTime() : start.getTime()
  return Math.floor((end - s) / 60000)
}

export async function GET() {
  try {
    const session = await requireAuth()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [
      totalPesananHari,
      pesananAktif,
      pesananTertunggak,
      jualanHari,
      menuTersedia,
      pesananHariIni,
    ] = await Promise.all([
      db.pesanan.count({ where: { waktuPesanan: { gte: today, lt: tomorrow } } }),
      db.pesanan.count({ where: { status: { in: ['DITERIMA', 'DIMASAK', 'SIAP'] } } }),
      db.pesanan.findMany({
        where: {
          status: { in: ['DITERIMA', 'DIMASAK'] },
          waktuPesanan: { lt: new Date(Date.now() - AMARAN_TERTUNGGAK_MINIT * 60000) },
        },
        include: { items: true },
      }),
      db.pesanan.aggregate({
        where: { waktuPesanan: { gte: today, lt: tomorrow }, status: { not: 'DIBATALKAN' } },
        _sum: { jumlah: true },
      }),
      db.menu.count({ where: { tersedia: true } }),
      db.pesanan.findMany({
        where: { waktuPesanan: { gte: today, lt: tomorrow } },
        include: { items: true },
      }),
    ])

    const activeOrders = await db.pesanan.findMany({
      where: { status: { in: ['DITERIMA', 'DIMASAK', 'SIAP'] } },
      include: { items: true, pelanggan: true },
      orderBy: { waktuPesanan: 'asc' },
    })

    const ordersWithTimers = activeOrders.map((o) => {
      const mins = minsBetween(o.waktuPesanan)
      let timerStatus: 'ok' | 'kuning' | 'merah' = 'ok'
      if (mins > ALERT_MERAH_MINIT) timerStatus = 'merah'
      else if (mins > ALERT_KUNING_MINIT) timerStatus = 'kuning'
      return { ...o, menitBerlalu: mins, timerStatus }
    })

    const salesByKategori: Record<string, number> = {}
    for (const p of pesananHariIni) {
      if (p.status === 'DIBATALKAN') continue
      for (const item of p.items) {
        const menu = await db.menu.findUnique({ where: { id: item.menuId } })
        const kat = menu?.kategori ?? 'LAIN'
        salesByKategori[kat] = (salesByKategori[kat] ?? 0) + item.subtotal
      }
    }

    return okResponse({
      session,
      stats: {
        totalPesananHari,
        pesananAktif,
        pesananTertunggak: pesananTertunggak.length,
        jualanHari: jualanHari._sum.jumlah ?? 0,
        menuTersedia,
      },
      activeOrders: ordersWithTimers,
      tertunggakList: pesananTertunggak.map((o) => ({
        id: o.id,
        noPesanan: o.noPesanan,
        mejaNama: o.mejaNama,
        menitBerlalu: minsBetween(o.waktuPesanan),
        status: o.status,
      })),
      salesByKategori,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
