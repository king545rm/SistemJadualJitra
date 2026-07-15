'use client'

import * as React from 'react'
import {
  Gauge,
  Users,
  AlertTriangle,
  RefreshCw,
  Info,
  Mail,
  Clock,
  BookOpen,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  PageHeader,
  StatCard,
  LoadingState,
  EmptyState,
  Badge,
  GlassPanel,
  useApi,
} from '@/components/sections/shared'
import { api } from '@/lib/api-client'
import type { SessionUser, LecturerLoad, SlotJadual } from '@/lib/types'
import { HARI_LABELS, TIME_SLOTS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type LoadStatus = LecturerLoad['status']

interface BebanResponse {
  loads: LecturerLoad[]
  byStatus: { SELAMAT: number; HAMPIR_HAD: number; MELEBIHI: number }
  avgLoad: number
  totalLecturers: number
}

interface JadualViewResponse {
  view: string
  slots: SlotJadual[]
  grid: Record<string, Record<string, SlotJadual[]>>
  hari: string[]
  timeSlots: Array<{ mula: string; tamat: string }>
}

interface BebanSectionProps {
  user: SessionUser
}

type FilterKey = 'ALL' | LoadStatus

const STATUS_LABEL: Record<LoadStatus, string> = {
  SELAMAT: 'Selamat',
  HAMPIR_HAD: 'Hampir Had',
  MELEBIHI: 'Melebihi',
}

const STATUS_BADGE_VARIANT: Record<
  LoadStatus,
  'success' | 'warning' | 'danger'
> = {
  SELAMAT: 'success',
  HAMPIR_HAD: 'warning',
  MELEBIHI: 'danger',
}

// Progress indicator colour by status (NO indigo/blue)
const STATUS_PROGRESS_COLOR: Record<LoadStatus, string> = {
  SELAMAT: 'var(--chart-1)', // emerald
  HAMPIR_HAD: 'var(--chart-2)', // amber
  MELEBIHI: 'var(--chart-3)', // red-orange
}

const STATUS_ROW_TINT: Record<LoadStatus, string> = {
  SELAMAT: '',
  HAMPIR_HAD: 'bg-amber-500/5',
  MELEBIHI: 'bg-red-500/5',
}

function StatusProgress({ value, status }: { value: number; status: LoadStatus }) {
  const pct = Math.min(Math.max(value, 0), 100)
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div
        className="h-2 flex-1 rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: STATUS_PROGRESS_COLOR[status] }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums w-9 text-right">
        {value.toFixed(0)}%
      </span>
    </div>
  )
}

function ScheduleCell({ slots }: { slots?: SlotJadual[] }) {
  if (!slots || slots.length === 0) {
    return <div className="h-full min-h-[44px] rounded-md bg-muted/30" />
  }
  return (
    <div className="space-y-1">
      {slots.map((slot) => (
        <div
          key={slot.id}
          className="rounded-md bg-primary/15 border border-primary/30 px-1.5 py-1 text-[10px] leading-tight"
        >
          <p className="font-semibold text-primary truncate">
            {slot.modul?.kodModul ?? '—'}
          </p>
          <p className="text-muted-foreground truncate">
            {slot.modul?.kumpulan?.kursus?.kodKursus ?? ''} · {slot.bilik?.namaBilik ?? '—'}
          </p>
        </div>
      ))}
    </div>
  )
}

function LecturerDetailDialog({
  load,
  open,
  onOpenChange,
}: {
  load: LecturerLoad | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, loading, error } = useApi<JadualViewResponse>(
    () =>
      load
        ? api.get<JadualViewResponse>(
            `/api/jadual/view?view=pensyarah&pensyarahId=${encodeURIComponent(load.pensyarahId)}`,
          )
        : Promise.reject(new Error('Tiada pensyarah dipilih')),
    [load?.pensyarahId],
  )

  if (!load) return null

  const grid = data?.grid
  const hariList = data?.hari ?? ['ISNIN', 'SELASA', 'RABU', 'KHAMIS', 'JUMAAT']
  const timeSlots = data?.timeSlots ?? TIME_SLOTS

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Butiran Beban Tugas — {load.pensyarahNama}
          </DialogTitle>
          <DialogDescription>
            Jadual mingguan pensyarah &amp; pecahan beban tugas mengajar
          </DialogDescription>
        </DialogHeader>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground">Jam/Minggu</p>
            <p className="text-lg font-bold">{load.totalJamMingguan}</p>
          </div>
          <div className="glass-card rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground">Had Maksimum</p>
            <p className="text-lg font-bold">{load.hadJamMaksimum}</p>
          </div>
          <div className="glass-card rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground">Baki Jam</p>
            <p
              className={cn(
                'text-lg font-bold',
                load.bakiJam < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {load.bakiJam}
            </p>
          </div>
          <div className="glass-card rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground">Status</p>
            <div className="mt-0.5">
              <Badge variant={STATUS_BADGE_VARIANT[load.status]}>
                {STATUS_LABEL[load.status]}
              </Badge>
            </div>
          </div>
        </div>

        {/* Kursus diajar */}
        {load.kursusDiajar.length > 0 && (
          <div className="glass-card rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground mb-1.5">Kursus Diajar</p>
            <div className="flex flex-wrap gap-1.5">
              {load.kursusDiajar.map((k) => (
                <Badge key={k} variant="info">
                  {k}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Weekly grid */}
        <div>
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Jadual Mingguan
          </p>
          {loading ? (
            <LoadingState label="Memuatkan jadual..." />
          ) : error ? (
            <div className="text-sm text-destructive text-center py-6">
              {error}
            </div>
          ) : grid ? (
            <div className="overflow-x-auto -mx-1 px-1">
              <Table className="border-separate border-spacing-1">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] text-xs">Masa</TableHead>
                    {hariList.map((h) => (
                      <TableHead key={h} className="text-xs text-center">
                        {HARI_LABELS[h] ?? h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeSlots.map((ts) => (
                    <TableRow key={ts.mula}>
                      <TableCell className="text-[11px] text-muted-foreground font-medium align-top whitespace-nowrap">
                        {ts.mula}
                        <br />
                        <span className="text-[10px]">{ts.tamat}</span>
                      </TableCell>
                      {hariList.map((h) => (
                        <TableCell key={h} className="align-top p-1">
                          <ScheduleCell slots={grid[h]?.[ts.mula]} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="Tiada slot kelas"
              description="Pensyarah ini belum mempunyai slot jadual dipecahkan."
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function BebanSection({ user: _user }: BebanSectionProps) {
  const { data, loading, error, refresh } = useApi<BebanResponse>(
    () => api.get<BebanResponse>('/api/beban'),
    [],
  )

  const [filter, setFilter] = React.useState<FilterKey>('ALL')
  const [selected, setSelected] = React.useState<LecturerLoad | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const loads = React.useMemo(() => {
    if (!data?.loads) return []
    const sorted = [...data.loads].sort((a, b) => b.peratusBeban - a.peratusBeban)
    if (filter === 'ALL') return sorted
    return sorted.filter((l) => l.status === filter)
  }, [data, filter])

  const byStatus = data?.byStatus ?? { SELAMAT: 0, HAMPIR_HAD: 0, MELEBIHI: 0 }
  const totalLecturers = data?.totalLecturers ?? 0
  const avgLoad = data?.avgLoad ?? 0
  const warningCount = byStatus.HAMPIR_HAD + byStatus.MELEBIHI

  // Stacked bar widths
  const totalForBar = Math.max(totalLecturers, 1)
  const pctSelamat = (byStatus.SELAMAT / totalForBar) * 100
  const pctHampir = (byStatus.HAMPIR_HAD / totalForBar) * 100
  const pctMelebihi = (byStatus.MELEBIHI / totalForBar) * 100

  const filters: Array<{ key: FilterKey; label: string; count: number; variant: 'default' | 'success' | 'warning' | 'danger' }> = [
    { key: 'ALL', label: 'Semua', count: totalLecturers, variant: 'default' },
    { key: 'SELAMAT', label: 'Selamat', count: byStatus.SELAMAT, variant: 'success' },
    { key: 'HAMPIR_HAD', label: 'Hampir Had', count: byStatus.HAMPIR_HAD, variant: 'warning' },
    { key: 'MELEBIHI', label: 'Melebihi', count: byStatus.MELEBIHI, variant: 'danger' },
  ]

  function handleRowClick(load: LecturerLoad) {
    setSelected(load)
    setDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Beban Tugas Mengajar"
          description="Pemantauan & pengagihan beban tugas pensyarah merentasi 7 kursus"
          icon={Gauge}
        />
        <LoadingState label="Memuatkan data beban tugas..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Beban Tugas Mengajar"
          description="Pemantauan & pengagihan beban tugas pensyarah merentasi 7 kursus"
          icon={Gauge}
          actions={
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4" /> Cuba Semula
            </Button>
          }
        />
        <GlassPanel>
          <CardContent className="p-6 text-center text-destructive">
            {error}
          </CardContent>
        </GlassPanel>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Beban Tugas Mengajar"
        description="Pemantauan & pengagihan beban tugas pensyarah merentasi 7 kursus"
        icon={Gauge}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refresh()
              toast.success('Data beban tugas dikemas kini.')
            }}
          >
            <RefreshCw className="h-4 w-4" /> Muat Semula
          </Button>
        }
      />

      {/* Info alert — color coding */}
      <Alert className="glass-card border-0">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle>Kod Warna Status Beban</AlertTitle>
        <AlertDescription>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <strong>Hijau</strong> = Selamat (beban &lt; 80% had)
          </span>{' '}
          ·{' '}
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
            <strong>Kuning</strong> = Hampir Had (≥ 80% had)
          </span>{' '}
          ·{' '}
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            <strong>Merah</strong> = Melebihi Had (&gt; 100% had)
          </span>
        </AlertDescription>
      </Alert>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard
          label="Total Pensyarah"
          value={totalLecturers}
          icon={Users}
          trend="Pensyarah aktif"
        />
        <StatCard
          label="Beban Purata"
          value={`${avgLoad}%`}
          icon={TrendingUp}
          variant={avgLoad >= 100 ? 'danger' : avgLoad >= 80 ? 'warning' : 'success'}
          trend="Relatif kepada had jam maksimum"
        />
        <StatCard
          label="Amaran Beban"
          value={warningCount}
          icon={AlertTriangle}
          variant={warningCount > 0 ? 'warning' : 'success'}
          trend={`${byStatus.HAMPIR_HAD} hampir · ${byStatus.MELEBIHI} melebihi`}
        />
      </div>

      {/* Distribution summary bar */}
      <GlassPanel>
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base">Agihan Status Beban</CardTitle>
          <p className="text-xs text-muted-foreground">
            Taburan {totalLecturers} pensyarah mengikut status beban tugas mingguan
          </p>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${pctSelamat}%` }}
              title={`Selamat: ${byStatus.SELAMAT}`}
            />
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${pctHampir}%` }}
              title={`Hampir Had: ${byStatus.HAMPIR_HAD}`}
            />
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${pctMelebihi}%` }}
              title={`Melebihi: ${byStatus.MELEBIHI}`}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5">
              <p className="text-[11px] text-muted-foreground">Selamat</p>
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                {byStatus.SELAMAT}
                <span className="text-xs font-normal text-muted-foreground">
                  {' '}
                  ({pctSelamat.toFixed(0)}%)
                </span>
              </p>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
              <p className="text-[11px] text-muted-foreground">Hampir Had</p>
              <p className="text-base font-bold text-amber-700 dark:text-amber-400">
                {byStatus.HAMPIR_HAD}
                <span className="text-xs font-normal text-muted-foreground">
                  {' '}
                  ({pctHampir.toFixed(0)}%)
                </span>
              </p>
            </div>
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5">
              <p className="text-[11px] text-muted-foreground">Melebihi</p>
              <p className="text-base font-bold text-red-700 dark:text-red-400">
                {byStatus.MELEBIHI}
                <span className="text-xs font-normal text-muted-foreground">
                  {' '}
                  ({pctMelebihi.toFixed(0)}%)
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </GlassPanel>

      {/* Filter buttons + Table */}
      <GlassPanel>
        <CardHeader className="px-5 pt-5 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">Senarai Pensyarah</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? 'default' : 'outline'}
                onClick={() => setFilter(f.key)}
                className="h-8"
              >
                {f.label}
                <span
                  className={cn(
                    'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    filter === f.key
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : f.variant === 'success'
                        ? 'status-ok'
                        : f.variant === 'warning'
                          ? 'status-warn'
                          : f.variant === 'danger'
                            ? 'status-danger'
                            : 'bg-muted text-muted-foreground',
                  )}
                >
                  {f.count}
                </span>
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-4 sm:px-5">
          {loads.length === 0 ? (
            <EmptyState
              title="Tiada pensyarah dalam kategori ini"
              description="Tukar penapis untuk melihat kategori lain."
              icon={Users}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="min-w-[180px]">Nama</TableHead>
                    <TableHead className="min-w-[200px]">Emel</TableHead>
                    <TableHead className="min-w-[200px]">Kursus Diajar</TableHead>
                    <TableHead className="text-right">Jam/Minggu</TableHead>
                    <TableHead className="text-right">Had Maks</TableHead>
                    <TableHead className="text-right">Baki Jam</TableHead>
                    <TableHead className="min-w-[160px]">% Beban</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loads.map((l) => (
                    <TableRow
                      key={l.pensyarahId}
                      onClick={() => handleRowClick(l)}
                      className={cn(
                        'cursor-pointer transition-colors',
                        STATUS_ROW_TINT[l.status],
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                            {l.pensyarahNama
                              .split(' ')
                              .map((s) => s[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <span className="truncate">{l.pensyarahNama}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate max-w-[180px]">{l.email}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        {l.kursusDiajar.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {l.kursusDiajar.slice(0, 2).map((k) => (
                              <Badge key={k} variant="info" className="text-[10px]">
                                <BookOpen className="h-3 w-3" />
                                {k.length > 18 ? k.slice(0, 18) + '…' : k}
                              </Badge>
                            ))}
                            {l.kursusDiajar.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{l.kursusDiajar.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {l.totalJamMingguan}j
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {l.hadJamMaksimum}j
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums font-medium',
                          l.bakiJam < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-600 dark:text-emerald-400',
                        )}
                      >
                        {l.bakiJam}j
                      </TableCell>
                      <TableCell>
                        <StatusProgress value={l.peratusBeban} status={l.status} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE_VARIANT[l.status]}>
                          {STATUS_LABEL[l.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-2">
            Klik pada baris untuk melihat butiran jadual mingguan pensyarah. Disusun mengikut
            peratusan beban (menurun).
          </p>
        </CardContent>
      </GlassPanel>

      <LecturerDetailDialog
        load={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
