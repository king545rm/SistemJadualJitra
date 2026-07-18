# CAOMS — CKT Adik Order Management System

Sistem Rekod & Pengurusan Pesanan Pelanggan untuk **CKT Adik** — perniagaan Char Kue Teow.

Platform digital ringkas namun berkuasa AI untuk menerima, merekod dan menjejak setiap pesanan pelanggan secara sistematik — bagi memastikan **tiada seorang pun pelanggan tercicir**.

---

## 📋 Tentang Sistem

CKT Adik menjual Char Kue Teow serta pelbagai menu lain. Sistem ini menguruskan:

- 28 item menu (5 kategori: Mee/Kuey Teow, Nasi, Minuman, Snek, Tambahan)
- 3 jenis pesanan: Makan Di Sini, Bungkus, Penghantaran
- Penjejakan status: Diterima → Sedang Dimasak → Siap → Telah Diambil
- Amaran anti-tercicir (20 minit)
- Laporan jualan harian/mingguan/bulanan dengan analisis AI

## ✨ Ciri Utama

| Fungsi | Penerangan |
|--------|------------|
| **F1** | Rekod Pesanan Baharu (pantast < 15 saat) |
| **F2** | Papan Status Pesanan (FIFO queue board dengan kod warna timer) |
| **F3** | Menu & Harga (CRUD, 5 kategori) |
| **F4** | Rekod Sejarah Pelanggan (pelanggan tetap) |
| **F5** | Laporan Jualan + Analisis AI (GLM) |
| **F6** | Amaran Pesanan Tertunggak (anti-tercicir 20 min) |
| **F7** | Cetak/Papar Resit + pengiraan baki |

## 🔐 Keselamatan

- **RBAC** — 3 peranan: Pemilik, Pekerja Kaunter, Pekerja Dapur
- **Account lockout** — 5 percubaan gagal → kunci 15 minit
- **Rate limiting** — 10 percubaan log masuk seminit
- **Password policy** — minimum 8 aksara (huruf besar/kecil, nombor, aksara khas)
- **Bcrypt hashing** (12 rounds) + HMAC-signed sessions
- **Audit log** — semua perubahan direkod

## 🎨 Reka Bentuk

- **Glassmorphism** — frosted glass dengan backdrop-blur
- **Dark / Light mode**
- **Responsif** (mobile-first, touch-friendly untuk tablet kaunter)
- **Kod warna timer**: 🟢 ≤15 min · 🟡 15-25 min · 🔴 >25 min
- Palet oren/amber hangat (jenama makanan CKT Adik)

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

---

## 🚀 Pemasangan Tempatan

1. **Clone & install**
   ```bash
   git clone https://github.com/king545rm/SistemJadualJitra.git
   cd SistemJadualJitra
   bun install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env dengan Supabase connection string + SESSION_SECRET
   ```

3. **Database setup**
   ```bash
   bun run db:push          # Create tables
   bun run prisma/seed-caoms.ts  # Seed dummy data
   ```

4. **Start dev server**
   ```bash
   bun run dev
   ```

### 🔑 Akaun Demo (kata laluan: `CktAdik2026!`)

| Emel | Peranan | Akses |
|------|--------|-------|
| `pemilik@cktadik.my` | Pemilik | Akses penuh — semua data, laporan, tetapan |
| `kaunter@cktadik.my` | Pekerja Kaunter | Ambil & rekod pesanan, kemas kini status |
| `dapur@cktadik.my` | Pekerja Dapur | Lihat senarai pesanan tertunggak |
| `kaunter2@cktadik.my` | Pekerja Kaunter | Ambil & rekod pesanan |

---

## 📦 Deployment (Vercel)

Sistem ini dideploy ke Vercel dengan database Supabase PostgreSQL.

**Environment Variables:**
- `DATABASE_URL` — Supabase pooler connection string
- `SESSION_SECRET` — random 32-char secret

---

## 📁 Struktur

```
src/
├── app/api/           # API routes (auth, menu, pesanan, laporan, AI)
├── components/
│   ├── sections/      # 9 sections (dashboard, ambil, papan, menu, laporan, dll)
│   ├── ui/            # shadcn/ui components
│   └── app-shell.tsx  # Sidebar nav + header + sticky footer
├── lib/               # auth, rbac, security, session, audit, types
└── prisma/
    ├── schema.prisma  # 6 models (User, Menu, Pelanggan, Pesanan, OrderItem, AuditLog)
    └── seed-caoms.ts  # Dummy data seed
```

---

© CKT Adik — CAOMS v1.0
