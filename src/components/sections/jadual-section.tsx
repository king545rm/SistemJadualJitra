'use client'

import * as React from 'react'
import {
  CalendarDays,
  Plus,
  AlertTriangle,
  Pencil,
  Trash2,
  Lightbulb,
  X,
  GripVertical,
  Loader2,
  CalendarRange,
  Users,
  User,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'

import { api, ApiError } from '@/lib/api-client'
import {
  HARI_LIST,
  HARI_LABELS,
  TIME_SLOTS,
  type SlotJadual,
  type SessionUser,
  type ClashResult,
  type ClashDetail,
  type Kursus,
  type Pensyarah,
  type Bilik,
  type Modul,
  type KumpulanSemester,
} from '@/lib/types'

import {
  PageHeader,
  StatCard,
  LoadingState,
  EmptyState,
  Badge,
  GlassPanel,
  useApi,
} from '@/components/sections/shared'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type ViewMode = 'master' | 'kursus' | 'pensyarah' | 'kumpulan'

interface JadualViewResponse {
  view: string
  slots: SlotJadual[]
  grid: Record<string, Record<string, SlotJadual[]>>
  byKursus: Record<string, SlotJadual[]> | null
  hari: string[]
  timeSlots: { mula: string; tamat: string }[]
}

interface ClashSlotInfo {
  id: string
  hari: string
  masaMula: string
  masaTamat: string
  modulNama: string
  pensyarahNama: string
  bilikNama: string | null
  kursusKod: string
  semesterNo: number
}

interface ClashEntry {
  slotA: ClashSlotInfo
  slotB: ClashSlotInfo
  type: 'LECTURER' | 'ROOM' | 'GROUP'
}

interface ClashesResponse {
  clashes: ClashEntry[]
  totalClashes: number
}

interface SlotMutationResponse {
  slot: SlotJadual
  clash: ClashResult
}

interface AlternativeSuggestion {
  hari: string
  masaMula: string
  masaTamat: string
  clashFree: boolean
}

interface AlternativesResponse {
  suggestions: AlternativeSuggestion[]
}

interface SlotFormState {
  modulId: string
  pensyarahId: string
  bilikId: string
  hari: string
  masaMula: string
  masaTamat: string
}

const EMPTY_FORM: SlotFormState = {
  modulId: '',
  pensyarahId: '',
  bilikId: '',
  hari: 'ISNIN',
  masaMula: '08:00',
  masaTamat: '09:00',
}

function clashTypeLabel(t: string) {
  if (t === 'LECTURER') return 'Pensyarah'
  if (t === 'ROOM') return 'Bilik'
  if (t === 'GROUP') return 'Kumpulan'
  return t
}

function formatTimeRange(mula: string, tamat: string) {
  return `${mula} - ${tamat}`
}

function truncate(s: string, n: number) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

export function JadualSection({ user }: { user: SessionUser }) {
  const canManage = ['TIMBALAN_PENGARAH', 'HEA', 'KETUA_KURSUS'].includes(user.role)
  const [view, setView] = React.useState<ViewMode>(
    user.role === 'PENSYARAH' ? 'pensyarah' : 'master',
  )
  const [kursusId, setKursusId] = React.useState('')
  const [pensyarahId, setPensyarahId] = React.useState(
    user.role === 'PENSYARAH' && user.pensyarahId ? user.pensyarahId : '',
  )
  const [kumpulanId, setKumpulanId] = React.useState('')

  // Supporting data
  const { data: kursusData } = useApi<{ kursus: Kursus[] }>(() => api.get('/api/kursus'), [])
  const { data: pensyarahData } = useApi<{ pensyarah: Pensyarah[] }>(
    () => api.get('/api/pensyarah'),
    [],
  )
  const { data: kumpulanData } = useApi<{ kumpulan: KumpulanSemester[] }>(
    () => api.get('/api/kumpulan'),
    [],
  )
  const { data: bilikData } = useApi<{ bilik: Bilik[] }>(() => api.get('/api/bilik'), [])
  const { data: modulData } = useApi<{ modul: Modul[] }>(() => api.get('/api/modul'), [])

  // Build the view URL
  const viewUrl = React.useMemo(() => {
    const params = new URLSearchParams({ view })
    if (view === 'kursus' && kursusId) params.set('kursusId', kursusId)
    if (view === 'pensyarah' && pensyarahId) params.set('pensyarahId', pensyarahId)
    if (view === 'kumpulan' && kumpulanId) params.set('kumpulanId', kumpulanId)
    return `/api/jadual/view?${params.toString()}`
  }, [view, kursusId, pensyarahId, kumpulanId])

  const { data: viewData, loading: viewLoading, refresh: refreshView } = useApi<JadualViewResponse>(
    () => api.get(viewUrl),
    [viewUrl],
  )

  // Clashes
  const {
    data: clashesData,
    loading: clashesLoading,
    refresh: refreshClashes,
  } = useApi<ClashesResponse>(() => api.get('/api/jadual/clashes'), [])

  // Build a set of slot IDs that are in any clash
  const clashedSlotIds = React.useMemo(() => {
    const s = new Set<string>()
    if (clashesData?.clashes) {
      for (const c of clashesData.clashes) {
        s.add(c.slotA.id)
        s.add(c.slotB.id)
      }
    }
    return s
  }, [clashesData])

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingSlot, setEditingSlot] = React.useState<SlotJadual | null>(null)
  const [form, setForm] = React.useState<SlotFormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = React.useState(false)
  const [clashResult, setClashResult] = React.useState<ClashResult | null>(null)
  const [forceOverride, setForceOverride] = React.useState(false)
  const [alternatives, setAlternatives] = React.useState<AlternativeSuggestion[] | null>(null)
  const [loadingAlternatives, setLoadingAlternatives] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<SlotJadual | null>(null)

  // Collapsible clashes panel
  const [clashesOpen, setClashesOpen] = React.useState(true)

  // DnD state
  const [activeDragSlot, setActiveDragSlot] = React.useState<SlotJadual | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  function openAddDialog(prefill?: Partial<SlotFormState>) {
    setEditingSlot(null)
    setForm({
      ...EMPTY_FORM,
      pensyarahId: user.role === 'PENSYARAH' && user.pensyarahId ? user.pensyarahId : '',
      ...prefill,
    })
    setClashResult(null)
    setForceOverride(false)
    setAlternatives(null)
    setDialogOpen(true)
  }

  function openEditDialog(slot: SlotJadual) {
    setEditingSlot(slot)
    setForm({
      modulId: slot.modulId,
      pensyarahId: slot.pensyarahId,
      bilikId: slot.bilikId ?? '',
      hari: slot.hari,
      masaMula: slot.masaMula,
      masaTamat: slot.masaTamat,
    })
    setClashResult(null)
    setForceOverride(false)
    setAlternatives(null)
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.modulId || !form.pensyarahId || !form.hari || !form.masaMula || !form.masaTamat) {
      toast.error('Sila lengkapkan semua medan diperlukan.')
      return
    }
    if (form.masaMula >= form.masaTamat) {
      toast.error('Masa mula mesti lebih awal dari masa tamat.')
      return
    }
    setSubmitting(true)
    setClashResult(null)
    setAlternatives(null)
    try {
      const body: Record<string, unknown> = {
        modulId: form.modulId,
        pensyarahId: form.pensyarahId,
        bilikId: form.bilikId || null,
        hari: form.hari,
        masaMula: form.masaMula,
        masaTamat: form.masaTamat,
      }
      if (forceOverride) body.force = true

      const url = editingSlot ? `/api/jadual/${editingSlot.id}` : '/api/jadual'
      const res = await (editingSlot ? api.put<SlotMutationResponse>(url, body) : api.post<SlotMutationResponse>(url, body))

      if (res.clash?.hasClash && !forceOverride) {
        setClashResult(res.clash)
        toast.error('Pertindihan dikesan. Sila semak butiran di bawah.')
      } else {
        toast.success(editingSlot ? 'Slot dikemas kini.' : 'Slot baharu ditambah.')
        setDialogOpen(false)
        refreshView()
        refreshClashes()
      }
    } catch (e) {
      const err = e as ApiError
      if (err?.status === 409 && err?.data && typeof err.data === 'object' && 'clash' in err.data) {
        setClashResult((err.data as { clash: ClashResult }).clash)
        toast.error('Pertindihan dikesan. Sila semak butiran di bawah.')
      } else {
        toast.error(err?.message || 'Ralat semasa menyimpan slot.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.del(`/api/jadual/${deleteTarget.id}`)
      toast.success('Slot dipadam.')
      setDeleteTarget(null)
      setDialogOpen(false)
      refreshView()
      refreshClashes()
    } catch (e) {
      toast.error((e as Error).message || 'Ralat memadam slot.')
    }
  }

  async function loadAlternatives() {
    setLoadingAlternatives(true)
    try {
      const res = await api.post<AlternativesResponse>('/api/jadual/alternatives', {
        pensyarahId: form.pensyarahId,
        modulId: form.modulId,
        bilikId: form.bilikId || null,
        masaMula: form.masaMula,
        masaTamat: form.masaTamat,
      })
      setAlternatives(res.suggestions)
    } catch (e) {
      toast.error((e as Error).message || 'Ralat mencari alternatif.')
    } finally {
      setLoadingAlternatives(false)
    }
  }

  function applyAlternative(s: AlternativeSuggestion) {
    setForm((f) => ({ ...f, hari: s.hari, masaMula: s.masaMula, masaTamat: s.masaTamat }))
    setAlternatives(null)
    setClashResult(null)
    toast.success('Alternatif dipilih. Sila simpan untuk mengesahkan.')
  }

  // DnD handlers
  function onDragStart(e: DragStartEvent) {
    const slot = e.active.data.current?.slot as SlotJadual | undefined
    if (slot) setActiveDragSlot(slot)
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveDragSlot(null)
    if (!canManage) return
    const slot = e.active.data.current?.slot as SlotJadual | undefined
    const dropCellId = e.over?.id as string | undefined
    if (!slot || !dropCellId) return
    const [hari, masaMula] = dropCellId.split('|')
    if (!hari || !masaMula) return
    if (hari === slot.hari && masaMula === slot.masaMula) return

    // Compute new masaTamat from TIME_SLOTS lookup (same duration if possible)
    const curDurationIdx = TIME_SLOTS.findIndex((t) => t.mula === slot.masaMula)
    let masaTamat = masaMula
    if (curDurationIdx >= 0) {
      // Keep same duration in hours
      const startMin = toMin(slot.masaMula)
      const endMin = toMin(slot.masaTamat)
      const dur = endMin - startMin
      masaTamat = fromMin(toMin(masaMula) + dur)
    }

    // Optimistic-feeling PUT
    try {
      const res = await api.put<SlotMutationResponse>(`/api/jadual/${slot.id}`, {
        hari,
        masaMula,
        masaTamat,
      })
      if (res.clash?.hasClash) {
        toast.error('Pertindihan dikesan di lokasi baharu. Slot dikemas kini tetapi mempunyai konflik.')
      } else {
        toast.success('Slot dipindahkan.')
      }
      refreshView()
      refreshClashes()
    } catch (e) {
      const err = e as ApiError
      if (err?.status === 409) {
        toast.error('Pertindihan dikesan. Slot tidak dipindahkan. Sila pilih sel lain atau guna borang edit.')
      } else {
        toast.error(err?.message || 'Ralat memindahkan slot.')
      }
    }
  }

  const totalClashes = clashesData?.totalClashes ?? 0
  const totalSlots = viewData?.slots?.length ?? 0

  return (
    <div className="space-y-4">
      <PageHeader
        title="Jadual Kelas"
        description="Paparan jadual mingguan dengan pengesanan pertindihan & seret-lepas."
        icon={CalendarDays}
        actions={
          canManage && (
            <Button onClick={() => openAddDialog()} className="gap-1.5">
              <Plus className="h-4 w-4" /> Tambah Slot
            </Button>
          )
        }
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jumlah Slot" value={totalSlots} icon={CalendarRange} />
        <StatCard
          label="Pertindihan"
          value={totalClashes}
          icon={AlertTriangle}
          variant={totalClashes > 0 ? 'danger' : 'success'}
          trend={totalClashes > 0 ? 'Perlu tindakan' : 'Tiada konflik'}
        />
        <StatCard label="Pensyarah Aktif" value={pensyarahData?.pensyarah?.length ?? 0} icon={Users} />
        <StatCard label="Bilik Digunakan" value={bilikData?.bilik?.length ?? 0} icon={Layers} />
      </div>

      {/* View tabs */}
      <GlassPanel>
        <CardContent className="p-4 flex flex-col gap-3">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="master" className="gap-1.5">
                <CalendarRange className="h-3.5 w-3.5" /> Keseluruhan
              </TabsTrigger>
              <TabsTrigger value="kursus" className="gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Kursus
              </TabsTrigger>
              <TabsTrigger value="pensyarah" className="gap-1.5">
                <User className="h-3.5 w-3.5" /> Pensyarah
              </TabsTrigger>
              <TabsTrigger value="kumpulan" className="gap-1.5">
                <Users className="h-3.5 w-3.5" /> Kumpulan
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* View-specific filter */}
          {view === 'kursus' && (
            <div>
              <Label className="text-xs">Pilih Kursus</Label>
              <Select value={kursusId} onValueChange={setKursusId}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="— Pilih kursus —" />
                </SelectTrigger>
                <SelectContent>
                  {kursusData?.kursus.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.kodKursus} — {k.namaKursus}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {view === 'pensyarah' && (
            <div>
              <Label className="text-xs">Pilih Pensyarah</Label>
              <Select
                value={pensyarahId}
                onValueChange={setPensyarahId}
                disabled={user.role === 'PENSYARAH'}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="— Pilih pensyarah —" />
                </SelectTrigger>
                <SelectContent>
                  {pensyarahData?.pensyarah.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {user.role === 'PENSYARAH' && (
                <p className="text-xs text-muted-foreground mt-1">Dikunci kepada akaun anda.</p>
              )}
            </div>
          )}

          {view === 'kumpulan' && (
            <div>
              <Label className="text-xs">Pilih Kumpulan Semester</Label>
              <Select value={kumpulanId} onValueChange={setKumpulanId}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="— Pilih kumpulan —" />
                </SelectTrigger>
                <SelectContent>
                  {kumpulanData?.kumpulan.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.kursus?.kodKursus} · Sem {k.semesterNo} · {k.kohortNama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </GlassPanel>

      {/* Clashes panel */}
      {totalClashes > 0 && (
        <Collapsible open={clashesOpen} onOpenChange={setClashesOpen}>
          <GlassPanel>
            <CardContent className="p-4">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between text-left">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        Pertindihan Dikesan ({totalClashes})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Klik untuk {clashesOpen ? 'tutup' : 'buka'} senarai
                      </p>
                    </div>
                  </div>
                  <Badge variant="danger">{totalClashes} konflik</Badge>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2">
                {clashesLoading ? (
                  <LoadingState label="Memuatkan pertindihan..." />
                ) : (
                  clashesData?.clashes.map((c, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex flex-col sm:flex-row sm:items-center gap-2"
                    >
                      <Badge variant="danger">{clashTypeLabel(c.type)}</Badge>
                      <div className="flex-1 min-w-0 text-sm">
                        <span className="font-medium">
                          {c.slotA.modulNama}
                        </span>{' '}
                        <span className="text-muted-foreground">
                          ({c.slotA.kursusKod} Sem{c.slotA.semesterNo})
                        </span>{' '}
                        — {HARI_LABELS[c.slotA.hari] || c.slotA.hari} {formatTimeRange(c.slotA.masaMula, c.slotA.masaTamat)}
                        <span className="text-muted-foreground"> vs </span>
                        {c.slotB.modulNama} ({c.slotB.kursusKod} Sem{c.slotB.semesterNo}) — {HARI_LABELS[c.slotB.hari] || c.slotB.hari} {formatTimeRange(c.slotB.masaMula, c.slotB.masaTamat)}
                      </div>
                      {canManage && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Open edit for slotA — find full slot from viewData
                            const slot = viewData?.slots.find((s) => s.id === c.slotA.id)
                            if (slot) openEditDialog(slot)
                          }}
                        >
                          Selesaikan
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CollapsibleContent>
            </CardContent>
          </GlassPanel>
        </Collapsible>
      )}

      {/* Timetable grid */}
      <GlassPanel>
        <CardContent className="p-4">
          {viewLoading ? (
            <LoadingState label="Memuatkan jadual..." />
          ) : !viewData || viewData.slots.length === 0 ? (
            <EmptyState
              title="Tiada slot dijumpai"
              description={
                view === 'pensyarah' && !pensyarahId
                  ? 'Sila pilih pensyarah terlebih dahulu.'
                  : view === 'kursus' && !kursusId
                    ? 'Sila pilih kursus terlebih dahulu.'
                    : view === 'kumpulan' && !kumpulanId
                      ? 'Sila pilih kumpulan terlebih dahulu.'
                      : 'Belum ada slot dijadualkan untuk paparan ini.'
              }
              icon={CalendarDays}
              action={
                canManage && (
                  <Button onClick={() => openAddDialog()} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Tambah Slot Pertama
                  </Button>
                )
              }
            />
          ) : (
            <TimetableView
              grid={viewData.grid}
              clashedSlotIds={clashedSlotIds}
              canManage={canManage}
              onSlotClick={(s) => (canManage ? openEditDialog(s) : undefined)}
              onEmptyCellClick={(hari, masaMula) =>
                canManage ? openAddDialog({ hari, masaMula }) : undefined
              }
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              sensors={sensors}
              activeDragSlot={activeDragSlot}
            />
          )}
        </CardContent>
      </GlassPanel>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong border-0 sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSlot ? 'Edit Slot' : 'Tambah Slot Baharu'}
            </DialogTitle>
            <DialogDescription>
              Isikan butiran slot kelas. Sistem akan mengesan pertindihan secara automatik.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div>
              <Label htmlFor="modul">Modul / Subjek</Label>
              <Select value={form.modulId} onValueChange={(v) => setForm((f) => ({ ...f, modulId: v }))}>
                <SelectTrigger id="modul" className="w-full mt-1">
                  <SelectValue placeholder="— Pilih modul —" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {modulData?.modul.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.kodModul} · {truncate(m.namaModul, 35)} ({m.kategori})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="pensyarah">Pensyarah</Label>
              <Select
                value={form.pensyarahId}
                onValueChange={(v) => setForm((f) => ({ ...f, pensyarahId: v }))}
                disabled={user.role === 'PENSYARAH'}
              >
                <SelectTrigger id="pensyarah" className="w-full mt-1">
                  <SelectValue placeholder="— Pilih pensyarah —" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {pensyarahData?.pensyarah.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bilik">Bilik / Makmal</Label>
              <Select value={form.bilikId} onValueChange={(v) => setForm((f) => ({ ...f, bilikId: v }))}>
                <SelectTrigger id="bilik" className="w-full mt-1">
                  <SelectValue placeholder="— Tiada bilik —" />
                </SelectTrigger>
                <SelectContent>
                  {bilikData?.bilik.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.namaBilik} ({b.jenis}, {b.kapasiti})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="hari">Hari</Label>
                <Select value={form.hari} onValueChange={(v) => setForm((f) => ({ ...f, hari: v }))}>
                  <SelectTrigger id="hari" className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HARI_LIST.map((h) => (
                      <SelectItem key={h} value={h}>
                        {HARI_LABELS[h]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mula">Masa Mula</Label>
                <Select value={form.masaMula} onValueChange={(v) => setForm((f) => ({ ...f, masaMula: v }))}>
                  <SelectTrigger id="mula" className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t.mula} value={t.mula}>
                        {t.mula}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tamat">Masa Tamat</Label>
                <Select value={form.masaTamat} onValueChange={(v) => setForm((f) => ({ ...f, masaTamat: v }))}>
                  <SelectTrigger id="tamat" className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t.tamat} value={t.tamat}>
                        {t.tamat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clash alert */}
            {clashResult?.hasClash && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-4 w-4" /> Pertindihan dikesan
                </div>
                <ul className="text-xs space-y-1 text-red-700 dark:text-red-300">
                  {clashResult.lecturerClashes.map((c, i) => (
                    <li key={`l-${i}`}>• {c.message}</li>
                  ))}
                  {clashResult.roomClashes.map((c, i) => (
                    <li key={`r-${i}`}>• {c.message}</li>
                  ))}
                  {clashResult.groupClashes.map((c, i) => (
                    <li key={`g-${i}`}>• {c.message}</li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadAlternatives}
                    disabled={loadingAlternatives}
                    className="gap-1.5"
                  >
                    {loadingAlternatives ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Lightbulb className="h-3.5 w-3.5" />
                    )}
                    Cari Slot Alternatif
                  </Button>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={forceOverride}
                      onCheckedChange={(v) => setForceOverride(v === true)}
                    />
                    Paksa Jadual (abaikan konflik)
                  </label>
                </div>

                {alternatives && (
                  <div className="pt-2 border-t border-red-500/20">
                    <p className="text-xs font-semibold mb-1.5">Slot alternatif bebas pertindihan:</p>
                    {alternatives.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Tiada alternatif dijumpai.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {alternatives.slice(0, 8).map((a, i) => (
                          <button
                            key={i}
                            onClick={() => applyAlternative(a)}
                            className={cn(
                              'text-xs rounded-md border px-2 py-1.5 text-left hover:bg-primary/10 transition-colors',
                              a.clashFree
                                ? 'border-emerald-500/40 bg-emerald-500/5'
                                : 'border-amber-500/40 bg-amber-500/5',
                            )}
                          >
                            <span className="font-medium">{HARI_LABELS[a.hari] || a.hari}</span>{' '}
                            {formatTimeRange(a.masaMula, a.masaTamat)}
                            {a.clashFree && (
                              <Badge variant="success" className="ml-1">Bebas</Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {editingSlot && (
              <Button
                variant="destructive"
                onClick={() => setDeleteTarget(editingSlot)}
                className="mr-auto gap-1.5"
              >
                <Trash2 className="h-4 w-4" /> Padam
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingSlot ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="glass-strong border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Padam slot ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak boleh diundur. Slot{' '}
              <span className="font-medium">
                {deleteTarget?.modul?.namaModul}
              </span>{' '}
              pada {HARI_LABELS[deleteTarget?.hari ?? ''] || deleteTarget?.hari}{' '}
              {deleteTarget?.masaMula}-{deleteTarget?.masaTamat} akan dipadam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Padam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============ Helper time utilities ============
function toMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function fromMin(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ============ TimetableView ============
interface TimetableViewProps {
  grid: Record<string, Record<string, SlotJadual[]>>
  clashedSlotIds: Set<string>
  canManage: boolean
  onSlotClick: (s: SlotJadual) => void
  onEmptyCellClick: (hari: string, masaMula: string) => void
  onDragStart: (e: DragStartEvent) => void
  onDragEnd: (e: DragEndEvent) => void
  sensors: ReturnType<typeof useSensors>
  activeDragSlot: SlotJadual | null
}

function TimetableView({
  grid,
  clashedSlotIds,
  canManage,
  onSlotClick,
  onEmptyCellClick,
  onDragStart,
  onDragEnd,
  sensors,
  activeDragSlot,
}: TimetableViewProps) {
  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="overflow-x-auto scrollbar-thin -mx-1 px-1">
        <div className="min-w-[860px]">
          {/* Header row */}
          <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-1 mb-1">
            <div className="text-xs font-semibold text-muted-foreground p-2">Masa</div>
            {HARI_LIST.map((h) => (
              <div
                key={h}
                className="text-center text-xs sm:text-sm font-semibold p-2 rounded-md bg-primary/10 text-primary"
              >
                {HARI_LABELS[h]}
              </div>
            ))}
          </div>

          {/* Time rows */}
          <div className="space-y-1">
            {TIME_SLOTS.map((ts) => (
              <div key={ts.mula} className="grid grid-cols-[80px_repeat(5,1fr)] gap-1">
                <div className="text-xs text-muted-foreground p-2 flex flex-col justify-center">
                  <span className="font-medium">{ts.mula}</span>
                  <span className="text-[10px] opacity-70">{ts.tamat}</span>
                </div>
                {HARI_LIST.map((h) => {
                  const cellSlots = grid?.[h]?.[ts.mula] ?? []
                  return (
                    <DroppableCell
                      key={`${h}-${ts.mula}`}
                      hari={h}
                      masaMula={ts.mula}
                      slots={cellSlots}
                      clashedSlotIds={clashedSlotIds}
                      canManage={canManage}
                      onSlotClick={onSlotClick}
                      onEmptyCellClick={onEmptyCellClick}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeDragSlot ? (
          <div className="rotate-2 opacity-90">
            <SlotCard slot={activeDragSlot} isClash={false} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// ============ Droppable cell ============
function DroppableCell({
  hari,
  masaMula,
  slots,
  clashedSlotIds,
  canManage,
  onSlotClick,
  onEmptyCellClick,
}: {
  hari: string
  masaMula: string
  slots: SlotJadual[]
  clashedSlotIds: Set<string>
  canManage: boolean
  onSlotClick: (s: SlotJadual) => void
  onEmptyCellClick: (hari: string, masaMula: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${hari}|${masaMula}` })
  const isEmpty = slots.length === 0

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[64px] rounded-md border p-1 space-y-1 transition-colors group',
        isOver
          ? 'border-primary/70 bg-primary/10'
          : isEmpty
            ? 'border-border/50 bg-muted/30'
            : 'border-border/30 bg-background/40',
      )}
    >
      {slots.map((s) => (
        <SlotCard
          key={s.id}
          slot={s}
          isClash={clashedSlotIds.has(s.id)}
          canManage={canManage}
          onClick={() => onSlotClick(s)}
        />
      ))}
      {isEmpty && canManage && (
        <button
          onClick={() => onEmptyCellClick(hari, masaMula)}
          className="w-full h-full min-h-[56px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
          aria-label={`Tambah slot pada ${HARI_LABELS[hari]} ${masaMula}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// ============ Slot card (draggable) ============
function SlotCard({
  slot,
  isClash,
  canManage = true,
  onClick,
  dragging = false,
}: {
  slot: SlotJadual
  isClash: boolean
  canManage?: boolean
  onClick?: () => void
  dragging?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: slot.id,
    data: { slot },
    disabled: !canManage,
  })

  const kategori = slot.modul?.kategori
  const kategoriClass =
    kategori === 'TERAS'
      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-100'
      : 'bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-100'

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Only treat as click if not dragging
        if (isDragging) return
        e.stopPropagation()
        onClick?.()
      }}
      className={cn(
        'rounded-md border p-1.5 cursor-pointer text-[11px] leading-tight select-none',
        kategoriClass,
        isClash && 'clash-highlight',
        isDragging && 'dragging-slot',
        dragging && 'shadow-lg',
        canManage && 'hover:scale-[1.02] transition-transform',
      )}
      title={`${slot.modul?.namaModul} · ${slot.pensyarah?.nama ?? ''} · ${slot.bilik?.namaBilik ?? 'Tiada bilik'}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="font-semibold truncate flex-1">
          {truncate(slot.modul?.namaModul ?? '—', 22)}
        </p>
        {canManage && (
          <GripVertical className="h-3 w-3 opacity-50 shrink-0" />
        )}
      </div>
      <p className="opacity-80 truncate">{slot.pensyarah?.nama ?? '—'}</p>
      <div className="flex items-center justify-between gap-1 mt-0.5">
        <span className="opacity-70 truncate">
          {slot.bilik?.namaBilik ?? '—'}
        </span>
        <span className="opacity-60 text-[10px]">
          {slot.masaMula}-{slot.masaTamat}
        </span>
      </div>
      {isClash && (
        <Badge variant="danger" className="mt-0.5 w-full justify-center text-[9px]">
          <AlertTriangle className="h-2.5 w-2.5" /> Pertindihan
        </Badge>
      )}
    </div>
  )
}
