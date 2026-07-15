# ASTS — ADTEC Smart Timetable System

Sistem Penyusunan Jadual Kelas & Pensyarah untuk **ADTEC Jitra, Kedah** — Jabatan Tenaga Manusia (JTM), Malaysia.

Platform automasi berkuasa AI untuk menjana, menyemak dan mengoptimumkan jadual kelas serta peruntukan pensyarah secara automatik, bebas pertindihan (clash-free), dan mudah diselenggara.

---

## 📋 Tentang Sistem

ADTEC Jitra menawarkan **7 kursus/program** dengan struktur latihan sepanjang **4 semester (2 tahun)** ditambah **4 bulan latihan industri**. Sistem ini menguruskan:

- 7 kursus (DTE, DTM, DICT, DTEL, DTP, DTK, DTA)
- 4 kumpulan semester setiap kursus (28 kumpulan)
- Sehingga 10 modul setiap semester (Subjek Teras & Umum)
- 35+ pensyarah (termasuk yang mengajar merentasi kursus)
- 12 bilik/makmal/bengkel
- 277+ slot jadual mingguan

## ✨ Ciri Utama

| Fungsi | Penerangan |
|--------|------------|
| **F1–F4** | Pengurusan Kursus, Kumpulan Semester, Modul & Pensyarah |
| **F5** | Enjin Penjanaan Jadual Automatik (AI-assisted) |
| **F6** | Pengesanan & Pencegahan Pertindihan (Clash Detection) — Pensyarah, Bilik, Kumpulan |
| **F7** | 4 Paparan Jadual: Keseluruhan, Kursus, Pensyarah, Kumpulan |
| **F8** | Pengurusan Beban Tugas Mengajar (Teaching Load) |
| **F9** | Borang Permohonan Pertukaran Slot + aliran kelulusan |
| **F10** | Jejak Semester & Latihan Industri |
| **F11** | Log Audit Perubahan (Governance) |

## 🔐 Keselamatan

- **RBAC** — 5 peranan: Timbalan Pengarah, HEA, Ketua Kursus, Pensyarah, IT
- **Account lockout** — 5 percubaan gagal → kunci 15 minit
- **Rate limiting** — 10 percubaan log masuk seminit
- **Password policy** — minimum 8 aksara (huruf besar/kecil, nombor, aksara khas)
- **Bcrypt hashing** (12 rounds)
- **Session HMAC-signed** — tamper-proof, httpOnly cookies, 8-jam TTL
- **XSS sanitization** pada semua input
- **Audit log** — semua perubahan direkod dengan before/after JSON + IP

## 🎨 Reka Bentuk UI/UX

- **Glassmorphism** — frosted glass dengan backdrop-blur
- **Dark / Light mode**
- **Responsif** (mobile-first)
- **Kod warna intuitif**: 🟢 tiada konflik · 🔴 pertindihan · 🟡 hampir had jam mengajar
- Palet emerald (selaras identiti korporat MARA/ADTEC)

---

## 🛠️ Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| ORM | Prisma 6 |
| Auth | Custom (bcrypt + HMAC sessions + RBAC) |
| AI Engine | z-ai-web-dev-sdk (LLM) |
| Charts | Recharts |
| Drag & Drop | @dnd-kit/core |

---

## 🚀 Pemasangan Tempatan (Local Development)

### Prerequisites

- Node.js 18+ atau Bun 1.3+
- Akaun Supabase (database PostgreSQL)

### Langkah

1. **Clone repository**
   ```bash
   git clone https://github.com/king545rm/SistemJadualJitra.git
   cd SistemJadualJitra
   ```

2. **Install dependencies**
   ```bash
   bun install
   # atau: npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` dengan maklumat Supabase anda:
   - `DATABASE_URL` — connection string Supabase (lihat `.env.example` untuk format)
   - `SESSION_SECRET` — generate dengan `openssl rand -hex 32`

4. **Push database schema ke Supabase**
   ```bash
   bun run db:push
   # atau: npx prisma db push
   ```

5. **Seed data dummy**
   ```bash
   bun run prisma/seed-supabase.ts
   ```

6. **Start dev server**
   ```bash
   bun run dev
   ```
   Buka http://localhost:3000

### 🔑 Akaun Demo (kata laluan: `AstS@2026`)

| Emel | Peranan | Akses |
|------|--------|-------|
| `timbalan@adtecjitra.gov.my` | Timbalan Pengarah | Penuh — semua kursus & laporan |
| `hea@adtecjitra.gov.my` | HEA (Unit Akademik) | Selaras jadual keseluruhan |
| `ketua.dte@adtecjitra.gov.my` | Ketua Kursus DTE | Urus kursus sendiri |
| `ketua.dict@adtecjitra.gov.my` | Ketua Kursus DICT | Urus kursus sendiri |
| `pensyarah1@adtecjitra.gov.my` | Pensyarah | Lihat jadual + mohon pertukaran |
| `admin@adtecjitra.gov.my` | IT | Pentadbir sistem & pengguna |

---

## 📦 Deployment

### Vercel (Recommended untuk Next.js)

1. Fork/push repo ini ke GitHub
2. Pergi ke [vercel.com](https://vercel.com) → Import project dari GitHub
3. Tambah environment variables di Vercel:
   - `DATABASE_URL` — Supabase pooler connection string
   - `SESSION_SECRET` — random 32-char secret
4. Deploy — Vercel auto-detects Next.js

### Netlify

1. Push repo ke GitHub
2. Pergi ke [netlify.com](https://netlify.com) → Add new site → Import from Git
3. Build command: `next build`
4. Publish directory: `.next`
5. Tambah environment variables (sama seperti Vercel)
6. Deploy

> **Nota:** Pastikan Supabase connection string menggunakan **pooler** (port 6543) dengan `?pgbouncer=true` untuk deployment serverless.

---

## 🗄️ Konfigurasi Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Pergi ke **Project Settings → Database → Connection string**
3. Gunakan **Transaction pooler** (port 6543) — bukan direct connection (port 5432)
4. Format URL:
   ```
   postgresql://postgres.{PROJECT_REF}:{URL_ENCODED_PASSWORD}@aws-0-{REGION}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   ```
5. URL-encode password jika mengandungi aksara khas (cth: `!` → `%21`, `@` → `%40`)

### Setup Database

```bash
# Create all tables
bun run db:push

# Seed dummy data (7 kursus, 28 kumpulan, 182 modul, 35 pensyarah, 277 slot)
bun run prisma/seed-supabase.ts
```

---

## 📁 Struktur Projek

```
src/
├── app/
│   ├── api/              # API routes (auth, CRUD, clash-detection, AI generate)
│   ├── globals.css       # Glassmorphism design system
│   ├── layout.tsx        # Root layout + theme provider
│   └── page.tsx          # Auth gate (login / app shell)
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── sections/         # 11 main sections (dashboard, jadual, etc.)
│   ├── app-shell.tsx     # Sidebar nav + header + sticky footer
│   ├── login-screen.tsx  # Glassmorphism login
│   └── theme-provider.tsx
├── lib/
│   ├── auth.ts           # bcrypt, HMAC sessions, password policy
│   ├── rbac.ts           # Role-based access control
│   ├── security.ts       # Rate limiting, XSS sanitization
│   ├── session.ts        # Cookie session helpers
│   ├── audit.ts          # Audit logging
│   ├── clash-detection.ts # Core clash engine (F6)
│   ├── teaching-load.ts  # Load calculation (F8)
│   ├── db.ts             # Prisma client
│   ├── api-client.ts     # Frontend API helper
│   └── types.ts          # Shared TypeScript types
└── prisma/
    ├── schema.prisma     # Database schema (11 models)
    ├── seed-supabase.ts  # Optimized batch seed
    └── seed.ts           # SQLite seed (legacy)

```

---

## 📄 License

Projek kerajaan — Jabatan Tenaga Manusia (JTM), ADTEC Jitra, Kedah.

---

## 👥 Kontributor

- **Timbalan Pengarah, ADTEC Jitra** — Penyedia PRD
- **JTM IT Team** — Pembangunan & penyelenggaraan
