'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import type {
  Kursus,
  Modul,
  Pensyarah,
  SessionUser,
  SlotJadual,
} from '@/lib/types'
import { HARI_LABELS } from '@/lib/types'
import {
  PageHeader,
  StatCard,
  LoadingState,
  EmptyState,
  Badge,
  useApi,
} from '@/components/sections/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Clock,
  Mail,
  Phone,
  Gauge,
  Sparkles,
  CalendarDays,
  GraduationCap,
  Layers,
} from 'lucide-react'

interface PensyarahSectionProps {
  user: SessionUser
}

function parseKepakaran(k: string | undefined | null): string[] {
  if (!k) return []
  try {
    const parsed = JSON.parse(k)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

interface PensyarahFormState {
  nama: string
  email: string
  telefon: string
  hadJamMaksimum: string
  kepakaran: string // comma-separated
  kursusIds: string[]
}

const EMPTY_FORM: PensyarahFormState = {
  nama: '',
  email: '',
  telefon: '',
  hadJamMaksimum: '20',
  kepakaran: '',
  kursusIds: [],
}

export function PensyarahSection({ user }: PensyarahSectionProps) {
  const canManage = ['TIMBALAN_PENGARAH', 'HEA', 'KETUA_KURSUS'].includes(
    user.role,
  )
  const isKetuaKursus = user.role === 'KETUA_KURSUS'

  // Filter
  const [filterKursusId, setFilterKursusId] = React.useState<string>(
    isKetuaKursus && user.kursusId ? user.kursusId : 'all',
  )

  // Fetch kursus for filter + checkboxes
  const kursusApi = useApi<{ kursus: Kursus[] }>(() => api.get('/api/kursus'), [])
  const kursusList = kursusApi.data?.kursus ?? []

  // Fetch pensyarah
  const pensyarahQuery = filterKursusId !== 'all' ? `?kursusId=${filterKursusId}` : ''
  const pensyarahApi = useApi<{ pensyarah: Pensyarah[] }>(
    () => api.get(`/api/pensyarah${pensyarahQuery}`),
    [pensyarahQuery],
  )
  const pensyarahList = pensyarahApi.data?.pensyarah ?? []

  // Stats
  const totalPensyarah = pensyarahList.length
  const totalCrossCourse = pensyarahList.filter((p) => {
    const kursusCount = new Set(
      (p.pensyarahKursus ?? []).map((pk) => pk.kursus.id),
    ).size
    return kursusCount > 1
  }).length
  const totalSlot = pensyarahList.reduce(
    (sum, p) => sum + (p._count?.slotJadual ?? 0),
    0,
  )
  const avgLoad = totalPensyarah
    ? Math.round(
        (pensyarahList.reduce(
          (sum, p) => sum + (p.hadJamMaksimum || 0),
          0,
        ) /
          Math.max(totalPensyarah, 1)) *
          10,
      ) / 10
    : 0

  // Create / edit dialog
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Pensyarah | null>(null)
  const [form, setForm] = React.useState<PensyarahFormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)

  // Detail dialog
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [detailPensyarah, setDetailPensyarah] = React.useState<Pensyarah | null>(
    null,
  )
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [scheduleSlots, setScheduleSlots] = React.useState<SlotJadual[]>([])

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = React.useState<Pensyarah | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  function openCreate() {
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
      kursusIds:
        isKetuaKursus && user.kursusId ? [user.kursusId] : [],
    })
    setDialogOpen(true)
  }

  function openEdit(p: Pensyarah) {
    setEditing(p)
    setForm({
      nama: p.nama,
      email: p.email,
      telefon: p.telefon ?? '',
      hadJamMaksimum: String(p.hadJamMaksimum),
      kepakaran: parseKepakaran(p.kepakaran).join(', '),
      kursusIds: (p.pensyarahKursus ?? []).map((pk) => pk.kursus.id),
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    const nama = form.nama.trim()
    const email = form.email.trim().toLowerCase()
    if (!nama || !email) {
      toast.error('Nama dan emel diperlukan.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Format emel tidak sah.')
      return
    }
    const hadJamMaksimum = Number(form.hadJamMaksimum)
    if (!Number.isFinite(hadJamMaksimum) || hadJamMaksimum <= 0) {
      toast.error('Had jam maksimum tidak sah.')
      return
    }
    const kepakaranArr = form.kepakaran
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    setSaving(true)
    try {
      const body = {
        nama,
        email,
        telefon: form.telefon.trim(),
        hadJamMaksimum,
        kepakaran: kepakaranArr,
        kursusIds: form.kursusIds,
      }
      if (editing) {
        await api.put(`/api/pensyarah/${editing.id}`, body)
        toast.success('Pensyarah berjaya dikemas kini.')
      } else {
        await api.post('/api/pensyarah', body)
        toast.success('Pensyarah baharu berjaya ditambah.')
      }
      setDialogOpen(false)
      pensyarahApi.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ralat tidak diketahui.')
    } finally {
      setSaving(false)
    }
  }

  async function openDetail(p: Pensyarah) {
    setDetailPensyarah(p)
    setDetailOpen(true)
    setDetailLoading(true)
    setScheduleSlots([])
    try {
      const [detailRes, schedRes] = await Promise.all([
        api.get<{ pensyarah: Pensyarah }>(`/api/pensyarah/${p.id}`),
        api.get<{ slots: SlotJadual[] }>(
          `/api/jadual/view?view=pensyarah&pensyarahId=${p.id}`,
        ),
      ])
      setDetailPensyarah(detailRes.pensyarah)
      setScheduleSlots(schedRes.slots ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuatkan butiran.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.del(`/api/pensyarah/${deleteTarget.id}`)
      toast.success('Pensyarah berjaya dipadam.')
      setDeleteTarget(null)
      pensyarahApi.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ralat tidak diketahui.')
    } finally {
      setDeleting(false)
    }
  }

  const toggleKursus = (id: string) => {
    setForm((s) => ({
      ...s,
      kursusIds: s.kursusIds.includes(id)
        ? s.kursusIds.filter((k) => k !== id)
        : [...s.kursusIds, id],
    }))
  }

  const isLoading = pensyarahApi.loading || kursusApi.loading

  // Group schedule slots by hari for mini display
  const scheduleByDay = React.useMemo(() => {
    const map: Record<string, SlotJadual[]> = {}
    for (const s of scheduleSlots) {
      if (!map[s.hari]) map[s.hari] = []
      map[s.hari].push(s)
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.masaMula.localeCompare(b.masaMula))
    }
    return map
  }, [scheduleSlots])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengurusan Pensyarah"
        description="Daftar pensyarah dan tugaskan kursus serta kepakaran masing-masing."
        icon={Users}
        actions={
          canManage ? (
            <Button onClick={openCreate} className="bg-primary">
              <Plus className="h-4 w-4" /> Tambah Pensyarah
            </Button>
          ) : null
        }
      />

      {/* Filter bar */}
      <Card className="glass-card border-0">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="space-y-1.5 flex-1 min-w-0 sm:max-w-xs">
            <Label className="text-xs">Tapis Kursus</Label>
            <Select
              value={filterKursusId}
              onValueChange={setFilterKursusId}
              disabled={isKetuaKursus}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kursus</SelectItem>
                {kursusList.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.kodKursus} — {k.namaKursus}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingState label="Memuatkan pensyarah..." />
      ) : pensyarahList.length === 0 ? (
        <EmptyState
          title="Tiada pensyarah dijumpai"
          description="Tambah pensyarah baharu atau ubah penapis untuk melihat senarai."
          icon={Users}
          action={
            canManage ? (
              <Button onClick={openCreate} className="bg-primary">
                <Plus className="h-4 w-4" /> Tambah Pensyarah
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Jumlah Pensyarah"
              value={totalPensyarah}
              icon={Users}
            />
            <StatCard
              label="Merentasi Kursus"
              value={totalCrossCourse}
              icon={Sparkles}
              variant="success"
              trend="Pensyarah multi-kursus"
            />
            <StatCard
              label="Slot Aktif"
              value={totalSlot}
              icon={CalendarDays}
              variant="warning"
            />
            <StatCard
              label="Purata Had Jam"
              value={avgLoad}
              icon={Gauge}
              trend="jam / minggu"
            />
          </div>

          <Card className="glass-card border-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead>Nama</TableHead>
                    <TableHead>Emel</TableHead>
                    <TableHead>Kursus Diajar</TableHead>
                    <TableHead>Kepakaran</TableHead>
                    <TableHead className="text-center">Had Jam</TableHead>
                    <TableHead className="text-center">Slot Aktif</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pensyarahList.map((p) => {
                    const kursusDiajar = (p.pensyarahKursus ?? []).map(
                      (pk) => pk.kursus,
                    )
                    const isCrossCourse = new Set(kursusDiajar.map((k) => k.id))
                      .size > 1
                    const kepakaranArr = parseKepakaran(p.kepakaran)
                    return (
                      <TableRow key={p.id} className="border-border/40">
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium">{p.nama}</span>
                            {isCrossCourse && (
                              <Badge variant="success" className="text-[10px]">
                                <Sparkles className="h-3 w-3" /> Merentasi Kursus
                              </Badge>
                            )}
                          </div>
                          {p.telefon && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />
                              {p.telefon}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs inline-flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {p.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {kursusDiajar.length === 0 ? (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            ) : (
                              kursusDiajar.map((k) => (
                                <Badge
                                  key={k.id}
                                  variant="info"
                                  className="font-mono text-[10px]"
                                >
                                  {k.kodKursus}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {kepakaranArr.length === 0 ? (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            ) : (
                              <>
                                {kepakaranArr.slice(0, 3).map((kp, i) => (
                                  <Badge
                                    key={i}
                                    variant="default"
                                    className="text-[10px]"
                                  >
                                    {kp}
                                  </Badge>
                                ))}
                                {kepakaranArr.length > 3 && (
                                  <Badge
                                    variant="default"
                                    className="text-[10px]"
                                  >
                                    +{kepakaranArr.length - 3}
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-medium">
                            <Gauge className="h-3 w-3 text-muted-foreground" />
                            {p.hadJamMaksimum}j
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {p._count?.slotJadual ?? 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => openDetail(p)}
                              aria-label="Lihat butiran"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {canManage && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => openEdit(p)}
                                  aria-label="Edit pensyarah"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteTarget(p)}
                                  aria-label="Padam pensyarah"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong border-0 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Pensyarah' : 'Tambah Pensyarah Baharu'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Kemas kini maklumat pensyarah dan tugasan kursus.'
                : 'Isi maklumat pensyarah baharu dan pilih kursus yang diajar.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nama">Nama Penuh</Label>
                <Input
                  id="nama"
                  value={form.nama}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, nama: e.target.value }))
                  }
                  placeholder="cth: Ahmad bin Ali"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Emel</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, email: e.target.value }))
                  }
                  placeholder="nama@adtecjitra.gov.my"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="telefon">No. Telefon</Label>
                <Input
                  id="telefon"
                  value={form.telefon}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, telefon: e.target.value }))
                  }
                  placeholder="012-3456789"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hadJam">Had Jam Maksimum / Minggu</Label>
                <Input
                  id="hadJam"
                  type="number"
                  min={1}
                  value={form.hadJamMaksimum}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, hadJamMaksimum: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kepakaran">Kepakaran (pisahkan dengan koma)</Label>
              <Input
                id="kepakaran"
                value={form.kepakaran}
                onChange={(e) =>
                  setForm((s) => ({ ...s, kepakaran: e.target.value }))
                }
                placeholder="cth: Elektronik Digital, Sistem Tertanam, IoT"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                Untuk pensyarah yang mengajar merentasi kursus, pilih beberapa
                kursus di bawah.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Kursus Diajar</Label>
              <div className="rounded-lg border border-border/60 p-3 max-h-44 overflow-y-auto space-y-2">
                {kursusList.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Memuatkan senarai kursus...
                  </p>
                ) : (
                  kursusList.map((k) => (
                    <label
                      key={k.id}
                      htmlFor={`kursus-${k.id}`}
                      className="flex items-center gap-2.5 cursor-pointer hover:bg-muted/40 rounded-md p-1.5 -m-1.5 transition-colors"
                    >
                      <Checkbox
                        id={`kursus-${k.id}`}
                        checked={form.kursusIds.includes(k.id)}
                        onCheckedChange={() => toggleKursus(k.id)}
                      />
                      <span className="text-sm flex-1">
                        <span className="font-mono text-xs text-primary mr-1.5">
                          {k.kodKursus}
                        </span>
                        {k.namaKursus}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {form.kursusIds.length > 1 && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Pensyarah ini akan ditandakan sebagai mengajar merentasi kursus.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary">
              {saving ? 'Menyimpan...' : editing ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="glass-strong border-0 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailPensyarah && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3 pr-8">
                  <div className="min-w-0">
                    <DialogTitle className="text-xl">
                      {detailPensyarah.nama}
                    </DialogTitle>
                    <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {detailPensyarah.email}
                      </span>
                      {detailPensyarah.telefon && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {detailPensyarah.telefon}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Gauge className="h-3 w-3" />
                        Had {detailPensyarah.hadJamMaksimum}j / minggu
                      </span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {detailLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Memuatkan butiran...
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Kursus diajar */}
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      Kursus Diajar
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {(detailPensyarah.pensyarahKursus ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Tiada kursus ditugaskan.
                        </p>
                      ) : (
                        (detailPensyarah.pensyarahKursus ?? []).map(
                          ({ kursus }) => (
                            <Badge key={kursus.id} variant="info">
                              <span className="font-mono">{kursus.kodKursus}</span>
                              <span className="ml-1">{kursus.namaKursus}</span>
                            </Badge>
                          ),
                        )
                      )}
                    </div>
                    {(() => {
                      const kp = parseKepakaran(detailPensyarah.kepakaran)
                      if (kp.length === 0) return null
                      return (
                        <div className="pt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">
                            Kepakaran
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {kp.map((k, i) => (
                              <Badge key={i} variant="default">
                                {k}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </section>

                  {/* Modul Diajar */}
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      Modul Diajar
                    </h3>
                    {(detailPensyarah.pensyarahModul ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Tiada modul ditugaskan.
                      </p>
                    ) : (
                      <div className="rounded-lg border border-border/60 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/40">
                              <tr>
                                <th className="text-left p-2 font-medium">
                                  Kod
                                </th>
                                <th className="text-left p-2 font-medium">
                                  Modul
                                </th>
                                <th className="text-left p-2 font-medium">
                                  Kursus
                                </th>
                                <th className="text-left p-2 font-medium">
                                  Sem
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(detailPensyarah.pensyarahModul ?? []).map(
                                ({ modul }: { modul: Modul }) => (
                                  <tr
                                    key={modul.id}
                                    className="border-t border-border/40"
                                  >
                                    <td className="p-2 font-mono">
                                      {modul.kodModul}
                                    </td>
                                    <td className="p-2 font-medium">
                                      {modul.namaModul}
                                    </td>
                                    <td className="p-2">
                                      <Badge
                                        variant="info"
                                        className="font-mono text-[10px]"
                                      >
                                        {modul.kumpulan?.kursus?.kodKursus ??
                                          '-'}
                                      </Badge>
                                    </td>
                                    <td className="p-2">
                                      {modul.kumpulan?.semesterNo ?? '-'}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Mini schedule */}
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      Jadual Mingguan
                      <Badge variant="default" className="ml-1">
                        {scheduleSlots.length} slot
                      </Badge>
                    </h3>
                    {scheduleSlots.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Tiada slot jadual ditugaskan.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {Object.entries(scheduleByDay).map(([hari, slots]) => (
                          <div
                            key={hari}
                            className="rounded-lg border border-border/60 p-2.5"
                          >
                            <p className="text-xs font-semibold mb-1.5 text-primary">
                              {HARI_LABELS[hari] ?? hari}
                            </p>
                            <div className="space-y-1">
                              {slots.map((s) => (
                                <div
                                  key={s.id}
                                  className="text-[11px] rounded bg-muted/40 px-2 py-1"
                                >
                                  <p className="font-medium">
                                    {s.masaMula}–{s.masaTamat}
                                  </p>
                                  <p className="text-muted-foreground truncate">
                                    {s.modul?.namaModul ?? '-'}
                                  </p>
                                  <p className="text-muted-foreground text-[10px]">
                                    {s.modul?.kumpulan?.kursus?.kodKursus ??
                                      ''}{' '}
                                    {s.bilik?.namaBilik
                                      ? `· ${s.bilik.namaBilik}`
                                      : ''}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="glass-strong border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Padam pensyarah ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan memadam{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget?.nama}
              </span>{' '}
              ({deleteTarget?.email}). Tugasan kursus, modul dan slot jadual
              berkaitan juga akan terjejas. Tindakan ini tidak boleh diundur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? 'Memadam...' : 'Padam'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
