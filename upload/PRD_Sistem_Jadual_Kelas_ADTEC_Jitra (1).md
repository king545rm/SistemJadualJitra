# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Sistem Penyusunan Jadual Kelas & Pensyarah ADTEC Jitra, Kedah
### (Nama Cadangan: **ADTEC Smart Timetable System – "ASTS"**)

| Perkara | Butiran |
|---|---|
| Disediakan oleh | Timbalan Pengarah, ADTEC Jitra, Kedah |
| Versi | 1.0 |
| Tarikh | 14 Julai 2026 |
| Status | Draf untuk semakan |
| Model AI Teras | GLM 5.2 (Generative Language Model) |
| Reka Bentuk UI/UX | Moden — Glassmorphism |
| Borang Input | Jotform (embed/integrasi) |
| Backend/Database | Supabase (PostgreSQL) |
| Hosting/Deployment | Netlify |

---

## 1. LATAR BELAKANG & PENYATAAN MASALAH

ADTEC Jitra menawarkan **7 kursus/program** dengan struktur latihan sepanjang **4 semester (2 tahun)** ditambah **4 bulan latihan industri**. Setiap kursus mempunyai sehingga **4 kumpulan pelajar mengikut semester** yang berbeza berjalan serentak, dan setiap kumpulan boleh mempunyai sehingga **10 modul/subjek** (gabungan subjek teras dan subjek umum) dalam satu semester.

Penyusunan jadual kelas dan pensyarah secara manual (contohnya menggunakan Excel) berisiko tinggi menghadapi masalah:

- **Pertindihan (clash) jadual pensyarah** — seorang pensyarah yang mengajar di lebih daripada satu kursus/semester/kumpulan boleh terjadual pada slot masa yang sama.
- Sukar memantau beban tugas mengajar (teaching load) setiap pensyarah secara menyeluruh merentasi 7 kursus.
- Proses penyusunan semula jadual (bila ada perubahan) mengambil masa lama dan terdedah kepada kesilapan manusia.
- Tiada paparan bersepadu untuk pihak pengurusan menyemak status keseluruhan jadual semua kursus.

Sistem **ASTS** dicadangkan sebagai platform automasi berkuasa AI (GLM 5.2) untuk menjana, menyemak dan mengoptimumkan jadual kelas serta peruntukan pensyarah secara automatik, bebas pertindihan (clash-free), dan mudah diselenggara.

---

## 2. OBJEKTIF PRODUK

1. Menjana jadual kelas secara automatik bagi 7 kursus, 4 kumpulan semester setiap kursus, dan sehingga 10 modul setiap semester.
2. Mengesan dan mengelakkan **pertindihan (clash) jadual pensyarah** secara automatik apabila seseorang pensyarah mengajar merentasi pelbagai kursus/semester.
3. Memantau beban tugas mengajar pensyarah (4–8 pensyarah setiap kursus) secara telus dan seimbang.
4. Menyediakan portal digital yang membolehkan kemas kini jadual secara pantas dan responsif terhadap perubahan.
5. Mengurangkan masa penyediaan jadual semester baharu daripada beberapa minggu kepada beberapa hari.

---

## 3. SKOP PENGGUNA (USER PERSONA)

| Peranan | Akses |
|---|---|
| Timbalan Pengarah (Pengguna Utama) | Akses penuh — semua kursus & laporan |
| Ketua Kursus (Head of Programme) | Urus jadual & pensyarah bagi kursus masing-masing sahaja |
| Unit Akademik/HEA | Selaras jadual keseluruhan, selesaikan konflik antara kursus |
| Pensyarah | Lihat jadual sendiri, mohon pertukaran slot melalui borang Jotform |
| Pentadbir Sistem (IT) | Konfigurasi sistem, urus pengguna, integrasi |

---

## 4. STRUKTUR DATA & ENTITI UTAMA

Untuk memahami skop sistem, berikut adalah struktur data teras berdasarkan maklumat yang diberikan:

| Entiti | Butiran |
|---|---|
| **Kursus** | 7 kursus berbeza (cth: Elektrik, Mekanikal, ICT, dsb. — nama sebenar ditentukan kemudian) |
| **Kumpulan Semester** | Setiap kursus ada 4 kumpulan pelajar mengikut semester (Semester 1, 2, 3, 4) yang berjalan serentak |
| **Tempoh Latihan** | 4 semester (2 tahun) + 4 bulan latihan industri = jumlah kitaran ± 2 tahun 4 bulan |
| **Pensyarah** | Setiap kursus mempunyai 4–8 pensyarah; seorang pensyarah boleh mengajar di >1 kursus/semester |
| **Subjek/Modul** | Sehingga 10 modul setiap semester setiap kursus; dikategorikan sebagai **Subjek Teras** atau **Subjek Umum** |
| **Slot Masa (Time Slot)** | Blok waktu kelas harian/mingguan (cth: setiap 1–2 jam, Isnin–Jumaat) |
| **Bilik/Makmal** | Lokasi fizikal kelas/makmal (jika berkaitan untuk elak pertindihan bilik) |

---

## 5. KEPERLUAN FUNGSIAN (FUNCTIONAL REQUIREMENTS)

### F1 — Pengurusan Data Kursus
- Daftar dan urus 7 kursus dengan maklumat: nama kursus, kod kursus, tempoh (4 semester + 4 bulan latihan industri).
- Setiap kursus memaparkan 4 kumpulan semester aktif serentak.

### F2 — Pengurusan Kumpulan Semester Pelajar
- Urus 4 kumpulan semester bagi setiap kursus (Semester 1–4).
- Rekod bilangan pelajar setiap kumpulan (untuk rujukan kapasiti bilik/makmal).
- Penjejakan status kumpulan: sedang belajar, sedang latihan industri, tamat.

### F3 — Pengurusan Subjek/Modul
- Daftar sehingga 10 modul bagi setiap kumpulan semester setiap kursus.
- Kategori modul: **Subjek Teras (Core)** atau **Subjek Umum (General)**.
- Setiap modul direkod dengan bilangan jam kredit/jam kontak seminggu (untuk pengiraan jadual).
- Subjek umum yang sama (cth: Bahasa Melayu, Pendidikan Islam/Moral, Kokurikulum) boleh dikongsi merentasi beberapa kursus — sistem perlu mengenal pasti ini untuk elak pertindihan pensyarah yang sama mengajar subjek umum di kursus berbeza pada slot serupa.

### F4 — Pengurusan Data Pensyarah
- Daftar 4–8 pensyarah setiap kursus (jumlah keseluruhan dianggarkan 28–56 pensyarah merentasi 7 kursus, bergantung pertindihan pensyarah antara kursus).
- Rekod kepakaran/modul yang layak diajar oleh setiap pensyarah.
- Rekod had maksimum jam mengajar seminggu bagi setiap pensyarah (teaching load limit).
- Sokongan pensyarah yang mengajar **merentasi pelbagai kursus dan semester** — sistem perlu paparkan jadual gabungan (combined view) bagi setiap pensyarah ini.

### F5 — Enjin Penjanaan Jadual Automatik (Core Engine)
- Sistem menjana cadangan jadual kelas secara automatik berdasarkan:
  - Bilangan modul setiap kumpulan semester (sehingga 10 modul).
  - Bilangan pensyarah tersedia dan kepakaran masing-masing.
  - Had jam mengajar setiap pensyarah.
  - Ketersediaan bilik/makmal (jika direkodkan).
- GLM 5.2 digunakan untuk mencadangkan susunan optimum (constraint-based scheduling) dan memberi penjelasan (explainability) jika ada had/kekangan yang tidak dapat dipenuhi.

### F6 — Pengesanan & Pencegahan Pertindihan (Clash Detection) — **Fungsi Kritikal**
- Sistem **mesti** menyemak dan menghalang pertindihan jadual bagi:
  - **Pensyarah** — seorang pensyarah tidak boleh ditugaskan mengajar dua kelas berbeza (kursus/semester/modul berbeza) pada slot masa yang sama.
  - **Bilik/Makmal** — (jika direkodkan) satu bilik tidak boleh digunakan oleh dua kumpulan pada masa sama.
  - **Kumpulan Pelajar** — satu kumpulan semester tidak menerima dua modul serentak pada slot sama.
- Amaran visual (highlight merah) dipaparkan serta-merta apabila cubaan menjadualkan pertindihan berlaku.
- Sistem memberi cadangan slot alternatif secara automatik apabila konflik dikesan.

### F7 — Paparan Jadual Mengikut Pelbagai Sudut Pandang (Views)
- **Paparan Kursus** — jadual penuh bagi satu kursus (semua 4 semester serentak).
- **Paparan Pensyarah** — jadual gabungan seorang pensyarah merentasi semua kursus yang diajar.
- **Paparan Kumpulan Semester** — jadual mingguan satu kumpulan pelajar.
- **Paparan Keseluruhan (Master Timetable)** — jadual induk semua 7 kursus untuk semakan pihak pengurusan.

### F8 — Pengurusan Beban Tugas Mengajar (Teaching Load Management)
- Dashboard papar jumlah jam mengajar setiap pensyarah berbanding had maksimum yang ditetapkan.
- Amaran automatik jika seorang pensyarah melebihi/hampir had jam mengajar mingguan.
- Laporan pengagihan beban tugas merentasi 7 kursus untuk tujuan keadilan (fair distribution).

### F9 — Borang Permohonan & Pertukaran (Jotform)
- Borang Jotform disediakan untuk:
  - Permohonan pertukaran slot kelas oleh pensyarah.
  - Permohonan penambahan/pemindaan modul oleh Ketua Kursus.
- Data borang disalurkan automatik (webhook) ke pangkalan data Supabase dan dipaparkan sebagai cadangan perubahan untuk kelulusan Timbalan Pengarah/Ketua Kursus.

### F10 — Jejak Semester & Latihan Industri
- Penjejakan automatik peralihan status kumpulan pelajar daripada semester akademik ke tempoh 4 bulan latihan industri.
- Kalendar akademik keseluruhan memaparkan tempoh semester dan tempoh latihan industri bagi setiap kohort/kumpulan.

---

## 6. CADANGAN FUNGSI TAMBAHAN UNTUK PENAMBAHBAIKAN SISTEM

1. **Enjin Auto-Optimize (AI Scheduling Optimizer)** — GLM 5.2 mencadangkan beberapa versi jadual optimum (cth: minimum clash, minimum jurang waktu pensyarah) untuk dipilih oleh pengguna.
2. **Simulasi "What-If"** — pengguna boleh uji kesan sebelum sahkan (cth: "Apa jadi jika Pensyarah A cuti sakit seminggu?") dan sistem cadangkan pensyarah gantian yang layak.
3. **Notifikasi Automatik** — emel/SMS/WhatsApp kepada pensyarah & pelajar apabila ada perubahan jadual.
4. **Kalendar Peribadi (Sync ke Google Calendar)** — setiap pensyarah boleh sync jadual mengajar terus ke Google Calendar peribadi.
5. **Modul Analitik Beban Kerja** — laporan trend beban tugas pensyarah merentasi beberapa semester untuk perancangan pengambilan pensyarah baharu.
6. **Pengurusan Bilik & Makmal Bersepadu** — pemetaan kapasiti bilik/makmal berbanding bilangan pelajar setiap kumpulan.
7. **Semakan Pematuhan Jam Kredit (Compliance Check)** — pastikan setiap modul memenuhi jumlah jam kredit minimum yang ditetapkan badan pensijilan (cth: JPK/DSD).
8. **Papan Pemuka Pensyarah (Lecturer Self-Service Portal)** — pensyarah log masuk sendiri untuk lihat jadual, mohon pertukaran, dan muat naik bahan pengajaran.
9. **Eksport Jadual (PDF/Excel/PowerPoint)** — jana jadual rasmi untuk cetak/edaran/paparan papan kenyataan.
10. **Sokongan Dwibahasa (Bahasa Melayu & Inggeris)**.
11. **Log Audit Perubahan Jadual** — rekod siapa buat perubahan, bila, dan sebab (untuk tujuan governans).
12. **Automasi Borang Jotform → Supabase** — semua borang permohonan terus masuk pangkalan data tanpa input manual berulang.
13. **Mod Gelap/Terang (Dark/Light Mode)** melengkapkan reka bentuk glassmorphism.
14. **Widget Boleh Susun Semula (Customizable Dashboard)** mengikut keutamaan Ketua Kursus/Timbalan Pengarah.
15. **Real-Time Sync (Supabase Realtime)** — perubahan jadual dipaparkan serta-merta kepada semua pengguna berkaitan tanpa refresh.

---

## 7. KEPERLUAN BUKAN FUNGSIAN (NON-FUNCTIONAL REQUIREMENTS)

| Kategori | Keperluan |
|---|---|
| Keselamatan | Enkripsi data (at-rest & in-transit), RBAC mengikut peranan, pematuhan dasar keselamatan siber sektor awam |
| Ketepatan (Accuracy) | 0% pertindihan (zero-clash) jadual pensyarah selepas jadual disahkan |
| Prestasi | Penjanaan cadangan jadual penuh (7 kursus × 4 semester) dalam < 30 saat |
| Kebolehskalaan | Boleh dikembangkan untuk tambah kursus baharu pada masa hadapan tanpa ubah struktur asas |
| Kebolehgunaan (Usability) | Antara muka mudah untuk Ketua Kursus yang bukan-teknikal |
| Pematuhan | Selaras dasar PDPA dan garis panduan data kerajaan |

---

## 8. REKA BENTUK UI/UX — GLASSMORPHISM

- **Kesan kaca kabur (frosted glass / backdrop-blur)** pada kad jadual, panel pensyarah, dan modal konflik.
- **Kod warna intuitif**: hijau (tiada konflik), merah (pertindihan dikesan), kuning (hampir had jam mengajar).
- **Paparan grid mingguan** (drag-and-drop) untuk susun semula slot kelas dengan mudah.
- **Palet warna lembut & gradien** selaras identiti korporat ADTEC/MARA.
- **Responsif (mobile-first)** — Ketua Kursus/pensyarah boleh semak jadual di telefon.
- **Mikro-interaksi** — animasi lembut semasa drag slot, klik kad pensyarah, atau notifikasi konflik.

---

## 9. INTEGRASI BORANG — JOTFORM

- Borang permohonan pertukaran slot, permohonan modul baharu, dan borang maklum balas pensyarah dibina di Jotform.
- Borang di-*embed* dalam dashboard (iframe/Jotform Card).
- Data dihantar automatik ke Supabase melalui **Jotform Webhook/API**, dipaparkan sebagai "Permohonan Menunggu Kelulusan" dalam sistem.

---

## 10. BACKEND & DEPLOYMENT — SUPABASE & NETLIFY

| Komponen | Teknologi | Catatan |
|---|---|---|
| Pangkalan Data | Supabase (PostgreSQL) | Jadual: kursus, kumpulan_semester, modul, pensyarah, slot_jadual, permohonan_pertukaran |
| Pengesahan Pengguna (Auth) | Supabase Auth | Log masuk mengikut peranan (Timbalan Pengarah, Ketua Kursus, Pensyarah, IT) |
| Storan Fail | Supabase Storage | Lampiran (cth: silibus modul, surat pertukaran) |
| API Backend | Supabase Edge Functions | Logik enjin clash-detection & integrasi Jotform |
| Frontend Hosting | Netlify | Deployment automatik (CI/CD) melalui Git repository |
| Data Masa Nyata | Supabase Realtime | Kemas kini jadual serta-merta untuk semua pengguna berkaitan |

**Cadangan Struktur Jadual Pangkalan Data (Ringkasan):**

```
kursus (id, nama_kursus, kod_kursus)
kumpulan_semester (id, kursus_id, semester_no, bil_pelajar, status)
modul (id, kumpulan_semester_id, nama_modul, kategori[teras/umum], jam_kredit)
pensyarah (id, nama, kepakaran[], had_jam_maksimum)
slot_jadual (id, modul_id, pensyarah_id, hari, masa_mula, masa_tamat, bilik_id)
bilik (id, nama_bilik, kapasiti)
permohonan_pertukaran (id, pensyarah_id, slot_asal_id, slot_cadangan, status, sumber[jotform])
```

---

## 11. DATA PANGKALAN DATA DUMMY (UNTUK PEMBANGUNAN & UJIAN)

Set data dummy perlu disediakan dalam Supabase sebenar (bukan mock/local) untuk ujian antara muka dan demonstrasi sebelum data sebenar dimasukkan:

- 7 rekod kursus contoh.
- 4 kumpulan semester bagi setiap kursus (jumlah 28 kumpulan).
- Sehingga 10 modul contoh bagi setiap kumpulan (campuran teras/umum).
- 4–8 pensyarah contoh setiap kursus, termasuk beberapa pensyarah yang sengaja ditanda mengajar merentasi 2 kursus (untuk uji fungsi clash-detection).
- Beberapa slot jadual contoh dengan **pertindihan sengaja dimasukkan** untuk sahkan sistem berjaya mengesannya.

> **Nota Penting:** Semua data dummy ditanda dengan medan `is_dummy = true` dalam jadual Supabase supaya mudah dikenal pasti dan dipadam sepenuhnya sebelum sistem dilancarkan secara rasmi (go-live), bagi mengelakkan pencampuran data ujian dengan data jadual sebenar.

---

## 12. METRIK KEJAYAAN (SUCCESS METRICS)

- **0 pertindihan jadual pensyarah** dikesan selepas jadual disahkan untuk setiap semester.
- Pengurangan masa penyediaan jadual semester baharu sebanyak ≥ 80% berbanding kaedah manual.
- Peningkatan kepuasan pensyarah terhadap ketelusan pengagihan beban tugas.
- Ketepatan cadangan jadual automatik oleh GLM 5.2 ≥ 90% (tidak perlu banyak pindaan manual).

---

## 13. CADANGAN PELAN PELAKSANAAN (HIGH-LEVEL ROADMAP)

| Fasa | Skop | Anggaran Tempoh |
|---|---|---|
| Fasa 0 | Persediaan Infrastruktur — Supabase (skema database + Auth), setup Netlify, reka bentuk UI/UX Glassmorphism (wireframe & prototaip) | 2–3 minggu |
| Fasa 1 | Modul Data Asas — Kursus, Kumpulan Semester, Modul, Pensyarah + Data Dummy | 4–6 minggu |
| Fasa 2 | Enjin Penjanaan Jadual & Clash-Detection (Fungsi Teras — Objektif 8) | 6–8 minggu |
| Fasa 3 | Paparan Pelbagai Sudut (Kursus/Pensyarah/Kumpulan/Master) + Pengurusan Beban Tugas | 4–6 minggu |
| Fasa 4 | Integrasi Borang Jotform (Pertukaran Slot) + Enjin AI GLM 5.2 (Cadangan Optimum) | 6–8 minggu |
| Fasa 5 | UAT, Gantikan Data Dummy dengan Data Sebenar & Pelancaran (Deploy Netlify Production) | 3–4 minggu |

---

## 14. RISIKO & PERANCANGAN MITIGASI

| Risiko | Kesan | Mitigasi |
|---|---|---|
| Kekangan penjadualan terlalu kompleks (7 kursus × 4 semester × 10 modul) menyebabkan tiada penyelesaian sempurna (over-constrained) | Jadual tidak dapat dijana sepenuhnya tanpa konflik | Sistem beri cadangan terbaik (best-effort) + senarai konflik yang perlu diselesaikan secara manual oleh Ketua Kursus |
| Pensyarah mengajar merentasi kursus tidak dikemas kini serta-merta | Risiko pertindihan tidak dikesan | Guna Supabase Realtime supaya setiap perubahan disemak clash serta-merta merentasi semua kursus |
| Data dummy tidak dipadam sebelum go-live | Kekeliruan data ujian vs data sebenar | Wajibkan medan `is_dummy`; semakan wajib sebelum pelancaran rasmi |
| Had free-tier Supabase/Netlify apabila penggunaan meningkat (28+ pensyarah, ratusan pelajar) | Gangguan perkhidmatan/prestasi menurun | Rancang peningkatan pelan berbayar awal berdasarkan anggaran jumlah pengguna |
| Data sensitif (jadual, maklumat pensyarah) disimpan di pelayan pihak ketiga luar negara | Isu governans data sektor awam | Semak dasar data residency dengan pihak IT/keselamatan siber ADTEC/MARA; pertimbang *self-hosted Supabase* jika perlu |
| Pergantungan kepada satu vendor AI (GLM 5.2) | Risiko ketersediaan perkhidmatan | Reka bentuk modular supaya enjin AI boleh ditukar ganti pada masa hadapan |

---

*Dokumen ini adalah draf awal PRD dan perlu disemak bersama Ketua Kursus (7 kursus), Unit Akademik/HEA, pihak IT, dan pihak pengurusan atasan ADTEC Jitra sebelum diluluskan untuk pembangunan.*
