import pg from 'pg'

const client = new pg.Client({
  host: 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.naojxsvfrnxbodpznbzq',
  password: 'Rmsupa1062!@',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  query_timeout: 30000,
})

await client.connect()

const tables = ['User', 'Kursus', 'KumpulanSemester', 'Modul', 'Pensyarah', 'PensyarahModul', 'PensyarahKursus', 'Bilik', 'SlotJadual', 'PermohonanPertukaran', 'AuditLog']
for (const t of tables) {
  const res = await client.query(`SELECT COUNT(*) as count FROM "${t}"`)
  console.log(`${t}: ${res.rows[0].count} rows`)
}

// If there's partial data, clean it all
const shouldClean = process.argv.includes('--clean')
if (shouldClean) {
  console.log('\n🧹 Cleaning all data...')
  const deleteOrder = ['AuditLog', 'PermohonanPertukaran', 'SlotJadual', 'PensyarahModul', 'PensyarahKursus', 'Modul', 'KumpulanSemester', 'Pensyarah', 'Bilik', 'Kursus', 'User']
  for (const t of deleteOrder) {
    await client.query(`DELETE FROM "${t}"`)
    console.log(`  ✓ ${t} cleared`)
  }
  // Reset sequences (not needed for cuid, but good practice)
  console.log('✅ All data cleaned.')
}

await client.end()
