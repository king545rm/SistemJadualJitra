import pg from 'pg'
import { readFileSync } from 'fs'

const client = new pg.Client({
  host: 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.naojxsvfrnxbodpznbzq',
  password: 'Rmsupa1062!@',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  query_timeout: 60000,
})

console.log('Connecting to Supabase (ap-northeast-1 pooler, port 6543)...')
await client.connect()
console.log('✓ Connected!')

const sql = readFileSync('/tmp/migration.sql', 'utf-8')
console.log('Executing migration SQL (' + sql.length + ' bytes)...')

// Remove comment lines, then split by semicolons
const cleanSql = sql
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
const statements = cleanSql
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0)

let count = 0
for (const stmt of statements) {
  try {
    await client.query(stmt)
    count++
    const preview = stmt.replace(/\s+/g, ' ').substring(0, 60)
    console.log(`  ✓ [${count}] ${preview}...`)
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log(`  ⊙ Already exists: ${stmt.replace(/\s+/g, ' ').substring(0, 60)}...`)
    } else {
      console.error(`  ✗ Error: ${e.message}`)
      console.error(`    Statement: ${stmt.substring(0, 100)}`)
    }
  }
}

console.log(`\n✅ Migration complete! ${count} statements executed.`)
await client.end()
