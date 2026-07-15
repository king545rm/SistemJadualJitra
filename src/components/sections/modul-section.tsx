'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import type {
  Kursus,
  KumpulanSemester,
  Modul,
  SessionUser,
} from '@/lib/types'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Boxes,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Hash,
  Info,
  Layers,
  GraduationCap,
} from 'lucide-react'

interface ModulSectionProps {
  user: SessionUser
}

const KATEGORI_LABEL: Record<Modul['kategori'], string> = {
  TERAS: 'Teras',
  UMUM: 'Umum',
}

const KATEGORI_BADGE: Record<Modul['kategori'], 'info' | 'default'> = {
  TERAS: 'info',
  UMUM: 'default',
}

interface ModulFormState {
  kumpulanId: string
  namaModul: string
  kodModul: string
  kategori: Modul['kategori']
  jamKredit: string
  jamKontakMingguan: string
}

const EMPTY_FORM: ModulFormState = {
  kumpulanId: '',
  namaModul: '',
  kodModul: '',
  kategori: 'TERAS',
  jamKredit: '3',
  jamKontakMingguan: '4',
}

export function ModulSection({ user }: ModulSectionProps) {
  const canManage = ['TIMBALAN_PENGARAH', 'HEA', 'KETUA_KURSUS'].includes(
    user.role,
  )
  const isKetuaKursus = user.role === 'KETUA_KURSUS'

  // Filters
  const [filterKursusId, setFilterKursusId] = React.useState<string>(
    isKetuaKursus && user.kursusId ? user.kursusId : 'all',
  )
  const [filterKategori, setFilterKategori] = React.useState<string>('all')

  // Fetch kursus list (for filter + kumpulan lookup)
  const kursusApi = useApi<{ kursus: Kursus[] }>(
    () => api.get('/api/kursus'),
    [],
  )
  // Fetch all kumpulan (for dropdown in form)
  const kumpulanApi = useApi<{ kumpulan: KumpulanSemester[] }>(
    () => api.get('/api/kumpulan'),
    [],
  )

  // Build modul query string. The modul API supports kategori filter;
  // kursusId filtering is done client-side on the result set.
  const modulQuery = React.useMemo(() => {
    const params = new URLSearchParams()
    if (filterKategori !== 'all') params.set('kategori', filterKategori)
    const q = params.toString()
    return q ? `?${q}` : ''
  }, [filterKategori])

  const modulApi = useApi<{ modul: Modul[] }>(
    () => api.get(`/api/modul${modulQuery}`),
    [modulQuery],
  )

  const kursusList = kursusApi.data?.kursus ?? []
  const kumpulanList = kumpulanApi.data?.kumpulan ?? []
  const modulList = modulApi.data?.modul ?? []

  // Filter modul by kursus (client side) when kursusId selected
  const visibleModul = React.useMemo(() => {
    if (filterKursusId === 'all') return modulList
    return modulList.filter(
      (m) => m.kumpulan?.kursusId === filterKursusId,
    )
  }, [modulList, filterKursusId])

  // Filter kumpulan for the form dropdown (by kursus filter if set)
  const formKumpulanList = React.useMemo(() => {
    if (filterKursusId === 'all') return kumpulanList
    return kumpulanList.filter((k) => k.kursusId === filterKursusId)
  }, [kumpulanList, filterKursusId])

  // Stats
  const totalModul = visibleModul.length
  const totalTeras = visibleModul.filter((m) => m.kategori === 'TERAS').length
  const totalUmum = visibleModul.filter((m) => m.kategori === 'UMUM').length
  const totalSlot = visibleModul.reduce(
    (sum, m) => sum + (m._count?.slotJadual ?? 0),
    0,
  )

  // Create / edit dialog
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Modul | null>(null)
  const [form, setForm] = React.useState<ModulFormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = React.useState<Modul | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  function openCreate() {
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
      kumpulanId:
        formKumpulanList.length > 0 ? formKumpulanList[0].id : '',
    })
    setDialogOpen(true)
  }

  function openEdit(m: Modul) {
    setEditing(m)
    setForm({
      kumpulanId: m.kumpulanId,
      namaModul: m.namaModul,
      kodModul: m.kodModul,
      kategori: m.kategori,
      jamKredit: String(m.jamKredit),
      jamKontakMingguan: String(m.jamKontakMingguan),
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.kumpulanId) {
      toast.error('Sila pilih kumpulan semester.')
      return
    }
    const namaModul = form.namaModul.trim()
    const kodModul = form.kodModul.trim().toUpperCase()
    if (!namaModul || !kodModul) {
      toast.error('Nama modul dan kod modul diperlukan.')
      return
    }
    const jamKredit = Number(form.jamKredit)
    const jamKontakMingguan = Number(form.jamKontakMingguan)
    if (!Number.isFinite(jamKredit) || jamKredit < 0) {
      toast.error('Jam kredit tidak sah.')
      return
    }
    if (!Number.isFinite(jamKontakMingguan) || jamKontakMingguan < 0) {
      toast.error('Jam kontak mingguan tidak sah.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/api/modul/${editing.id}`, {
          namaModul,
          kodModul,
          kategori: form.kategori,
          jamKredit,
          jamKontakMingguan,
        })
        toast.success('Modul berjaya dikemas kini.')
      } else {
        await api.post('/api/modul', {
          kumpulanId: form.kumpulanId,
          namaModul,
          kodModul,
          kategori: form.kategori,
          jamKredit,
          jamKontakMingguan,
        })
        toast.success('Modul baharu berjaya ditambah.')
      }
      setDialogOpen(false)
      modulApi.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ralat tidak diketahui.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.del(`/api/modul/${deleteTarget.id}`)
      toast.success('Modul berjaya dipadam.')
      setDeleteTarget(null)
      modulApi.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ralat tidak diketahui.')
    } finally {
      setDeleting(false)
    }
  }

  const isLoading =
    modulApi.loading || kursusApi.loading || kumpulanApi.loading

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengurusan Modul / Subjek"
        description="Daftar subjuk (modul) untuk setiap kumpulan semester dan kategori."
        icon={Boxes}
        actions={
          canManage ? (
            <Button onClick={openCreate} className="bg-primary">
              <Plus className="h-4 w-4" /> Tambah Modul
            </Button>
          ) : null
        }
      />

      {/* Info alert */}
      <Alert className="glass-card border-0 border-l-4 border-l-primary">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">Nota Penting</AlertTitle>
        <AlertDescription>
          Subjek Umum yang sama (cth: Bahasa Melayu) boleh dikongsi merentasi
          kursus — sistem akan mengesan pertindihan pensyarah yang sama mengajar
          di slot serupa.
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <Card className="glass-card border-0">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
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
          <div className="space-y-1.5 flex-1 min-w-0">
            <Label className="text-xs">Tapis Kategori</Label>
            <Select
              value={filterKategori}
              onValueChange={setFilterKategori}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                <SelectItem value="TERAS">Teras</SelectItem>
                <SelectItem value="UMUM">Umum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingState label="Memuatkan modul..." />
      ) : visibleModul.length === 0 ? (
        <EmptyState
          title="Tiada modul dijumpai"
          description="Tambah modul baharu atau ubah penapis untuk melihat senarai."
          icon={Boxes}
          action={
            canManage ? (
              <Button onClick={openCreate} className="bg-primary">
                <Plus className="h-4 w-4" /> Tambah Modul
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard label="Jumlah Modul" value={totalModul} icon={Boxes} />
            <StatCard
              label="Modul Teras"
              value={totalTeras}
              icon={GraduationCap}
              variant="success"
            />
            <StatCard
              label="Modul Umum"
              value={totalUmum}
              icon={Layers}
              variant="warning"
            />
            <StatCard label="Slot Aktif" value={totalSlot} icon={Clock} />
          </div>

          <Card className="glass-card border-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead>Kod</TableHead>
                    <TableHead>Nama Modul</TableHead>
                    <TableHead>Kursus</TableHead>
                    <TableHead>Sem</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-center">Jam Kredit</TableHead>
                    <TableHead className="text-center">Jam Kontak</TableHead>
                    <TableHead className="text-center">Slot</TableHead>
                    {canManage && <TableHead className="text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleModul.map((m) => (
                    <TableRow key={m.id} className="border-border/40">
                      <TableCell className="font-mono text-xs font-medium">
                        {m.kodModul}
                      </TableCell>
                      <TableCell className="font-medium">
                        {m.namaModul}
                      </TableCell>
                      <TableCell>
                        <Badge variant="info" className="font-mono">
                          {m.kumpulan?.kursus?.kodKursus ?? '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>{m.kumpulan?.semesterNo ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant={KATEGORI_BADGE[m.kategori]}>
                          {KATEGORI_LABEL[m.kategori]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          {m.jamKredit}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {m.jamKontakMingguan}j
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {m._count?.slotJadual ?? 0}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => openEdit(m)}
                              aria-label="Edit modul"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(m)}
                              aria-label="Padam modul"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong border-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Modul' : 'Tambah Modul Baharu'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Kemas kini maklumat modul.'
                : 'Isi maklumat modul untuk kumpulan semester.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label htmlFor="kumpulanId">Kumpulan Semester</Label>
              {formKumpulanList.length === 0 ? (
                <p className="text-xs text-destructive">
                  Tiada kumpulan semester tersedia untuk ditambah modul.
                </p>
              ) : (
                <Select
                  value={form.kumpulanId}
                  onValueChange={(v) =>
                    setForm((s) => ({ ...s, kumpulanId: v }))
                  }
                  disabled={!!editing}
                >
                  <SelectTrigger id="kumpulanId" className="w-full">
                    <SelectValue placeholder="Pilih kumpulan semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {formKumpulanList.map((kp) => (
                      <SelectItem key={kp.id} value={kp.id}>
                        {kp.kursus?.kodKursus ?? '?'} Sem {kp.semesterNo} —{' '}
                        {kp.kohortNama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {editing && (
                <p className="text-[11px] text-muted-foreground">
                  Kumpulan semester tidak boleh diubah semasa edit.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kodModul">Kod Modul</Label>
              <Input
                id="kodModul"
                value={form.kodModul}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    kodModul: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="cth: DTE3013"
                className="font-mono"
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="namaModul">Nama Modul</Label>
              <Input
                id="namaModul"
                value={form.namaModul}
                onChange={(e) =>
                  setForm((s) => ({ ...s, namaModul: e.target.value }))
                }
                placeholder="cth: Sistem Digital"
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <RadioGroup
                value={form.kategori}
                onValueChange={(v) =>
                  setForm((s) => ({ ...s, kategori: v as Modul['kategori'] }))
                }
                className="grid grid-cols-2 gap-2"
              >
                <label
                  htmlFor="kat-teras"
                  className="flex items-center gap-2 rounded-md border border-border/60 p-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <RadioGroupItem id="kat-teras" value="TERAS" />
                  <span className="text-sm">Teras</span>
                </label>
                <label
                  htmlFor="kat-umum"
                  className="flex items-center gap-2 rounded-md border border-border/60 p-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <RadioGroupItem id="kat-umum" value="UMUM" />
                  <span className="text-sm">Umum</span>
                </label>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="jamKredit">Jam Kredit</Label>
                <Input
                  id="jamKredit"
                  type="number"
                  min={0}
                  step="0.5"
                  value={form.jamKredit}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, jamKredit: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jamKontak">Jam Kontak / Minggu</Label>
                <Input
                  id="jamKontak"
                  type="number"
                  min={0}
                  step="0.5"
                  value={form.jamKontakMingguan}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      jamKontakMingguan: e.target.value,
                    }))
                  }
                />
              </div>
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

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="glass-strong border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Padam modul ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan memadam modul{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget?.namaModul}
              </span>{' '}
              ({deleteTarget?.kodModul}). Slot jadual berkaitan juga akan
              terjejas. Tindakan ini tidak boleh diundur.
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
