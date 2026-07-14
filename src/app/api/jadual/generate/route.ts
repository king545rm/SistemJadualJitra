import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, okResponse, errorResponse } from '@/lib/session'
import { auditLog } from '@/lib/audit'
import { getClientIp, sanitizeString } from '@/lib/security'
import { HARI_LIST, TIME_SLOTS, timesOverlap } from '@/lib/clash-detection'

// AI-powered schedule generation using z-ai-web-dev-sdk (replaces GLM 5.2 per PRD F5)
// Generates a clash-free timetable proposal based on modules, lecturers, rooms & constraints.
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('jadual:generate')
    let body: any
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const targetKursusId = body.kursusId ? sanitizeString(body.kursusId) : null
    const clearExisting = body.clearExisting === true

    // Gather data
    const kursusFilter = targetKursusId ? { kursusId: targetKursusId } : {}
    const kumpulanList = await db.kumpulanSemester.findMany({
      where: kursusFilter,
      include: {
        kursus: true,
        modul: { include: { pensyarahModul: { include: { pensyarah: true } } } },
      },
    })

    const allBilik = await db.bilik.findMany()
    const allPensyarah = await db.pensyarah.findMany({
      include: { pensyarahKursus: true },
    })

    // Build context summary for the AI
    const summary = {
      totalKumpulan: kumpulanList.length,
      totalModul: kumpulanList.reduce((s, k) => s + k.modul.length, 0),
      totalPensyarah: allPensyarah.length,
      totalBilik: allBilik.length,
      hari: HARI_LIST,
      slotMasa: TIME_SLOTS,
    }

    // Constraint-based greedy scheduling engine (deterministic + clash-free).
    // The AI provides optimisation rationale + explainability; the engine guarantees clash-free output.
    let aiRationale = ''
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content:
              'Anda adalah penasihat AI untuk ADTEC Jitra Smart Timetable System (ASTS). Tugas anda memberi strategi pengoptimuman penjadualan kelas berasaskan kekangan: elak pertindihan pensyarah, bilik dan kumpulan; seimbangkan beban tugas pensyarah. Jawab dalam Bahasa Melayu, ringkas (maksimum 5 bullet).',
          },
          {
            role: 'user',
            content: `Berdasarkan ringkasan data berikut, berikan strategi penjanaan jadual optimum: ${JSON.stringify(summary)}. Sebutkan kekangan utama dan strategi pengagihan beban tugas.`,
          },
        ],
        thinking: { type: 'disabled' },
      })
      aiRationale = completion.choices[0]?.message?.content ?? ''
    } catch (err) {
      console.error('AI rationale failed, continuing with deterministic engine:', err)
      aiRationale = 'Enjin AI tidak tersedia buat sementara. Jadual dijana menggunakan enjin deterministik bebas pertindihan.'
    }

    // Optional: clear existing dummy schedule for target scope
    if (clearExisting) {
      const existingSlots = await db.slotJadual.findMany({
        where: { modul: { kumpulan: kursusFilter } },
        select: { id: true },
      })
      const slotIds = existingSlots.map((s) => s.id)
      if (slotIds.length > 0) {
        // Delete dependent permohonan first (FK constraint)
        await db.permohonanPertukaran.deleteMany({ where: { slotAsalId: { in: slotIds } } })
        await db.slotJadual.deleteMany({ where: { id: { in: slotIds } } })
      }
    }

    // Deterministic constraint-based scheduler
    const generated: Array<{
      modulId: string
      pensyarahId: string
      bilikId: string | null
      hari: string
      masaMula: string
      masaTamat: string
      modulNama: string
    }> = []
    const clashesAvoided: string[] = []
    // Track assignments per lecturer & room & group as we build
    const lecturerBusy = new Map<string, Set<string>>() // pensyarahId -> set of "HARI|mula|tamat" keys (simplified: track day+start)
    const roomBusy = new Map<string, Set<string>>()
    const groupBusy = new Map<string, Set<string>>()

    function isBusy(map: Map<string, Set<string>>, key: string, hari: string, mula: string, tamat: string): boolean {
      const set = map.get(key)
      if (!set) return false
      for (const entry of set) {
        const [h, s, e] = entry.split('|')
        if (h !== hari) continue
        if (timesOverlap(mula, tamat, s, e)) return true
      }
      return false
    }
    function markBusy(map: Map<string, Set<string>>, key: string, hari: string, mula: string, tamat: string) {
      if (!map.has(key)) map.set(key, new Set())
      map.get(key)!.add(`${hari}|${mula}|${tamat}`)
    }

    // Lecturer load tracker
    const lecturerLoad = new Map<string, number>()
    for (const p of allPensyarah) lecturerLoad.set(p.id, 0)

    let bIndex = 0
    for (const kumpulan of kumpulanList) {
      const kKey = kumpulan.id
      for (const modul of kumpulan.modul) {
        // pick primary lecturer (least loaded first)
        const candidates = modul.pensyarahModul
          .map((pm) => ({ id: pm.pensyarahId, load: lecturerLoad.get(pm.pensyarahId) ?? 0, had: pm.pensyarah.hadJamMaksimum }))
          .sort((a, b) => a.load - b.load)
        if (candidates.length === 0) continue
        const lecturer = candidates[0]
        const numSlots = modul.jamKontakMingguan >= 4 ? 2 : 1
        let placed = 0
        for (let attempt = 0; attempt < HARI_LIST.length * TIME_SLOTS.length && placed < numSlots; attempt++) {
          const hari = HARI_LIST[attempt % HARI_LIST.length]
          const slot = TIME_SLOTS[Math.floor(attempt / HARI_LIST.length) % TIME_SLOTS.length]
          // skip if lecturer busy / room busy / group busy
          if (isBusy(lecturerBusy, lecturer.id, hari, slot.mula, slot.tamat)) continue
          if (isBusy(groupBusy, kKey, hari, slot.mula, slot.tamat)) continue
          // pick a room
          const bilik = allBilik[bIndex % allBilik.length]
          bIndex++
          if (isBusy(roomBusy, bilik.id, hari, slot.mula, slot.tamat)) {
            clashesAvoided.push(`${kumpulan.kursus.kodKursus} Sem${kumpulan.semesterNo} ${modul.namaModul}: bilik ${bilik.namaBilik} sibuk pada ${hari} ${slot.mula}`)
            continue
          }
          // place it
          markBusy(lecturerBusy, lecturer.id, hari, slot.mula, slot.tamat)
          markBusy(roomBusy, bilik.id, hari, slot.mula, slot.tamat)
          markBusy(groupBusy, kKey, hari, slot.mula, slot.tamat)
          lecturerLoad.set(lecturer.id, (lecturerLoad.get(lecturer.id) ?? 0) + 1)
          generated.push({
            modulId: modul.id,
            pensyarahId: lecturer.id,
            bilikId: bilik.id,
            hari,
            masaMula: slot.mula,
            masaTamat: slot.tamat,
            modulNama: modul.namaModul,
          })
          placed++
        }
        if (placed < numSlots) {
          clashesAvoided.push(`${kumpulan.kursus.kodKursus} Sem${kumpulan.semesterNo} ${modul.namaModul}: hanya ${placed}/${numSlots} slot ditempatkan (kekangan ketat).`)
        }
      }
    }

    // Persist generated slots (as dummy=false since they are now "real" proposals)
    let createdCount = 0
    for (const g of generated) {
      try {
        await db.slotJadual.create({
          data: {
            modulId: g.modulId,
            pensyarahId: g.pensyarahId,
            bilikId: g.bilikId,
            hari: g.hari,
            masaMula: g.masaMula,
            masaTamat: g.masaTamat,
            isDummy: false,
          },
        })
        createdCount++
      } catch (err) {
        console.error('Failed to create generated slot:', err)
      }
    }

    await auditLog({
      session,
      action: 'GENERATE',
      entity: 'SLOT_JADUAL',
      after: { generated: createdCount, clashesAvoided: clashesAvoided.length, targetKursusId },
      ipAddress: getClientIp(request),
    })

    return okResponse({
      success: true,
      aiRationale,
      generated: createdCount,
      clashesAvoided,
      sample: generated.slice(0, 20),
    })
  } catch (e) {
    return errorResponse(e)
  }
}
