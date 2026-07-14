'use client'

import * as React from 'react'
import {
  FileText,
  Plus,
  Check,
  X,
  Loader2,
  Inbox,
  Clock,
  User,
  MapPin,
  Calendar,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'

import { api, ApiError } from '@/lib/api-client'
import {
  HARI_LIST,
  HARI_LABELS,
  TIME_SLOTS,
  type SessionUser,
  type PermohonanPertukaran,
  type Pensyarah,
  type SlotJadual,
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

type StatusFilter = 'all' | 'MENUNGGU' | 'DILULUSKAN' | 'DITOLAK'

interface PermohonanListResponse {
  permohonan: PermohonanPertukaran[]
}

interface SlotListResponse {
  slots: SlotJadual[]
}

function statusBadge(s: PermohonanPertukaran['status']) {
  if (s === 'MENUNGGU') return <Badge variant="warning">MENUNGGU</Badge>
  if (s === 'DILULUSKAN') return <Badge variant="success">DILULUSKAN</Badge>
  return <Badge variant="danger">DITOLAK</Badge>
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('ms-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function PermohonanSection({ user }: { user: SessionUser }) {
  const canApprove = ['TIMBALAN_PENGARAH', 'HEA', 'KETUA_KURSUS'].includes(user.role)
  const isPensyarah = user.role === 'PENSYARAH'

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('MENUNGGU')
  const [tab, setTab] = React.useState<'list' | 'form'>('list')

  // List fetch
  const listUrl = React.useMemo(() => {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    return `/api/permohonan?${params.toString()}`
  }, [statusFilter])

  const { data, loading, refresh } = useApi<PermohonanListResponse>(
    () => api.get(listUrl),
    [listUrl],
  )

  // Supporting data
  const { data: pensyarahData } = useApi<{ pensyarah: Pensyarah[] }>(
    () => api.get('/api/pensyarah'),
    [],
  )

  // Approve/Reject dialog state
  const [actionTarget, setActionTarget] = React.useState<PermohonanPertukaran | null>(null)
  const [actionMode, setActionMode] = React.useState<'approve' | 'reject'>('approve')
  const [catatan, setCatatan] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  function openActionDialog(p: PermohonanPertukaran, mode: 'approve' | 'reject') {
    setActionTarget(p)
    setActionMode(mode)
    setCatatan('')
  }

  async function submitAction() {
    if (!actionTarget) return
    setSubmitting(true)
    try {
      const url = `/api/permohonan/${actionTarget.id}/${actionMode}`
      await api.post(url, { catatan: catatan || undefined })
      toast.success(
        actionMode === 'approve'
          ? 'Permohonan diluluskan & slot dikemas kini.'
          : 'Permohonan ditolak.',
      )
      setActionTarget(null)
      refresh()
    } catch (e) {
      const err = e as ApiError
      toast.error(err?.message || 'Ralat memproses permohonan.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter for pensyarah — show only their own
  const visiblePermohonan = React.useMemo(() => {
    if (!data?.permohonan) return []
    if (isPensyarah && user.pensyarahId) {
      return data.permohonan.filter((p) => p.pensyarahId === user.pensyarahId)
    }
    return data.permohonan
  }, [data, isPensyarah, user.pensyarahId])

  const counts = React.useMemo(() => {
    const all = data?.permohonan ?? []
    const scoped = isPensyarah && user.pensyarahId
      ? all.filter((p) => p.pensyarahId === user.pensyarahId)
      : all
    return {
      menunggu: scoped.filter((p) => p.status === 'MENUNGGU').length,
      diluluskan: scoped.filter((p) => p.status === 'DILULUSKAN').length,
      ditolak: scoped.filter((p) => p.status === 'DITOLAK').length,
      total: scoped.length,
    }
  }, [data, isPensyarah, user.pensyarahId])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Permohonan Pertukaran Slot"
        description="Borang permohonan (alternatif Jotform) — urus permohonan pertukaran slot kelas."
        icon={FileText}
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jumlah Permohonan" value={counts.total} icon={FileText} />
        <StatCard label="Menunggu" value={counts.menunggu} icon={Clock} variant={counts.menunggu > 0 ? 'warning' : 'success'} />
        <StatCard label="Diluluskan" value={counts.diluluskan} icon={Check} variant="success" />
        <StatCard label="Ditolak" value={counts.ditolak} icon={X} variant="danger" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'list' | 'form')}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="list">Senarai Permohonan</TabsTrigger>
          <TabsTrigger value="form">
            <Plus className="h-3.5 w-3.5 mr-1" /> Borang Baharu
          </TabsTrigger>
        </TabsList>

        {/* LIST TAB */}
        <TabsContent value="list" className="mt-4 space-y-4">
          <GlassPanel>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-medium shrink-0">
                <Filter className="h-4 w-4 text-muted-foreground" /> Tapis Status:
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="MENUNGGU">Menunggu</SelectItem>
                  <SelectItem value="DILULUSKAN">Diluluskan</SelectItem>
                  <SelectItem value="DITOLAK">Ditolak</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </GlassPanel>

          <GlassPanel>
            <CardContent className="p-4">
              {loading ? (
                <LoadingState label="Memuatkan permohonan..." />
              ) : visiblePermohonan.length === 0 ? (
                <EmptyState
                  title="Tiada permohonan"
                  description={
                    statusFilter === 'all'
                      ? 'Belum ada permohonan pertukaran dihantar.'
                      : `Tiada permohonan dengan status "${statusFilter}".`
                  }
                  icon={Inbox}
                />
              ) : (
                <PermohonanCards
                  permohonan={visiblePermohonan}
                  canApprove={canApprove}
                  onApprove={(p) => openActionDialog(p, 'approve')}
                  onReject={(p) => openActionDialog(p, 'reject')}
                />
              )}
            </CardContent>
          </GlassPanel>
        </TabsContent>

        {/* FORM TAB */}
        <TabsContent value="form" className="mt-4">
          <PermohonanForm
            user={user}
            pensyarahList={pensyarahData?.pensyarah ?? []}
            onDone={() => {
              setTab('list')
              refresh()
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Approve/Reject Dialog */}
      <Dialog open={!!actionTarget} onOpenChange={(o) => !o && setActionTarget(null)}>
        <DialogContent className="glass-strong border-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionMode === 'approve' ? 'Luluskan Permohonan' : 'Tolak Permohonan'}
            </DialogTitle>
            <DialogDescription>
              {actionMode === 'approve'
                ? 'Slot akan dipindahkan ke cadangan baharu selepas diluluskan.'
                : 'Permohonan akan ditandakan sebagai ditolak.'}
            </DialogDescription>
          </DialogHeader>

          {actionTarget && (
            <div className="rounded-md border border-border/40 bg-muted/30 p-3 text-xs space-y-1">
              <p>
                <span className="text-muted-foreground">Pensyarah:</span>{' '}
                <span className="font-medium">{actionTarget.pensyarah?.nama}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Slot Asal:</span>{' '}
                <span className="font-medium">
                  {actionTarget.slotAsal?.modul?.namaModul} ·{' '}
                  {HARI_LABELS[actionTarget.slotAsal?.hari ?? ''] || actionTarget.slotAsal?.hari}{' '}
                  {actionTarget.slotAsal?.masaMula}-{actionTarget.slotAsal?.masaTamat}
                </span>
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="catatan">Catatan (pilihan)</Label>
            <Textarea
              id="catatan"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder={
                actionMode === 'approve'
                  ? 'Catatan pelulusan...'
                  : 'Sebab penolakan...'
              }
              rows={3}
              className="mt-1"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionTarget(null)}>
              Batal
            </Button>
            <Button
              onClick={submitAction}
              disabled={submitting}
              variant={actionMode === 'approve' ? 'default' : 'destructive'}
              className="gap-1.5"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {actionMode === 'approve' ? (
                <>
                  <Check className="h-4 w-4" /> Luluskan
                </>
              ) : (
                <>
                  <X className="h-4 w-4" /> Tolak
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ List rendering (cards on mobile, table on desktop) ============
function PermohonanCards({
  permohonan,
  canApprove,
  onApprove,
  onReject,
}: {
  permohonan: PermohonanPertukaran[]
  canApprove: boolean
  onApprove: (p: PermohonanPertukaran) => void
  onReject: (p: PermohonanPertukaran) => void
}) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pensyarah</TableHead>
              <TableHead>Slot Asal</TableHead>
              <TableHead>Slot Cadangan</TableHead>
              <TableHead>Alasan</TableHead>
              <TableHead>Sumber</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tarikh</TableHead>
              {canApprove && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {permohonan.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-sm">
                  <p className="font-medium">{p.pensyarah?.nama}</p>
                  <p className="text-xs text-muted-foreground">{p.pensyarah?.email}</p>
                </TableCell>
                <TableCell className="text-sm">
                  <p className="font-medium truncate max-w-[180px]">
                    {p.slotAsal?.modul?.namaModul ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {HARI_LABELS[p.slotAsal?.hari ?? ''] || p.slotAsal?.hari}{' '}
                    {p.slotAsal?.masaMula}-{p.slotAsal?.masaTamat}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.slotAsal?.bilik?.namaBilik ?? 'Tiada bilik'}
                  </p>
                </TableCell>
                <TableCell className="text-sm">
                  {p.slotCadanganHari ? (
                    <>
                      <p className="font-medium">
                        {HARI_LABELS[p.slotCadanganHari] || p.slotCadanganHari}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.slotCadanganMasaMula}-{p.slotCadanganMasaTamat}
                      </p>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs max-w-[200px]">
                  <p className="truncate" title={p.alasan}>
                    {p.alasan}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant={p.sumber === 'JOTFORM' ? 'info' : 'default'}>
                    {p.sumber}
                  </Badge>
                </TableCell>
                <TableCell>{statusBadge(p.status)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(p.createdAt)}
                </TableCell>
                {canApprove && (
                  <TableCell className="text-right">
                    {p.status === 'MENUNGGU' ? (
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onApprove(p)}
                          className="gap-1 h-8 text-xs"
                        >
                          <Check className="h-3 w-3" /> Lulus
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onReject(p)}
                          className="gap-1 h-8 text-xs text-red-600 hover:text-red-700"
                        >
                          <X className="h-3 w-3" /> Tolak
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {p.diluluskanOleh ? `oleh ${p.diluluskanOleh}` : '—'}
                      </span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-2 max-h-[70vh] overflow-y-auto scrollbar-thin">
        {permohonan.map((p) => (
          <Card key={p.id} className="glass-card border-0">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.pensyarah?.nama}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.pensyarah?.email}
                  </p>
                </div>
                {statusBadge(p.status)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="text-muted-foreground flex items-center gap-1 mb-0.5">
                    <Calendar className="h-3 w-3" /> Slot Asal
                  </p>
                  <p className="font-medium truncate">{p.slotAsal?.modul?.namaModul}</p>
                  <p>
                    {HARI_LABELS[p.slotAsal?.hari ?? ''] || p.slotAsal?.hari}{' '}
                    {p.slotAsal?.masaMula}-{p.slotAsal?.masaTamat}
                  </p>
                  <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {p.slotAsal?.bilik?.namaBilik ?? '—'}
                  </p>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="text-muted-foreground flex items-center gap-1 mb-0.5">
                    <Calendar className="h-3 w-3" /> Cadangan
                  </p>
                  {p.slotCadanganHari ? (
                    <>
                      <p className="font-medium">
                        {HARI_LABELS[p.slotCadanganHari] || p.slotCadanganHari}
                      </p>
                      <p>
                        {p.slotCadanganMasaMula}-{p.slotCadanganMasaTamat}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </div>
              </div>

              <div className="text-xs">
                <p className="text-muted-foreground flex items-center gap-1 mb-0.5">
                  <User className="h-3 w-3" /> Alasan
                </p>
                <p className="line-clamp-2">{p.alasan}</p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Badge variant={p.sumber === 'JOTFORM' ? 'info' : 'default'}>
                  {p.sumber}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</span>
              </div>

              {canApprove && p.status === 'MENUNGGU' && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="gap-1 flex-1 h-8 text-xs"
                    onClick={() => onApprove(p)}
                  >
                    <Check className="h-3 w-3" /> Lulus
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 flex-1 h-8 text-xs text-red-600"
                    onClick={() => onReject(p)}
                  >
                    <X className="h-3 w-3" /> Tolak
                  </Button>
                </div>
              )}

              {p.status !== 'MENUNGGU' && p.diluluskanOleh && (
                <p className="text-xs text-muted-foreground">
                  Diproses oleh: {p.diluluskanOleh}
                  {p.catatanPengurus && ` · ${p.catatanPengurus}`}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

// ============ New Permohonan Form ============
function PermohonanForm({
  user,
  pensyarahList,
  onDone,
}: {
  user: SessionUser
  pensyarahList: Pensyarah[]
  onDone: () => void
}) {
  const isPensyarah = user.role === 'PENSYARAH'
  const [pensyarahId, setPensyarahId] = React.useState(
    isPensyarah && user.pensyarahId ? user.pensyarahId : '',
  )
  const [slotAsalId, setSlotAsalId] = React.useState('')
  const [cadHari, setCadHari] = React.useState<string>('ISNIN')
  const [cadMula, setCadMula] = React.useState('08:00')
  const [cadTamat, setCadTamat] = React.useState('09:00')
  const [alasan, setAlasan] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  // Fetch slots for selected pensyarah
  const { data: slotData, loading: slotLoading } = useApi<SlotListResponse>(
    () =>
      pensyarahId
        ? api.get(`/api/jadual?pensyarahId=${encodeURIComponent(pensyarahId)}`)
        : Promise.resolve({ slots: [] }),
    [pensyarahId],
  )

  async function handleSubmit() {
    if (!pensyarahId || !slotAsalId || !alasan.trim()) {
      toast.error('Pensyarah, slot asal dan alasan diperlukan.')
      return
    }
    if (cadMula >= cadTamat) {
      toast.error('Masa mula mesti lebih awal dari masa tamat.')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/api/permohonan', {
        pensyarahId,
        slotAsalId,
        slotCadanganHari: cadHari,
        slotCadanganMasaMula: cadMula,
        slotCadanganMasaTamat: cadTamat,
        alasan: alasan.trim(),
        sumber: 'MANUAL',
      })
      toast.success('Permohonan dihantar. Sila tunggu kelulusan.')
      onDone()
    } catch (e) {
      const err = e as ApiError
      toast.error(err?.message || 'Ralat menghantar permohonan.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="glass-strong border-0">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Borang Permohonan Pertukaran Slot</h3>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Borang terbina dalam ASTS (alternatif kepada Jotform). Semua permohonan direkod dalam audit log.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="pensyarah">Pensyarah</Label>
            <Select
              value={pensyarahId}
              onValueChange={(v) => {
                setPensyarahId(v)
                setSlotAsalId('')
              }}
              disabled={isPensyarah}
            >
              <SelectTrigger id="pensyarah" className="w-full mt-1">
                <SelectValue placeholder="— Pilih pensyarah —" />
              </SelectTrigger>
              <SelectContent>
                {pensyarahList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isPensyarah && (
              <p className="text-xs text-muted-foreground mt-1">Dikunci kepada akaun anda.</p>
            )}
          </div>

          <div>
            <Label htmlFor="slotAsal">Slot Asal</Label>
            <Select
              value={slotAsalId}
              onValueChange={setSlotAsalId}
              disabled={!pensyarahId || slotLoading}
            >
              <SelectTrigger id="slotAsal" className="w-full mt-1">
                <SelectValue
                  placeholder={
                    !pensyarahId
                      ? 'Pilih pensyarah dahulu'
                      : slotLoading
                        ? 'Memuatkan slot...'
                        : '— Pilih slot —'
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {slotData?.slots.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.modul?.namaModul} · {HARI_LABELS[s.hari] || s.hari} {s.masaMula}-{s.masaTamat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="cadHari">Hari Cadangan</Label>
            <Select value={cadHari} onValueChange={setCadHari}>
              <SelectTrigger id="cadHari" className="w-full mt-1">
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
            <Label htmlFor="cadMula">Masa Mula</Label>
            <Select value={cadMula} onValueChange={setCadMula}>
              <SelectTrigger id="cadMula" className="w-full mt-1">
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
            <Label htmlFor="cadTamat">Masa Tamat</Label>
            <Select value={cadTamat} onValueChange={setCadTamat}>
              <SelectTrigger id="cadTamat" className="w-full mt-1">
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

        <div>
          <Label htmlFor="alasan">Alasan Pertukaran</Label>
          <Textarea
            id="alasan"
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Nyatakan sebab pertukaran slot (cth. mesyuarat, kursus, hal peribadi)..."
            rows={4}
            className="mt-1"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Hantar Permohonan
          </Button>
          <Button variant="outline" onClick={onDone}>
            Batal
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
