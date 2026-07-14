# Task 11-C — Work Record

**Agent**: full-stack-developer (Jadual/Generate/Permohonan/Audit/Users)
**Task ID**: 11-C
**Files built**:
- `/home/z/my-project/src/components/sections/jadual-section.tsx`
- `/home/z/my-project/src/components/sections/generate-section.tsx`
- `/home/z/my-project/src/components/sections/permohonan-section.tsx`
- `/home/z/my-project/src/components/sections/audit-section.tsx`
- `/home/z/my-project/src/components/sections/users-section.tsx`

## Approach
- Read prior worklog (Tasks 1, 2-9) + shared.tsx + types.ts + api-client.ts + all relevant API routes (jadual/view, jadual/clashes, jadual, jadual/[id], jadual/clash-check, jadual/alternatives, jadual/generate, permohonan + approve/reject, audit, users + [id]).
- Used shared helpers (`PageHeader`, `StatCard`, `LoadingState`, `EmptyState`, `Badge`, `GlassPanel`, `useApi`) consistently.
- All UI text in Malay. Glassmorphism via `glass-card` / `glass-strong` + `border-0`. Emerald primary, status colors green/amber/red. No indigo/blue.
- Role-based gating: `canManage`, `canGenerate`, `canApprove`, `canManageUsers` constants per spec.

## Per-section highlights
### Jadual
- 4 views via Tabs (master / kursus / pensyarah / kumpulan). For PENSYARAH role, defaults to pensyarah view + locked Select to `user.pensyarahId`.
- Weekly grid with `overflow-x-auto`, min-width 860px, 5 hari columns × 8 masa rows.
- Slot cards colored by kategori (TERAS=emerald tint, UMUM=amber tint).
- `clash-highlight` (red pulse) + "Pertindihan" badge on slots in `/api/jadual/clashes` set.
- Drag-and-drop via @dnd-kit/core (PointerSensor, distance 6). Slot cards draggable; cells droppable with id format `hari|masaMula`. On drop → PUT slot with new hari/masa (preserving duration).
- Add/Edit Dialog with clash result display, "Cari Slot Alternatif" button (calls /alternatives), "Paksa Jadual" checkbox.
- Collapsible clashes panel with "Selesaikan" button → opens edit dialog for slotA.
- Empty cells show "+" on hover, clicking opens add dialog prefilled.
- DELETE via AlertDialog.
- Conflict on POST/PUT detected (status 409 + clash in body) → renders red alert with messages from `lecturerClashes` / `roomClashes` / `groupClashes`.

### Generate
- EmptyState "Akses Ditolak" for non-canGenerate roles.
- Intro card explaining AI engine.
- Options: kursus Select (Semua Kursus / specific), clearExisting Switch.
- Big "Jana Jadual" button with spinner + "Sedang menjana... mungkin mengambil masa sehingga 30 saat" message.
- Results: 4 stat cards (slot dijana, konflik dielakkan, status, sampel).
- AI Rationale card (glass-strong) — parses text by newlines, bullets for `-`/`*`/`•` or `1.` lines, paragraphs otherwise.
- "Konflik Dielakkan" list with amber badges.
- Sample table (up to 20).
- Action buttons: "Lihat Jadual" (toast hint), "Jana Semula".

### Permohonan
- Tabs: Senarai / Borang.
- List with status filter (Semua/MENUNGGU/DILULUSKAN/DITOLAK). Desktop table + mobile cards.
- For PENSYARAH: hides approve/reject buttons, filters to their own permohonan via `user.pensyarahId`.
- Approve/Reject Dialog with catatan Textarea.
- Built-in form (replaces Jotform): pensyarah Select (locked if PENSYARAH), slot asal Select (fetched via /api/jadual?pensyarahId=X), cadangan hari/mula/tamat Selects, alasan Textarea, sumber=MANUAL hidden.

### Audit
- Filters: entity, action, limit (all Select-driven). URL rebuilt via useMemo, useApi deps reactively refetch.
- Table with timestamp, user (name + role badge), action badge colored per spec, entity, entity ID (truncated), IP.
- Row click → Dialog with before/after pretty-printed JSON in `<pre>` inside ScrollArea.
- Quick stats: total, today, create count, delete count.

### Users
- canManageUsers gate (TIMBALAN_PENGARAH, IT).
- Table: name (with "Anda" badge for self), email, role badge, kursus/pensyarah, last login, status (locked badge + Buka Kunci button if locked), edit/delete actions.
- Self-delete hidden.
- Add/Edit Dialog: name, email, role Select (conditional kursus for KETUA_KURSUS, pensyarah for PENSYARAH), password (with strength hint) for new user, resetPassword for edit.
- Unlock via separate "Buka Kunci" button calling PUT `{unlock:true}`.
- Delete via AlertDialog.

## Verification
- `bun run lint`: 0 errors, 2 warnings (both in pre-existing files: `prisma/seed.ts`, `shared.tsx` — not in my files).
- Dev log shows `✓ Compiled` and `GET / 200` for the route.
- Note: app-shell.tsx still references other section files (dashboard, beban, kursus, pensyarah, modul, bilik) that are owned by sibling agents (11-A, 11-B). Those missing-module errors are expected until those agents complete.

## Notes for downstream agents
- All 5 sections accept `{ user: SessionUser }` as prop.
- Time slot durations in jadual grid come from `TIME_SLOTS` in `@/lib/types`.
- For drag-drop, cell ID format is `${hari}|${masaMula}` (e.g. `ISNIN|08:00`).
- The clashes API returns `{ clashes: [{slotA, slotB, type}], totalClashes }` — slotA/slotB are flat objects with modulNama, pensyarahNama, bilikNama, kursusKod, semesterNo.
