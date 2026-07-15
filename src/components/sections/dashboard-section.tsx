'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Gauge,
  ArrowRight,
  GraduationCap,
  RefreshCw,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  PageHeader,
  StatCard,
  CardSkeletons,
  Badge,
  GlassPanel,
  useApi,
} from '@/components/sections/shared'
import { api } from '@/lib/api-client'
import type { SessionUser, Role } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'
import { toast } from 'sonner'

type SectionId =
  | 'dashboard'
  | 'jadual'
  | 'generate'
  | 'beban'
  | 'kursus'
  | 'pensyarah'
  | 'modul'
  | 'bilik'
  | 'permohonan'
  | 'audit'
  | 'users'

interface DashboardKursusItem {
  id: string
  namaKursus: string
  kodKursus: string
  kumpulanCount: number
  pensyarahCount: number
}

interface DashboardStats {
  kursus: number
  kumpulan: number
  modul: number
  pensyarah: number
  bilik: number
  slot: number
  permohonanMenunggu: number
  clashes: number
  modulTeras: number
  modulUmum: number
  kumpulanBelajar: number
  kumpulanLatihan: number
  loadStatus: { SELAMAT: number; HAMPIR_HAD: number; MELEBIHI: number }
  avgLoad: number
}

interface DashboardResponse {
  session: SessionUser
  stats: DashboardStats
  kursusList: DashboardKursusItem[]
}

interface DashboardSectionProps {
  user: SessionUser
  onNavigate: (section: SectionId) => void
}

// Chart palette — emerald / amber / red-orange (NO indigo/blue)
const CHART_COLORS = {
  emerald: 'var(--chart-1)',
  amber: 'var(--chart-2)',
  red: 'var(--chart-3)',
}

const PIE_DATA_KEY: Record<keyof DashboardStats['loadStatus'], string> = {
  SELAMAT: 'Selamat',
  HAMPIR_HAD: 'Hampir Had',
  MELEBIHI: 'Melebihi',
}

export function DashboardSection({ user, onNavigate }: DashboardSectionProps) {
  const { data, loading, error, refresh } = useApi<DashboardResponse>(
    () => api.get<DashboardResponse>('/api/dashboard'),
    [],
  )

  const isPensyarah = user.role === 'PENSYARAH'

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Papan Pemuka"
          description="Memuatkan ringkasan sistem..."
          icon={LayoutDashboard}
        />
        <CardSkeletons count={6} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Papan Pemuka"
          description="Ralat memuatkan data"
          icon={LayoutDashboard}
          actions={
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4" /> Cuba Semula
            </Button>
          }
        />
        <GlassPanel>
          <CardContent className="p-6 text-center text-destructive">
            {error || 'Tidak dapat memuatkan papan pemuka.'}
          </CardContent>
        </GlassPanel>
      </div>
    )
  }

  const { stats, kursusList } = data
  const clashes = stats.clashes
  const hasClashes = clashes > 0

  // Pie chart data
  const pieData = (Object.keys(stats.loadStatus) as Array<keyof DashboardStats['loadStatus']>)
    .map((k) => ({
      name: PIE_DATA_KEY[k],
      value: stats.loadStatus[k],
      key: k,
    }))
    .filter((d) => d.value > 0)

  const pieColorMap: Record<string, string> = {
    SELAMAT: CHART_COLORS.emerald,
    HAMPIR_HAD: CHART_COLORS.amber,
    MELEBIHI: CHART_COLORS.red,
  }

  // Bar chart data
  const barData = kursusList.map((k) => ({
    kod: k.kodKursus,
    pensyarah: k.pensyarahCount,
    kumpulan: k.kumpulanCount,
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Papan Pemuka"
        description={`Selamat datang, ${user.name} · ${ROLE_LABELS[user.role as Role]}`}
        icon={LayoutDashboard}
        actions={
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4" /> Muat Semula
          </Button>
        }
      />

      {/* Pensyarah personalised welcome */}
      {isPensyarah && (
        <GlassPanel>
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-base">Panel Peribadi Pensyarah</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Lihat jadual mingguan anda, kemas kini permohonan pertukaran slot, dan pantau beban tugas semasa.
                  </p>
                </div>
              </div>
              <Button onClick={() => onNavigate('jadual')} className="shrink-0">
                <CalendarDays className="h-4 w-4" /> Lihat Jadual Saya
              </Button>
            </div>
          </CardContent>
        </GlassPanel>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Total Kursus"
          value={stats.kursus}
          icon={BookOpen}
          trend={`${stats.modulTeras} teras · ${stats.modulUmum} umum`}
        />
        <StatCard
          label="Kumpulan Semester"
          value={stats.kumpulan}
          icon={Users}
          trend={`${stats.kumpulanBelajar} belajar · ${stats.kumpulanLatihan} latihan`}
        />
        <StatCard
          label="Pensyarah"
          value={stats.pensyarah}
          icon={GraduationCap}
          trend="Aktif mengajar"
        />
        <StatCard
          label="Slot Kelas"
          value={stats.slot}
          icon={CalendarDays}
          trend={`${stats.bilik} bilik tersedia`}
        />
        <StatCard
          label="Pertindihan Aktif"
          value={clashes}
          icon={AlertTriangle}
          variant={hasClashes ? 'danger' : 'success'}
          trend={hasClashes ? 'Memerlukan tindakan' : 'Bebas konflik'}
        />
        <StatCard
          label="Permohonan Menunggu"
          value={stats.permohonanMenunggu}
          icon={FileText}
          variant={stats.permohonanMenunggu > 0 ? 'warning' : 'default'}
          trend={stats.permohonanMenunggu > 0 ? 'Menanti kelulusan' : 'Tiada permohonan'}
        />
      </div>

      {/* Clash alert banner */}
      {hasClashes ? (
        <div
          role="alert"
          className="glass-strong rounded-xl border border-red-500/40 bg-red-500/10 p-4 sm:p-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-red-700 dark:text-red-300">
                  {clashes} pertindihan dikesan dalam jadual
                </p>
                <p className="text-sm text-red-600/80 dark:text-red-300/80 mt-0.5">
                  Sila semak dan selesaikan pertindihan slot untuk memastikan jadual bebas konflik.
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={() => onNavigate('jadual')}
              className="shrink-0"
            >
              <AlertTriangle className="h-4 w-4" /> Lihat Pertindihan
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="alert"
          className="glass-strong rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 sm:p-5"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                0 pertindihan — jadual bebas konflik ✅
              </p>
              <p className="text-sm text-emerald-600/80 dark:text-emerald-300/80 mt-0.5">
                Semua slot kelas semasa tidak bertindih antara pensyarah, bilik, atau kumpulan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bar chart — Pensyarah per Kursus */}
        <GlassPanel>
          <CardHeader className="px-5 pt-5 pb-2">
            <CardTitle className="text-base">Pensyarah per Kursus</CardTitle>
            <p className="text-xs text-muted-foreground">
              Bilangan pensyarah yang mengajar dalam setiap kursus
            </p>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <div className="h-[280px] w-full">
              {barData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Tiada data kursus
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 12, right: 16, left: -8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="kod"
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border)' }}
                      interval={0}
                      angle={-12}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--popover-foreground)',
                      }}
                      cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                    />
                    <Bar
                      dataKey="pensyarah"
                      name="Pensyarah"
                      fill={CHART_COLORS.emerald}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </GlassPanel>

        {/* Pie chart — Status Beban Tugas */}
        <GlassPanel>
          <CardHeader className="px-5 pt-5 pb-2">
            <CardTitle className="text-base">Status Beban Tugas Pensyarah</CardTitle>
            <p className="text-xs text-muted-foreground">
              Agihan beban mengajar relatif kepada had jam maksimum
            </p>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <div className="h-[280px] w-full">
              {pieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Tiada data beban tugas
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      stroke="var(--background)"
                      strokeWidth={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.key} fill={pieColorMap[entry.key]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--popover-foreground)',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </GlassPanel>
      </div>

      {/* Kursus Aktif list + Beban Tugas mini-summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Kursus Aktif — spans 2 cols */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Kursus Aktif</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('kursus')}
              className="text-primary"
            >
              Lihat Semua <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {kursusList.length === 0 ? (
              <GlassPanel>
                <CardContent className="p-6 text-sm text-muted-foreground text-center sm:col-span-2">
                  Tiada kursus berdaftar.
                </CardContent>
              </GlassPanel>
            ) : (
              kursusList.map((k) => (
                <button
                  key={k.id}
                  onClick={() => onNavigate('kursus')}
                  className="text-left transition-transform hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                >
                  <Card className="glass-card border-0 h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="inline-flex items-center rounded-md bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 text-[11px] font-semibold tracking-wide">
                          {k.kodKursus}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
                        {k.namaKursus}
                      </p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {k.kumpulanCount} kumpulan
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap className="h-3.5 w-3.5" /> {k.pensyarahCount} pensyarah
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Beban Tugas mini-summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" /> Beban Tugas
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('beban')}
              className="text-primary"
            >
              Butiran <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <GlassPanel>
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <p className="text-sm text-muted-foreground">Beban Purata</p>
                  <p className="text-lg font-bold text-primary">{stats.avgLoad}%</p>
                </div>
                <Progress
                  value={Math.min(stats.avgLoad, 100)}
                  className="h-2"
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Relatif kepada had jam maksimum semua pensyarah
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Selamat</span>
                  <Badge variant="success">{stats.loadStatus.SELAMAT}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Hampir Had (≥80%)</span>
                  <Badge variant="warning">{stats.loadStatus.HAMPIR_HAD}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Melebihi Had (&gt;100%)</span>
                  <Badge variant="danger">{stats.loadStatus.MELEBIHI}</Badge>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onNavigate('beban')}
              >
                <Gauge className="h-4 w-4" /> Urus Beban Tugas
              </Button>
            </CardContent>
          </GlassPanel>
        </div>
      </div>

      {/* Quick actions */}
      <GlassPanel>
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-3">Akses Pantas</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onNavigate('jadual')}>
              <CalendarDays className="h-4 w-4" /> Jadual Kelas
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('generate')}>
              Jana Jadual AI
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('permohonan')}>
              <FileText className="h-4 w-4" /> Permohonan Pertukaran
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('bilik')}>
              Bilik &amp; Makmal
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refresh()
                toast.success('Papan pemuka dikemas kini.')
              }}
            >
              <RefreshCw className="h-4 w-4" /> Muat Semula Data
            </Button>
          </div>
        </CardContent>
      </GlassPanel>
    </div>
  )
}
