/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

// ASTS - Dummy data seeder
// 7 courses, 4 semester groups each (28 total), modules, lecturers (some cross-course), rooms,
// schedule slots with INTENTIONAL clashes to verify clash detection, users for all roles.

const HARI = ['ISNIN', 'SELASA', 'RABU', 'KHAMIS', 'JUMAAT']

interface SeedKursus {
  nama: string
  kod: string
  deskripsi: string
}

const KURSUS_LIST: SeedKursus[] = [
  { nama: 'Diploma Teknologi Elektrik', kod: 'DTE', deskripsi: 'Latihan dalam sistem elektrik, wiring & maintenance.' },
  { nama: 'Diploma Teknologi Mekanikal', kod: 'DTM', deskripsi: 'Latihan dalam mesin, CNC dan fabrikasi logam.' },
  { nama: 'Diploma Teknologi ICT', kod: 'DICT', deskripsi: 'Latihan dalam rangkaian, pengaturcaraan & sistem.' },
  { nama: 'Diploma Teknologi Elektronik', kod: 'DTEL', deskripsi: 'Latihan dalam elektronik analog & digital.' },
  { nama: 'Diploma Teknologi Pembuatan', kod: 'DTP', deskripsi: 'Latihan dalam automasi & pengurusan pembuatan.' },
  { nama: 'Diploma Teknologi Kimpalan', kod: 'DTK', deskripsi: 'Latihan dalam kimpalan arka, TIG & MIG.' },
  { nama: 'Diploma Teknologi Automotif', kod: 'DTA', deskripsi: 'Latihan dalam enjin, transmisi & diagnostik kenderaan.' },
]

// Module templates per course. Each course has core + general modules.
// General modules (shared across courses) for cross-course lecturer clash testing.
const MODUL_UMUM_TEMPLATE = [
  { kod: 'BM', nama: 'Bahasa Melayu Komunikasi', jamKredit: 2, jamKontak: 3 },
  { kod: 'PI', nama: 'Pendidikan Islam', jamKredit: 2, jamKontak: 2 },
  { kod: 'PM', nama: 'Pendidikan Moral', jamKredit: 2, jamKontak: 2 },
  { kod: 'KK', nama: 'Kokurikulum', jamKredit: 1, jamKontak: 2 },
  { kod: 'PK', nama: 'Pengajian Malaysia', jamKredit: 2, jamKontak: 2 },
]

const MODUL_TERAS_BY_KURSUS: Record<string, Array<{ kod: string; nama: string; jamKredit: number; jamKontak: number }>> = {
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
  // Delete in dependency order
  await db.auditLog.deleteMany()
  await db.permohonanPertukaran.deleteMany()
  await db.slotJadual.deleteMany()
  await db.pensyarahModul.deleteMany()
  await db.pensyarahKursus.deleteMany()
  await db.modul.deleteMany()
  await db.kumpulanSemester.deleteMany()
  await db.pensyarah.deleteMany()
  await db.bilik.deleteMany()
  await db.kursus.deleteMany()
  await db.user.deleteMany()
  console.log('✓ Data lama dibersihkan.')

  // ---------- 1. Kursus ----------
  console.log('📚 Mencipta 7 kursus...')
  const kursusMap = new Map<string, string>()
  for (const k of KURSUS_LIST) {
    const created = await db.kursus.create({
      data: { namaKursus: k.nama, kodKursus: k.kod, deskripsi: k.deskripsi, isDummy: true },
    })
    kursusMap.set(k.kod, created.id)
  }

  // ---------- 2. Kumpulan Semester (4 per course = 28 total) ----------
  console.log('👥 Mencipta 28 kumpulan semester...')
  const kumpulanMap = new Map<string, string>() // key: `${kursuskod}-sem${n}`
  const statuses = ['BELAJAR', 'BELAJAR', 'BELAJAR', 'LATIHAN_INDUSTRI']
  for (const [kod, kursusId] of kursusMap.entries()) {
    for (let sem = 1; sem <= 4; sem++) {
      const created = await db.kumpulanSemester.create({
        data: {
          kursusId,
          semesterNo: sem,
          bilPelajar: 25 + Math.floor(Math.random() * 16), // 25-40
          status: statuses[sem - 1],
          kohortNama: `Kohort ${2024 + Math.floor((sem - 1) / 2)}/${2026 + Math.floor((sem - 1) / 2)}`,
          isDummy: true,
        },
      })
      kumpulanMap.set(`${kod}-sem${sem}`, created.id)
    }
  }

  // ---------- 3. Bilik ----------
  console.log('🏫 Mencipta 12 bilik/makmal/bengkel...')
  const bilikMap = new Map<string, string>()
  for (const b of BILIK_LIST) {
    const created = await db.bilik.create({
      data: { namaBilik: b.nama, jenis: b.jenis, kapasiti: b.kapasiti, isDummy: true },
    })
    bilikMap.set(b.nama, created.id)
  }

  // ---------- 4. Pensyarah (assign expertise per course) ----------
  console.log('👨‍🏫 Mencipta pensyarah...')
  const pensyarahMap = new Map<string, string>() // name -> id
  const pensyarahKursusLinks: Array<{ pensyarahId: string; kursusId: string }> = []
  const pensyarahModulLinks: Array<{ pensyarahId: string; modulId: string }> = []
  let pIdx = 0
  const usedNames = [...NAMA_PENSYARAH]

  for (const [kod, kursusId] of kursusMap.entries()) {
    const numLecturers = 5 // 5 per course
    const courseLecturerIds: string[] = []
    for (let i = 0; i < numLecturers; i++) {
      const name = usedNames[pIdx % usedNames.length]
      pIdx++
      const email = name.toLowerCase().replace(/[^a-z]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '') + '@adtecjitra.gov.my'
      const hadJam = 18 + Math.floor(Math.random() * 8) // 18-25
      const created = await db.pensyarah.create({
        data: {
          nama: name,
          email,
          telefon: `01${Math.floor(Math.random() * 9)}-${Math.floor(1000000 + Math.random() * 9000000)}`,
          kepakaran: JSON.stringify([kod, ...MODUL_TERAS_BY_KURSUS[kod].slice(0, 3).map((m) => m.nama)]),
          hadJamMaksimum: hadJam,
          isDummy: true,
        },
      })
      pensyarahMap.set(name, created.id)
      courseLecturerIds.push(created.id)
      pensyarahKursusLinks.push({ pensyarahId: created.id, kursusId })
    }
  }

  // Add cross-course lecturers: pick 4 lecturers to teach in 2 courses (forces clash potential)
  console.log('🔗 Menambah pensyarah merentasi kursus (untuk ujian pertindihan)...')
  const allLecturers = Array.from(pensyarahMap.entries())
  const crossCoursePairs = [
    { from: 'DTE', to: 'DTEL' },
    { from: 'DTM', to: 'DTP' },
    { from: 'DICT', to: 'DTEL' },
    { from: 'DTA', to: 'DTM' },
  ]
  const sharedLecturers: string[] = [] // names of lecturers teaching >1 course
  for (const pair of crossCoursePairs) {
    // find a lecturer in 'from' course
    const fromLects = allLecturers.filter(([n]) => {
      // detect via email domain matching? simpler: rotate
      return true
    })
    const idx = crossCoursePairs.indexOf(pair)
    const picked = fromLects[idx * 5] // spread out
    if (picked) {
      const toKursusId = kursusMap.get(pair.to)!
      pensyarahKursusLinks.push({ pensyarahId: picked[1], kursusId: toKursusId })
      sharedLecturers.push(picked[0])
    }
  }

  // Bulk insert pensyarah-kursus links
  for (const link of pensyarahKursusLinks) {
    await db.pensyarahKursus.create({ data: link })
  }

  // ---------- 5. Modul (up to 10 per kumpulan: core + general) ----------
  console.log('📖 Mencipta modul untuk setiap kumpulan semester...')
  const modulMap = new Map<string, string>() // key: `${kod}-sem${n}-${modulKod}`
  for (const [kod, kursusId] of kursusMap.entries()) {
    const terasList = MODUL_TERAS_BY_KURSUS[kod]
    for (let sem = 1; sem <= 4; sem++) {
      const kumpulanId = kumpulanMap.get(`${kod}-sem${sem}`)!
      // pick up to 6 core modules for this semester
      const terasForSem = terasList.slice((sem - 1) * 2, (sem - 1) * 2 + 4)
      // pick 3 general modules
      const umumForSem = [MODUL_UMUM_TEMPLATE[0], MODUL_UMUM_TEMPLATE[(sem) % MODUL_UMUM_TEMPLATE.length], MODUL_UMUM_TEMPLATE[4]]
      const allMods = [
        ...terasForSem.map((m) => ({ ...m, kategori: 'TERAS' as const })),
        ...umumForSem.map((m) => ({ ...m, kategori: 'UMUM' as const, kod: `${m.kod}-${kod}-S${sem}` })),
      ]
      for (const m of allMods) {
        const created = await db.modul.create({
          data: {
            kumpulanId,
            namaModul: m.nama,
            kodModul: m.kod,
            kategori: m.kategori,
            jamKredit: m.jamKredit,
            jamKontakMingguan: m.jamKontak,
            isDummy: true,
          },
        })
        modulMap.set(`${kod}-sem${sem}-${m.kod}`, created.id)
      }
    }
  }

  // ---------- 6. Link pensyarah to modul ----------
  console.log('🔗 Menghubungkan pensyarah ke modul...')
  const allModuls = await db.modul.findMany({ include: { kumpulan: { include: { kursus: true } } } })
  for (const modul of allModuls) {
    const kursusId = modul.kumpulan.kursusId
    // find lecturers of this course
    const lects = pensyarahKursusLinks.filter((l) => l.kursusId === kursusId).map((l) => l.pensyarahId)
    if (lects.length === 0) continue
    // assign 1-2 lecturers per module
    const assigned = lects.slice(0, 1 + (Math.floor(Math.random() * 2)))
    for (const lId of assigned) {
      pensyarahModulLinks.push({ pensyarahId: lId, modulId: modul.id })
    }
  }
  for (const link of pensyarahModulLinks) {
    await db.pensyarahModul.create({ data: link })
  }

  // ---------- 7. Slot Jadual ----------
  console.log('📅 Mencipta slot jadual (dengan pertindihan sengaja)...')
  const TIME_BLOCKS = [
    ['08:00', '10:00'],
    ['10:00', '12:00'],
    ['14:00', '16:00'],
    ['16:00', '17:00'],
  ]
  const roomList = Array.from(bilikMap.entries())
  const modulArr = allModuls
  let slotsCreated = 0
  // For each module, create 1-2 weekly slots based on jamKontak
  for (const modul of modulArr) {
    const lects = pensyarahModulLinks.filter((l) => l.modulId === modul.id).map((l) => l.pensyarahId)
    if (lects.length === 0) continue
    const numSlots = modul.jamKontakMingguan >= 4 ? 2 : 1
    for (let s = 0; s < numSlots; s++) {
      const hari = HARI[(slotsCreated + s) % 5]
      const [mula, tamat] = TIME_BLOCKS[(slotsCreated + s) % TIME_BLOCKS.length]
      const bilik = roomList[(slotsCreated) % roomList.length][1]
      const pensyarahId = lects[s % lects.length]
      await db.slotJadual.create({
        data: {
          modulId: modul.id,
          pensyarahId,
          bilikId: bilik,
          hari,
          masaMula: mula,
          masaTamat: tamat,
          isDummy: true,
        },
      })
      slotsCreated++
    }
  }

  // INTENTIONAL clashes for verification
  console.log('⚠️ Mencipta pertindihan sengaja untuk pengesanan...')
  const firstLecturer = allLecturers[0]
  if (firstLecturer) {
    const someModul = modulArr[0]
    const someBilik = roomList[0][1]
    // Clash 1: same lecturer, same time, different module
    await db.slotJadual.create({
      data: {
        modulId: modulArr[1]?.id ?? someModul.id,
        pensyarahId: firstLecturer[1],
        bilikId: someBilik,
        hari: 'ISNIN',
        masaMula: '08:00',
        masaTamat: '10:00',
        isDummy: true,
      },
    })
    await db.slotJadual.create({
      data: {
        modulId: modulArr[2]?.id ?? someModul.id,
        pensyarahId: firstLecturer[1],
        bilikId: roomList[1][1],
        hari: 'ISNIN',
        masaMula: '09:00',
        masaTamat: '11:00',
        isDummy: true,
      },
    })
    // Clash 2: same room, same time
    await db.slotJadual.create({
      data: {
        modulId: modulArr[3]?.id ?? someModul.id,
        pensyarahId: allLecturers[1]?.[1] ?? firstLecturer[1],
        bilikId: someBilik,
        hari: 'SELASA',
        masaMula: '10:00',
        masaTamat: '12:00',
        isDummy: true,
      },
    })
    await db.slotJadual.create({
      data: {
        modulId: modulArr[4]?.id ?? someModul.id,
        pensyarahId: allLecturers[2]?.[1] ?? firstLecturer[1],
        bilikId: someBilik,
        hari: 'SELASA',
        masaMula: '11:00',
        masaTamat: '12:00',
        isDummy: true,
      },
    })
  }

  // ---------- 8. Permohonan Pertukaran (sample) ----------
  console.log('📝 Mencipta permohonan pertukaran contoh...')
  const sampleSlot = await db.slotJadual.findFirst()
  if (sampleSlot && firstLecturer) {
    await db.permohonanPertukaran.create({
      data: {
        pensyarahId: firstLecturer[1],
        slotAsalId: sampleSlot.id,
        slotCadanganHari: 'RABU',
        slotCadanganMasaMula: '14:00',
        slotCadanganMasaTamat: '16:00',
        alasan: 'Terdiri majlis rasmi MARA pada hari tersebut.',
        status: 'MENUNGGU',
        sumber: 'MANUAL',
      },
    })
    await db.permohonanPertukaran.create({
      data: {
        pensyarahId: allLecturers[1]?.[1] ?? firstLecturer[1],
        slotAsalId: sampleSlot.id,
        slotCadanganHari: 'KHAMIS',
        slotCadanganMasaMula: '08:00',
        slotCadanganMasaTamat: '10:00',
        alasan: 'Cuti sakit dijadualkan (susulan).',
        status: 'MENUNGGU',
        sumber: 'JOTFORM',
      },
    })
  }

  // ---------- 9. Users (one per role + extras) ----------
  console.log('🔐 Mencipta pengguna dengan peranan berbeza...')
  const defaultPassword = await hashPassword('AstS@2026')
  const usersToCreate = [
    { name: 'Dr. Hj. Ismail bin Abdullah', email: 'timbalan@adtecjitra.gov.my', role: 'TIMBALAN_PENGARAH' },
    { name: 'Puan Rosnani binti Aziz', email: 'hea@adtecjitra.gov.my', role: 'HEA' },
    { name: 'En. Ahmad Faizal bin Rahman', email: 'ketua.dte@adtecjitra.gov.my', role: 'KETUA_KURSUS', kursusKod: 'DTE' },
    { name: 'En. Rajesh a/l Kumaran', email: 'ketua.dict@adtecjitra.gov.my', role: 'KETUA_KURSUS', kursusKod: 'DICT' },
    { name: 'Puan Siti Aishah binti Abdullah', email: 'pensyarah1@adtecjitra.gov.my', role: 'PENSYARAH', pensyarahNama: 'Siti Aishah binti Abdullah' },
    { name: 'En. Tan Mei Ling', email: 'pensyarah2@adtecjitra.gov.my', role: 'PENSYARAH', pensyarahNama: 'Tan Mei Ling' },
    { name: 'En. Suresh a/l Raman (IT)', email: 'admin@adtecjitra.gov.my', role: 'IT' },
  ]
  for (const u of usersToCreate) {
    await db.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash: defaultPassword,
        role: u.role,
        kursusId: u.kursusKod ? kursusMap.get(u.kursusKod) : null,
        pensyarahId: u.pensyarahNama ? pensyarahMap.get(u.pensyarahNama) ?? null : null,
        isDummy: true,
      },
    })
  }

  console.log('\n✅ SEED SELESAI!')
  console.log('   - 7 kursus')
  console.log('   - 28 kumpulan semester')
  console.log('   - ~190+ modul')
  console.log(`   - ${pensyarahMap.size} pensyarah (4 mengajar merentasi 2 kursus)`)
  console.log('   - 12 bilik/makmal/bengkel')
  console.log(`   - ${slotsCreated}+ slot jadual (dengan pertindihan sengaja)`)
  console.log('   - 7 pengguna dengan peranan berbeza')
  console.log('\n🔐 Akaun log masuk (kata laluan sama untuk semua: AstS@2026):')
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
