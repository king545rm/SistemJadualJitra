import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'

// AI-powered sales analysis using z-ai-web-dev-sdk (replaces GLM 5.2 per PRD F5)
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('laporan:view')
    let body: any
    try { body = await request.json() } catch { body = {} }
    const period = body.period || 'minggu'

    const now = new Date()
    let startDate = new Date(now)
    startDate.setHours(0, 0, 0, 0)
    let endDate = new Date(now)

    if (period === 'minggu') {
      const day = startDate.getDay()
      startDate.setDate(startDate.getDate() - day)
    } else if (period === 'bulan') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const pesananList = await db.pesanan.findMany({
      where: {
        waktuPesanan: { gte: startDate, lt: endDate },
        status: { not: 'DIBATALKAN' },
      },
      include: { items: true },
    })

    const totalJualan = pesananList.reduce((s, p) => s + p.jumlah, 0)
    const itemCounter: Record<string, number> = {}
    for (const p of pesananList) {
      for (const item of p.items) {
        itemCounter[item.namaSewaktu] = (itemCounter[item.namaSewaktu] ?? 0) + item.kuantiti
      }
    }
    const topItems = Object.entries(itemCounter).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const summary = {
      period,
      totalPesanan: pesananList.length,
      totalJualan,
      purata: pesananList.length > 0 ? totalJualan / pesananList.length : 0,
      topItems,
      waktuPuncak: pesananList.reduce((acc: Record<number, number>, p) => {
        const h = new Date(p.waktuPesanan).getHours()
        acc[h] = (acc[h] ?? 0) + 1
        return acc
      }, {}),
    }

    let analysis = ''
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content:
              'Anda adalah asisten AI untuk perniagaan Char Kue Teow "CKT Adik". Berikan analisis jualan dalam Bahasa Melayu yang ringkas dan praktikal (3-4 bullet point). Fokus pada: trend jualan, menu terlaris, waktu puncak, dan cadangan tindakan untuk pemilik perniagaan.',
          },
          {
            role: 'user',
            content: `Analisis data jualan berikut: ${JSON.stringify(summary)}`,
          },
        ],
        thinking: { type: 'disabled' },
      })
      analysis = completion.choices[0]?.message?.content ?? ''
    } catch (err) {
      console.error('AI analysis failed:', err)
      analysis = `Berdasarkan data tempoh ${period}: ${pesananList.length} pesanan, jualan RM${totalJualan.toFixed(2)}. Menu terlaris: ${topItems[0]?.[0] ?? 'N/A'}. Sila semak laporan penuh untuk butiran.`
    }

    return okResponse({ analysis, summary })
  } catch (e) {
    return errorResponse(e)
  }
}
