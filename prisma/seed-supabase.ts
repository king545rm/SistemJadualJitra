/* eslint-disable @typescript-eslint/no-explicit-any */
// ASTS Supabase seed — optimized with createMany batch inserts + pre-generated IDs
// This is ~10x faster than individual create() calls through the Supabase pooler.

import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

const HARI = ['ISNIN', 'SELASA', 'RABU', 'KHAMIS', 'JUMAAT']
let idn = 0
const genId = (p: string) => `${p}${++idn}`

const KURSUS_LIST = [
  { nama: 'Diploma Teknologi Elektrik', kod: 'DTE', deskripsi: 'Latihan dalam sistem elektrik, wiring & maintenance.' },
  { nama: 'Diploma Teknologi Mekanikal', kod: 'DTM', deskripsi: 'Latihan dalam mesin, CNC dan fabrikasi logam.' },
  { nama: 'Diploma Teknologi ICT', kod: 'DICT', deskripsi: 'Latihan dalam rangkaian, pengaturcaraan & sistem.' },
  { nama: 'Diploma Teknologi Elektronik', kod: 'DTEL', deskripsi: 'Latihan dalam elektronik analog & digital.' },
  { nama: 'Diploma Teknologi Pembuatan', kod: 'DTP', deskripsi: 'Latihan dalam automasi & pengurusan pembuatan.' },
  { nama: 'Diploma Teknologi Kimpalan', kod: 'DTK', deskripsi: 'Latihan dalam kimpalan arka, TIG & MIG.' },
  { nama: 'Diploma Teknologi Automotif', kod: 'DTA', deskripsi: 'Latihan dalam enjin, transmisi & diagnostik kenderaan.' },
]

const MODUL_UMUM = [
  { kod: 'BM', nama: 'Bahasa Melayu Komunikasi', jamKredit: 2, jamKontak: 3 },
  { kod: 'PI', nama: 'Pendidikan Islam', jamKredit: 2, jamKontak: 2 },
  { kod: 'PM', nama: 'Pendidikan Moral', jamKredit: 2, jamKontak: 2 },
  { kod: 'KK', nama: 'Kokurikulum', jamKredit: 1, jamKontak: 2 },
  { kod: 'PK', nama: 'Pengajian Malaysia', jamKredit: 2, jamKontak: 2 },
]

const MODUL_TERAS: Record<string, Array<{ kod: string; nama: string; jamKredit: number; jamKontak: number }>> = {
  DTE: [
    { kod: 'DTE101', nama: 'Litar Elektrik Asas', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTE102', nama: 'Pemasangan Elektrik', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTE103', nama: 'Mesin Elektrik', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTE104', nama: 'Sistem Kuasa', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTE201', nama: 'Pengukuran & Instrumen', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTE202', nama: 'Kawalan Motor', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTE301', nama: 'Sistem Pencawang', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTE302', nama: 'Penyelenggaraan Elektrik', jamKredit: 3, jamKontak: 4 },
  ],
  DTM: [
    { kod: 'DTM101', nama: 'Lukis Kejuruteraan', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTM102', nama: 'Teknologi Mekanikal', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTM103', nama: 'Mesin Konvensional', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTM104', nama: 'Bahan Kejuruteraan', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTM201', nama: 'Mesin CNC', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTM202', nama: 'Fabrikasi Logam', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTM301', nama: 'Automasi Pneumatik', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTM302', nama: 'Penyelenggaraan Mesin', jamKredit: 3, jamKontak: 4 },
  ],
  DICT: [
    { kod: 'DICT101', nama: 'Pengaturcaraan Asas', jamKredit: 4, jamKontak: 6 },
    { kod: 'DICT102', nama: 'Rangkaian Komputer', jamKredit: 4, jamKontak: 6 },
    { kod: 'DICT103', nama: 'Sistem Pengoperasian', jamKredit: 3, jamKontak: 4 },
    { kod: 'DICT104', nama: 'Pangkalan Data', jamKredit: 3, jamKontak: 4 },
    { kod: 'DICT201', nama: 'Pengaturcaraan Web', jamKredit: 4, jamKontak: 6 },
    { kod: 'DICT202', nama: 'Keselamatan Siber', jamKredit: 3, jamKontak: 4 },
    { kod: 'DICT301', nama: 'Pengurusan Pelayan', jamKredit: 4, jamKontak: 6 },
    { kod: 'DICT302', nama: 'Cloud Computing', jamKredit: 3, jamKontak: 4 },
  ],
  DTEL: [
    { kod: 'DTEL101', nama: 'Elektronik Analog', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTEL102', nama: 'Elektronik Digital', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTEL103', nama: 'Pengukuran Elektronik', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTEL104', nama: 'Litar Tersepadu', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTEL201', nama: 'Mikropemproses', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTEL202', nama: 'Sistem Kawalan', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTEL301', nama: 'Sistem Benam', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTEL302', nama: 'IoT & Automasi', jamKredit: 3, jamKontak: 4 },
  ],
  DTP: [
    { kod: 'DTP101', nama: 'Pengenalan Pembuatan', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTP102', nama: 'Kawalan Kualiti', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTP103', nama: 'PLC & Automasi', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTP104', nama: 'Robotik', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTP201', nama: 'Sistem Pengeluaran', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTP202', nama: 'CAD/CAM', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTP301', nama: 'Lean Manufacturing', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTP302', nama: 'Pengurusan Inventori', jamKredit: 3, jamKontak: 4 },
  ],
  DTK: [
    { kod: 'DTK101', nama: 'Kimpalan Arka', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTK102', nama: 'Kimpalan TIG', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTK103', nama: 'Kimpalan MIG', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTK104', nama: 'Bahan Logam', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTK201', nama: 'Fabrikasi Logam', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTK202', nama: 'Pemeriksaan Kimpalan', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTK301', nama: 'Kimpalan Paip', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTK302', nama: 'Lukisan Kimpalan', jamKredit: 3, jamKontak: 4 },
  ],
  DTA: [
    { kod: 'DTA101', nama: 'Enjin Kereta', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTA102', nama: 'Sistem Transmisi', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTA103', nama: 'Sistem Brek', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTA104', nama: 'Sistem Elektrik Kenderaan', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTA201', nama: 'Diagnostik Enjin', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTA202', nama: 'Penyejukan & Penyaman Udara', jamKredit: 3, jamKontak: 4 },
    { kod: 'DTA301', nama: 'Sistem Pengurusan Enjin', jamKredit: 4, jamKontak: 6 },
    { kod: 'DTA302', nama: 'Penyelenggaraan Kenderaan', jamKredit: 3, jamKontak: 4 },
  ],
}

const NAMA_PENSYARAH = [
  'Ahmad Faizal bin Rahman', 'Siti Aishah binti Abdullah', 'Mohd Hafiz bin Ibrahim',
  'Nurul Huda binti Che Hasan', 'Rajesh a/l Kumaran', 'Lim Wei Ming',
  'Kamarulzaman bin Yusof', 'Fatimah binti Aziz', 'Ganesh a/l Subramaniam',
  'Wong Chee Keong', 'Zulkifli bin Mohamed', 'Roslina binti Hasan',
  'Suresh a/l Raman', 'Tan Mei Ling', 'Abdul Rahman bin Said',
  'Noraini binti Othman', 'Vijay a/l Chandran', 'Chong Wei Jie',
  'Hamidah binti Said', 'Azman bin Ismail', 'Priya a/l Murugan',
  'Khairul Anuar bin Jalaluddin', 'Faridah binti Yusof', 'Daniel a/l Anthony',
  'Siti Khadijah binti Omar', 'Mohd Nizam bin Hashim', 'Lakshmi a/l Periasamy',
  'Hassan bin Ali', 'Nordiana binti Ramlan', 'Kumar a/l Selvaraj',
  'Aisyah binti Mohammed', 'Faizal bin Abdul Karim', 'Siti Nurhaliza binti Khalid',
  'Ravi a/l Krishnan', 'Omar bin Bakar',
]

const BILIK_LIST = [
  { nama: 'BK-101', jenis: 'KELAS', kapasiti: 40 },
  { nama: 'BK-102', jenis: 'KELAS', kapasiti: 40 },
  { nama: 'BK-201', jenis: 'KELAS', kapasiti: 35 },
  { nama: 'BK-202', jenis: 'KELAS', kapasiti: 35 },
  { nama: 'MK-ELEKTRIK', jenis: 'MAKMAL', kapasiti: 25 },
  { nama: 'MK-MEKANIKAL', jenis: 'MAKMAL', kapasiti: 25 },
  { nama: 'MK-ICT-1', jenis: 'MAKMAL', kapasiti: 30 },
  { nama: 'MK-ICT-2', jenis: 'MAKMAL', kapasiti: 30 },
  { nama: 'MK-ELEKTRONIK', jenis: 'MAKMAL', kapasiti: 25 },
  { nama: 'MK-KIMPALAN', jenis: 'BENGKEL', kapasiti: 20 },
  { nama: 'MK-AUTOMOTIF', jenis: 'BENGKEL', kapasiti: 20 },
  { nama: 'MK-PEMBUATAN', jenis: 'BENGKEL', kapasiti: 25 },
]

async function main() {
  console.log('🧹 Membersihkan data lama...')
  const delOrder = ['AuditLog', 'PermohonanPertukaran', 'SlotJadual', 'PensyarahModul', 'PensyarahKursus', 'Modul', 'KumpulanSemester', 'Pensyarah', 'Bilik', 'Kursus', 'User']
  for (const t of delOrder) await db.$executeRawUnsafe(`DELETE FROM "${t}"`)
  console.log('✓ Data lama dibersihkan.')

  // ---------- Pre-generate all IDs ----------
  const kursusIds: Record<string, string> = {}
  const kumpulanIds: Record<string, string> = {}
  const bilikIds: Record<string, string> = {}
  const pensyarahIds: Record<string, string> = {}
  const modulIds: Record<string, string> = {}

  for (const k of KURSUS_LIST) kursusIds[k.kod] = genId('kursus')
  for (const b of BILIK_LIST) bilikIds[b.nama] = genId('bilik')
  for (const name of NAMA_PENSYARAH) pensyarahIds[name] = genId('pensyarah')

  // ---------- 1. Kursus (batch) ----------
  console.log('📚 Mencipta 7 kursus (batch)...')
  await db.kursus.createMany({
    data: KURSUS_LIST.map((k) => ({
      id: kursusIds[k.kod],
      namaKursus: k.nama,
      kodKursus: k.kod,
      deskripsi: k.deskripsi,
      isDummy: true,
    })),
  })

  // ---------- 2. Kumpulan Semester (batch) ----------
  console.log('👥 Mencipta 28 kumpulan semester (batch)...')
  const statuses = ['BELAJAR', 'BELAJAR', 'BELAJAR', 'LATIHAN_INDUSTRI']
  const kumpulanData: any[] = []
  for (const k of KURSUS_LIST) {
    for (let sem = 1; sem <= 4; sem++) {
      const key = `${k.kod}-sem${sem}`
      const id = genId('kumpulan')
      kumpulanIds[key] = id
      kumpulanData.push({
        id,
        kursusId: kursusIds[k.kod],
        semesterNo: sem,
        bilPelajar: 25 + Math.floor(Math.random() * 16),
        status: statuses[sem - 1],
        kohortNama: `Kohort ${2024 + Math.floor((sem - 1) / 2)}/${2026 + Math.floor((sem - 1) / 2)}`,
        isDummy: true,
      })
    }
  }
  await db.kumpulanSemester.createMany({ data: kumpulanData })

  // ---------- 3. Bilik (batch) ----------
  console.log('🏫 Mencipta 12 bilik (batch)...')
  await db.bilik.createMany({
    data: BILIK_LIST.map((b) => ({
      id: bilikIds[b.nama],
      namaBilik: b.nama,
      jenis: b.jenis,
      kapasiti: b.kapasiti,
      isDummy: true,
    })),
  })

  // ---------- 4. Pensyarah (batch) ----------
  console.log('👨‍🏫 Mencipta 35 pensyarah (batch)...')
  let pIdx = 0
  const pensyarahData: any[] = []
  const pensyarahKursusLinks: any[] = []
  const courseLecturerMap: Record<string, string[]> = {}

  for (const k of KURSUS_LIST) {
    const numLecturers = 5
    for (let i = 0; i < numLecturers; i++) {
      const name = NAMA_PENSYARAH[pIdx % NAMA_PENSYARAH.length]
      pIdx++
      const id = pensyarahIds[name]
      const email = name.toLowerCase().replace(/[^a-z]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '') + '@adtecjitra.gov.my'
      const hadJam = 18 + Math.floor(Math.random() * 8)
      pensyarahData.push({
        id,
        nama: name,
        email,
        telefon: `01${Math.floor(Math.random() * 9)}-${Math.floor(1000000 + Math.random() * 9000000)}`,
        kepakaran: JSON.stringify([k.kod, ...MODUL_TERAS[k.kod].slice(0, 3).map((m) => m.nama)]),
        hadJamMaksimum: hadJam,
        isDummy: true,
      })
      pensyarahKursusLinks.push({ pensyarahId: id, kursusId: kursusIds[k.kod] })
      if (!courseLecturerMap[k.kod]) courseLecturerMap[k.kod] = []
      courseLecturerMap[k.kod].push(id)
    }
  }

  // Deduplicate pensyarah (same name appears once but might teach multiple courses)
  const uniquePensyarah = pensyarahData.filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx)
  await db.pensyarah.createMany({ data: uniquePensyarah })

  // Cross-course lecturers
  console.log('🔗 Menambah pensyarah merentasi kursus...')
  const crossPairs = [
    { from: 'DTE', to: 'DTEL' },
    { from: 'DTM', to: 'DTP' },
    { from: 'DICT', to: 'DTEL' },
    { from: 'DTA', to: 'DTM' },
  ]
  for (let i = 0; i < crossPairs.length; i++) {
    const pair = crossPairs[i]
    const fromLects = courseLecturerMap[pair.from]
    if (fromLects && fromLects[i * 1]) {
      pensyarahKursusLinks.push({ pensyarahId: fromLects[i * 1], kursusId: kursusIds[pair.to] })
    }
  }

  console.log('🔗 Menghubungkan pensyarah ke kursus (batch)...')
  await db.pensyarahKursus.createMany({ data: pensyarahKursusLinks })

  // ---------- 5. Modul (batch) ----------
  console.log('📖 Mencipta modul (batch)...')
  const modulData: any[] = []
  const pensyarahModulLinks: any[] = []
  for (const k of KURSUS_LIST) {
    const terasList = MODUL_TERAS[k.kod]
    for (let sem = 1; sem <= 4; sem++) {
      const kumpulanId = kumpulanIds[`${k.kod}-sem${sem}`]
      const terasForSem = terasList.slice((sem - 1) * 2, (sem - 1) * 2 + 4)
      const umumForSem = [MODUL_UMUM[0], MODUL_UMUM[sem % MODUL_UMUM.length], MODUL_UMUM[4]]
      const allMods = [
        ...terasForSem.map((m) => ({ ...m, kategori: 'TERAS' as const })),
        ...umumForSem.map((m) => ({ ...m, kategori: 'UMUM' as const, kod: `${m.kod}-${k.kod}-S${sem}` })),
      ]
      const lects = courseLecturerMap[k.kod] || []
      for (const m of allMods) {
        const mid = genId('modul')
        modulIds[`${k.kod}-sem${sem}-${m.kod}`] = mid
        modulData.push({
          id: mid,
          kumpulanId,
          namaModul: m.nama,
          kodModul: m.kod,
          kategori: m.kategori,
          jamKredit: m.jamKredit,
          jamKontakMingguan: m.jamKontak,
          isDummy: true,
        })
        // Assign 1 lecturer per module
        if (lects.length > 0) {
          pensyarahModulLinks.push({ pensyarahId: lects[modulData.length % lects.length], modulId: mid })
        }
      }
    }
  }
  await db.modul.createMany({ data: modulData })
  console.log(`  ✓ ${modulData.length} modul dicipta`)

  console.log('🔗 Menghubungkan pensyarah ke modul (batch)...')
  await db.pensyarahModul.createMany({ data: pensyarahModulLinks })

  // ---------- 6. Slot Jadual (batch) ----------
  console.log('📅 Mencipta slot jadual (batch)...')
  const TIME_BLOCKS = [
    ['08:00', '10:00'],
    ['10:00', '12:00'],
    ['14:00', '16:00'],
    ['16:00', '17:00'],
  ]
  const bilikArr = Object.entries(bilikIds)
  const allModulKeys = Object.keys(modulIds)
  const slotData: any[] = []
  let slotsCreated = 0

  for (const mkey of allModulKeys) {
    const mid = modulIds[mkey]
    // find assigned lecturers for this module
    const assigned = pensyarahModulLinks.filter((l) => l.modulId === mid).map((l) => l.pensyarahId)
    if (assigned.length === 0) continue
    // parse kategori for numSlots
    const modul = modulData.find((m) => m.id === mid)
    if (!modul) continue
    const numSlots = modul.jamKontakMingguan >= 4 ? 2 : 1
    for (let s = 0; s < numSlots; s++) {
      const hari = HARI[slotsCreated % 5]
      const [mula, tamat] = TIME_BLOCKS[slotsCreated % TIME_BLOCKS.length]
      const bilikId = bilikArr[slotsCreated % bilikArr.length][1]
      const pensyarahId = assigned[s % assigned.length]
      slotData.push({
        id: genId('slot'),
        modulId: mid,
        pensyarahId,
        bilikId,
        hari,
        masaMula: mula,
        masaTamat: tamat,
        isDummy: true,
      })
      slotsCreated++
    }
  }

  // Intentional clashes
  console.log('⚠️ Mencipta pertindihan sengaja...')
  const firstLectId = Object.values(pensyarahIds)[0]
  const firstModulId = Object.values(modulIds)[0]
  const secondModulId = Object.values(modulIds)[1] || firstModulId
  const thirdModulId = Object.values(modulIds)[2] || firstModulId
  const firstBilikId = bilikArr[0][1]
  const secondBilikId = bilikArr[1][1]
  const secondLectId = Object.values(pensyarahIds)[1] || firstLectId
  const thirdLectId = Object.values(pensyarahIds)[2] || firstLectId
  const fourthModulId = Object.values(modulIds)[3] || firstModulId
  const fifthModulId = Object.values(modulIds)[4] || firstModulId

  // Clash 1: same lecturer, overlapping time
  slotData.push({ id: genId('slot'), modulId: secondModulId, pensyarahId: firstLectId, bilikId: firstBilikId, hari: 'ISNIN', masaMula: '08:00', masaTamat: '10:00', isDummy: true })
  slotData.push({ id: genId('slot'), modulId: thirdModulId, pensyarahId: firstLectId, bilikId: secondBilikId, hari: 'ISNIN', masaMula: '09:00', masaTamat: '11:00', isDummy: true })
  // Clash 2: same room, overlapping time
  slotData.push({ id: genId('slot'), modulId: fourthModulId, pensyarahId: secondLectId, bilikId: firstBilikId, hari: 'SELASA', masaMula: '10:00', masaTamat: '12:00', isDummy: true })
  slotData.push({ id: genId('slot'), modulId: fifthModulId, pensyarahId: thirdLectId, bilikId: firstBilikId, hari: 'SELASA', masaMula: '11:00', masaTamat: '12:00', isDummy: true })

  await db.slotJadual.createMany({ data: slotData })
  console.log(`  ✓ ${slotData.length} slot dicipta (termasuk pertindihan sengaja)`)

  // ---------- 7. Permohonan Pertukaran ----------
  console.log('📝 Mencipta permohonan pertukaran...')
  const firstSlotId = slotData[0]?.id
  if (firstSlotId) {
    await db.permohonanPertukaran.createMany({
      data: [
        {
          id: genId('permohonan'),
          pensyarahId: firstLectId,
          slotAsalId: firstSlotId,
          slotCadanganHari: 'RABU',
          slotCadanganMasaMula: '14:00',
          slotCadanganMasaTamat: '16:00',
          alasan: 'Terdiri majlis rasmi MARA pada hari tersebut.',
          status: 'MENUNGGU',
          sumber: 'MANUAL',
        },
        {
          id: genId('permohonan'),
          pensyarahId: secondLectId,
          slotAsalId: firstSlotId,
          slotCadanganHari: 'KHAMIS',
          slotCadanganMasaMula: '08:00',
          slotCadanganMasaTamat: '10:00',
          alasan: 'Cuti sakit dijadualkan (susulan).',
          status: 'MENUNGGU',
          sumber: 'JOTFORM',
        },
      ],
    })
  }

  // ---------- 8. Users ----------
  console.log('🔐 Mencipta pengguna...')
  const defaultPassword = await hashPassword('AstS@2026')
  await db.user.createMany({
    data: [
      { id: genId('user'), name: 'Dr. Hj. Ismail bin Abdullah', email: 'timbalan@adtecjitra.gov.my', passwordHash: defaultPassword, role: 'TIMBALAN_PENGARAH', isDummy: true },
      { id: genId('user'), name: 'Puan Rosnani binti Aziz', email: 'hea@adtecjitra.gov.my', passwordHash: defaultPassword, role: 'HEA', isDummy: true },
      { id: genId('user'), name: 'En. Ahmad Faizal bin Rahman', email: 'ketua.dte@adtecjitra.gov.my', passwordHash: defaultPassword, role: 'KETUA_KURSUS', kursusId: kursusIds['DTE'], isDummy: true },
      { id: genId('user'), name: 'En. Rajesh a/l Kumaran', email: 'ketua.dict@adtecjitra.gov.my', passwordHash: defaultPassword, role: 'KETUA_KURSUS', kursusId: kursusIds['DICT'], isDummy: true },
      { id: genId('user'), name: 'Puan Siti Aishah binti Abdullah', email: 'pensyarah1@adtecjitra.gov.my', passwordHash: defaultPassword, role: 'PENSYARAH', pensyarahId: pensyarahIds['Siti Aishah binti Abdullah'], isDummy: true },
      { id: genId('user'), name: 'En. Tan Mei Ling', email: 'pensyarah2@adtecjitra.gov.my', passwordHash: defaultPassword, role: 'PENSYARAH', pensyarahId: pensyarahIds['Tan Mei Ling'], isDummy: true },
      { id: genId('user'), name: 'En. Suresh a/l Raman (IT)', email: 'admin@adtecjitra.gov.my', passwordHash: defaultPassword, role: 'IT', isDummy: true },
    ],
  })

  console.log('\n✅ SEED SELESAI!')
  console.log(`   - 7 kursus, 28 kumpulan, ${modulData.length} modul`)
  console.log(`   - ${uniquePensyarah.length} pensyarah (4 merentasi 2 kursus)`)
  console.log(`   - 12 bilik, ${slotData.length} slot jadual (dengan pertindihan sengaja)`)
  console.log('   - 7 pengguna dengan peranan berbeza')
  console.log('\n🔐 Akaun log masuk (kata laluan: AstS@2026):')
  console.log('   - timbalan@adtecjitra.gov.my (Timbalan Pengarah)')
  console.log('   - hea@adtecjitra.gov.my (HEA)')
  console.log('   - ketua.dte@adtecjitra.gov.my (Ketua Kursus DTE)')
  console.log('   - ketua.dict@adtecjitra.gov.my (Ketua Kursus DICT)')
  console.log('   - pensyarah1@adtecjitra.gov.my (Pensyarah)')
  console.log('   - admin@adtecjitra.gov.my (IT)')
}

main()
  .catch((e) => {
    console.error('❌ Ralat seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
