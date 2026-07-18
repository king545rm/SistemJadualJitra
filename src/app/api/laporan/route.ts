import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('laporan:view')
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'hari' // hari | minggu | bulan

    const now = new Date()
    let startDate = new Date(now)
    startDate.setHours(0, 0, 0, 0)
    let endDate = new Date(now)
    endDate.setHours(23, 59, 59, 999)

    if (period === 'minggu') {
      const day = startDate.getDay()
      startDate.setDate(startDate.getDate() - day) // Sunday start
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 7)
    } else if (period === 'bulan') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    }

    // Get orders in period
    const pesananList = await db.pesanan.findMany({
      where: {
        waktuPesanan: { gte: startDate, lt: endDate },
        status: { not: 'DIBATALKAN' },
      },
      include: { items: { include: { menu: true } } },
      orderBy: { waktuPesanan: 'asc' },
    })

    // Summary
    const totalPesanan = pesananList.length
    const totalJualan = pesananList.reduce((s, p) => s + p.jumlah, 0)
    const bilItem = pesananList.reduce((s, p) => s + p.items.reduce((ss, i) => ss + i.kuantiti, 0), 0)

    // Best sellers (by quantity)
    const itemCounter: Record<string, { nama: string; kuantiti: number; jumlah: number }> = {}
    for (const p of pesananList) {
      for (const item of p.items) {
        const key = item.namaSewaktu
        if (!itemCounter[key]) itemCounter[key] = { nama: key, kuantiti: 0, jumlah: 0 }
        itemCounter[key].kuantiti += item.kuantiti
        itemCounter[key].jumlah += item.subtotal
      }
    }
    const menuTerlaris = Object.values(itemCounter).sort((a, b) => b.kuantiti - a.kuantiti).slice(0, 10)
    const menuKurangLaku = Object.values(itemCounter).sort((a, b) => a.kuantiti - b.kuantiti).slice(0, 5)

    // Peak hours (by hour of day)
    const peakHours: Record<number, number> = {}
    for (const p of pesananList) {
      const h = new Date(p.waktuPesanan).getHours()
      peakHours[h] = (peakHours[h] ?? 0) + 1
    }
    const peakHourList = Object.entries(peakHours)
      .map(([h, c]) => ({ jam: Number(h), bil: c }))
      .sort((a, b) => b.bil - a.bil)

    // Sales by day (for charts)
    const salesByDay: Record<string, { tarikh: string; jualan: number; bil: number }> = {}
    for (const p of pesananList) {
      const d = new Date(p.waktuPesanan).toISOString().split('T')[0]
      if (!salesByDay[d]) salesByDay[d] = { tarikh: d, jualan: 0, bil: 0 }
      salesByDay[d].jualan += p.jumlah
      salesByDay[d].bil += 1
    }
    const trendJualan = Object.values(salesByDay).sort((a, b) => a.tarikh.localeCompare(b.tarikh))

    // Sales by category
    const salesByKategori: Record<string, number> = {}
    for (const p of pesananList) {
      for (const item of p.items) {
        const kat = item.menu?.kategori ?? 'LAIN'
        salesByKategori[kat] = (salesByKategori[kat] ?? 0) + item.subtotal
      }
    }

    return okResponse({
      period,
      startDate,
      endDate,
      summary: { totalPesanan, totalJualan, bilItem, purataPesanan: totalPesanan > 0 ? totalJualan / totalPesanan : 0 },
      menuTerlaris,
      menuKurangLaku,
      peakHours: peakHourList,
      trendJualan,
      salesByKategori,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
