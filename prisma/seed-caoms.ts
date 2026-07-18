/* eslint-disable @typescript-eslint/no-explicit-any */
// CAOMS — CKT Adik Order Management System seed script (optimized batch inserts)
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

let idn = 0
const genId = (p: string) => `${p}${++idn}`

// Menu items for CKT Adik
const MENU_ITEMS = [
  // Mee / Kuey Teow
  { nama: 'Char Kuey Teow Biasa', kod: 'CKT-01', kategori: 'MEE_KUEY_TEOW', harga: 8.00, deskripsi: 'CKT klasik dengan udang, kerang & taugeh' },
  { nama: 'Char Kuey Teow Special', kod: 'CKT-02', kategori: 'MEE_KUEY_TEOW', harga: 12.00, deskripsi: 'CKT dengan udang besar, ketam & telur pindang' },
  { nama: 'Char Kuey Teow Ayam', kod: 'CKT-03', kategori: 'MEE_KUEY_TEOW', harga: 9.00, deskripsi: 'CKT dengan hirisan ayam' },
  { nama: 'Kuey Teow Goreng Basah', kod: 'CKT-04', kategori: 'MEE_KUEY_TEOW', harga: 8.50, deskripsi: 'Kuey teow berkuah' },
  { nama: 'Mee Goreng', kod: 'CKT-05', kategori: 'MEE_KUEY_TEOW', harga: 8.00, deskripsi: 'Mee kuning goreng' },
  { nama: 'Mee Hoon Goreng', kod: 'CKT-06', kategori: 'MEE_KUEY_TEOW', harga: 8.00, deskripsi: 'Mee hoon goreng' },
  { nama: 'Kuetiau Kungfu', kod: 'CKT-07', kategori: 'MEE_KUEY_TEOW', harga: 10.00, deskripsi: 'Kuetiau goreng tahi lalat (kungfu style)' },
  // Nasi
  { nama: 'Nasi Goreng Kampung', kod: 'NSI-01', kategori: 'NASI', harga: 9.00, deskripsi: 'Nasi goreng dengan ikan bilis & kangkung' },
  { nama: 'Nasi Goreng Ayam', kod: 'NSI-02', kategori: 'NASI', harga: 10.00, deskripsi: 'Nasi goreng dengan hirisan ayam' },
  { nama: 'Nasi Pattaya', kod: 'NSI-03', kategori: 'NASI', harga: 11.00, deskripsi: 'Nasi terbungkus telur' },
  { nama: 'Nasi Lemak Special', kod: 'NSI-04', kategori: 'NASI', harga: 12.00, deskripsi: 'Nasi lemak dengan ayam goreng, telur & sambal' },
  // Minuman
  { nama: 'Air Tebu', kod: 'MNM-01', kategori: 'MINUMAN', harga: 3.50, deskripsi: 'Jus tebu segar' },
  { nama: 'Teh O Ais', kod: 'MNM-02', kategori: 'MINUMAN', harga: 2.50, deskripsi: 'Teh o ais' },
  { nama: 'Teh Tarik', kod: 'MNM-03', kategori: 'MINUMAN', harga: 3.00, deskripsi: 'Teh tarik tradisional' },
  { nama: 'Kopi O', kod: 'MNM-04', kategori: 'MINUMAN', harga: 2.50, deskripsi: 'Kopi o panas' },
  { nama: 'Kopi Ais', kod: 'MNM-05', kategori: 'MINUMAN', harga: 3.50, deskripsi: 'Kopi ais' },
  { nama: 'Air Sirap Ais', kod: 'MNM-06', kategori: 'MINUMAN', harga: 2.50, deskripsi: 'Sirap bandung ais' },
  { nama: 'Barli Ais', kod: 'MNM-07', kategori: 'MINUMAN', harga: 2.50, deskripsi: 'Air barli ais' },
  { nama: 'Soya Ais', kod: 'MNM-08', kategori: 'MINUMAN', harga: 3.00, deskripsi: 'Susu soya ais' },
  // Snek
  { nama: 'Karipap', kod: 'SNK-01', kategori: 'SNEK', harga: 1.50, deskripsi: 'Karipap kentang' },
  { nama: 'Popia Goreng', kod: 'SNK-02', kategori: 'SNEK', harga: 2.00, deskripsi: 'Popia goreng' },
  { nama: 'Keropok Lekor', kod: 'SNK-03', kategori: 'SNEK', harga: 3.00, deskripsi: 'Keropok lekor Terengganu' },
  { nama: 'Roti Bakar', kod: 'SNK-04', kategori: 'SNEK', harga: 3.50, deskripsi: 'Roti bakar dengan kaya & butter' },
  // Tambahan (add-ons)
  { nama: 'Telur Mata', kod: 'TMB-01', kategori: 'TAMBAHAN', harga: 1.50, deskripsi: 'Telur mata goreng' },
  { nama: 'Telur Pindang', kod: 'TMB-02', kategori: 'TAMBAHAN', harga: 2.00, deskripsi: 'Telur pindang' },
  { nama: 'Extra Udang', kod: 'TMB-03', kategori: 'TAMBAHAN', harga: 3.00, deskripsi: 'Tambah udang' },
  { nama: 'Extra Kerang', kod: 'TMB-04', kategori: 'TAMBAHAN', harga: 2.00, deskripsi: 'Tambah kerang' },
  { nama: 'Extra Pedas', kod: 'TMB-05', kategori: 'TAMBAHAN', harga: 0.00, deskripsi: 'Tambah cili pedas (percuma)' },
]

const PELANGGAN_TETAP = [
  { nama: 'Ahmad Salleh', telefon: '0123456789', catatan: 'Pelanggan tetap — suka CKT Special extra pedas' },
  { nama: 'Rohaya Ibrahim', telefon: '0139876543', catatan: 'Selalu order bungkus tengahari' },
  { nama: 'Tan Wei Loon', telefon: '0145678901', catatan: 'Alahan udang — jangan letak udang' },
  { nama: 'Siti Khadijah', telefon: '0156789012', catatan: 'CKT tanpa taugeh' },
  { nama: 'Raj Kumar', telefon: '0167890123', catatan: 'Suka tambah telur pindang' },
  { nama: 'Lim Chee Keong', telefon: '0178901234', catatan: 'Pesanan delivery kerap' },
]

async function main() {
  console.log('🧹 Membersihkan data lama...')
  const delOrder = ['AuditLog', 'OrderItem', 'Pesanan', 'Pelanggan', 'Menu', 'User']
  for (const t of delOrder) await db.$executeRawUnsafe(`DELETE FROM "${t}"`)
  console.log('✓ Data lama dibersihkan.')

  // ---------- 1. Menu ----------
  console.log(`🍽️ Mencipta ${MENU_ITEMS.length} item menu...`)
  const menuIds: Record<string, string> = {}
  const menuData = MENU_ITEMS.map((m) => {
    const id = genId('menu')
    menuIds[m.kod] = id
    return { id, nama: m.nama, kod: m.kod, kategori: m.kategori, harga: m.harga, deskripsi: m.deskripsi, tersedia: true, isDummy: true }
  })
  await db.menu.createMany({ data: menuData })

  // ---------- 2. Pelanggan ----------
  console.log(`👥 Mencipta ${PELANGGAN_TETAP.length} pelanggan tetap...`)
  const pelangganIds: Record<string, string> = {}
  const pelangganData = PELANGGAN_TETAP.map((p) => {
    const id = genId('plg')
    pelangganIds[p.telefon] = id
    return { id, nama: p.nama, telefon: p.telefon, catatan: p.catatan, isDummy: true }
  })
  await db.pelanggan.createMany({ data: pelangganData })

  // ---------- 3. Pesanan (sample orders across today & past days) ----------
  console.log('📝 Mencipta pesanan contoh...')

  const ordersData: any[] = []
  const orderItemsData: any[] = []
  let orderCounter = 0

  // Generate orders for the past 7 days
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const dayDate = new Date()
    dayDate.setDate(dayDate.getDate() - dayOffset)
    dayDate.setHours(0, 0, 0, 0)
    const numOrders = dayOffset === 0 ? 8 : 15 + Math.floor(Math.random() * 10) // today: 8, past days: 15-24

    for (let i = 0; i < numOrders; i++) {
      orderCounter++
      const id = genId('psn')
      const hour = 10 + Math.floor(Math.random() * 12) // 10am - 10pm
      const min = Math.floor(Math.random() * 60)
      const waktuPesanan = new Date(dayDate)
      waktuPesanan.setHours(hour, min, 0, 0)
      const noPesanan = `ORD-${String(orderCounter).padStart(3, '0')}`

      const jenis = ['DINE_IN', 'BUNGKUS', 'DELIVERY'][Math.floor(Math.random() * 3)]
      const mejaNama = jenis === 'DINE_IN' ? `Meja ${Math.floor(Math.random() * 10) + 1}` : jenis === 'BUNGKUS' ? `Bungkus ${orderCounter}` : `Delivery ${orderCounter}`

      // Random items: 1-4 items per order
      const numItems = 1 + Math.floor(Math.random() * 4)
      const chosenItems: any[] = []
      let jumlah = 0
      for (let j = 0; j < numItems; j++) {
        const m = MENU_ITEMS[Math.floor(Math.random() * MENU_ITEMS.length)]
        if (m.kategori === 'TAMBAHAN' && chosenItems.length === 0) continue // add-on only if main item exists
        const kuantiti = 1 + Math.floor(Math.random() * 3)
        const subtotal = m.harga * kuantiti
        jumlah += subtotal
        chosenItems.push({ menuId: menuIds[m.kod], namaSewaktu: m.nama, hargaSewaktu: m.harga, kuantiti, subtotal, nota: Math.random() > 0.7 ? 'tak nak taugeh' : null })
      }
      if (chosenItems.length === 0) {
        const m = MENU_ITEMS[0]
        const kuantiti = 1
        const subtotal = m.harga
        jumlah = subtotal
        chosenItems.push({ menuId: menuIds[m.kod], namaSewaktu: m.nama, hargaSewaktu: m.harga, kuantiti, subtotal, nota: null })
      }

      // Status based on age
      let status = 'DIAMBIL'
      let waktuSiap = new Date(waktuPesanan.getTime() + 10 * 60000)
      let waktuAmbil = new Date(waktuPesanan.getTime() + 15 * 60000)
      if (dayOffset === 0) {
        // Today: mix of statuses
        if (i < 3) { status = 'DITERIMA' }
        else if (i < 5) { status = 'DIMASAK' }
        else if (i < 6) { status = 'SIAP'; waktuAmbil = null }
        else { status = 'DIAMBIL' }
      }

      // Some orders are long-pending (for alert testing)
      if (dayOffset === 0 && i === 0) {
        // Make this one 30 min old (red alert)
        const oldTime = new Date(Date.now() - 30 * 60000)
        waktuPesanan.setTime(oldTime.getTime())
        status = 'DIMASAK'
      }

      const pelangganId = Math.random() > 0.6 ? pelangganIds[PELANGGAN_TETAP[Math.floor(Math.random() * PELANGGAN_TETAP.length)].telefon] : null
      const jumlahDibayar = status === 'DIAMBIL' ? jumlah : Math.random() > 0.5 ? jumlah : 0

      ordersData.push({
        id,
        noPesanan,
        jenis,
        mejaNama,
        pelangganId,
        status,
        jumlah,
        jumlahDibayar,
        baki: jumlah - jumlahDibayar,
        catatan: Math.random() > 0.8 ? 'Pesonan urgent' : null,
        waktuPesanan,
        waktuSiap: status !== 'DITERIMA' && status !== 'DIMASAK' ? waktuSiap : null,
        waktuAmbil: status === 'DIAMBIL' ? waktuAmbil : null,
        diambilOleh: null,
        isDummy: true,
      })

      for (const item of chosenItems) {
        orderItemsData.push({ id: genId('itm'), pesananId: id, ...item, createdAt: waktuPesanan })
      }
    }
  }

  await db.pesanan.createMany({ data: ordersData })
  await db.orderItem.createMany({ data: orderItemsData })
  console.log(`  ✓ ${ordersData.length} pesanan, ${orderItemsData.length} item dicipta`)

  // ---------- 4. Users ----------
  console.log('🔐 Mencipta pengguna...')
  const defaultPassword = await hashPassword('CktAdik2026!')
  await db.user.createMany({
    data: [
      { id: genId('usr'), name: 'Adik (Pemilik)', email: 'pemilik@cktadik.my', passwordHash: defaultPassword, role: 'PEMILIK', isDummy: true },
      { id: genId('usr'), name: 'Aisyah (Kaunter)', email: 'kaunter@cktadik.my', passwordHash: defaultPassword, role: 'KAUNTER', isDummy: true },
      { id: genId('usr'), name: 'Kassim (Dapur)', email: 'dapur@cktadik.my', passwordHash: defaultPassword, role: 'DAPUR', isDummy: true },
      { id: genId('usr'), name: 'Noraini (Kaunter 2)', email: 'kaunter2@cktadik.my', passwordHash: defaultPassword, role: 'KAUNTER', isDummy: true },
    ],
  })

  console.log('\n✅ SEED SELESAI!')
  console.log(`   - ${MENU_ITEMS.length} item menu (5 kategori)`)
  console.log(`   - ${PELANGGAN_TETAP.length} pelanggan tetap`)
  console.log(`   - ${ordersData.length} pesanan (7 hari termasuk hari ini)`)
  console.log(`   - ${orderItemsData.length} item pesanan`)
  console.log('   - 4 pengguna (1 pemilik, 2 kaunter, 1 dapur)')
  console.log('\n🔐 Akaun log masuk (kata laluan: CktAdik2026!):')
  console.log('   - pemilik@cktadik.my (Pemilik — akses penuh)')
  console.log('   - kaunter@cktadik.my (Pekerja Kaunter)')
  console.log('   - dapur@cktadik.my (Pekerja Dapur)')
  console.log('   - kaunter2@cktadik.my (Pekerja Kaunter 2)')
}

main()
  .catch((e) => { console.error('❌ Ralat seed:', e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
