'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { KATEGORI_MENU } from '@/lib/types'
import {
  BarChart3, DollarSign, ShoppingBag, TrendingUp, Receipt, Sparkles,
  Loader2, Lock, AlertTriangle, Clock,
} from 'lucide-react'
import {
  PageHeader, StatCard, LoadingState, EmptyState, GlassPanel, useApi,
  type SectionProps,
} from '@/components/sections/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'

type Period = 'hari' | 'minggu' | 'bulan'

interface Summary {
  totalPesanan: number
  totalJualan: number
  bilItem: number
  purataPesanan: number
}
interface MenuStat { nama: string; kuantiti: number; jumlah: number }
interface PeakHour { jam: number; bil: number }
interface TrendPoint { tarikh: string; jualan: number; bil: number }

interface LaporanData {
  period: Period
  startDate: string
  endDate: string
  summary: Summary
  menuTerlaris: MenuStat[]
  menuKurangLaku: MenuStat[]
  peakHours: PeakHour[]
  trendJualan: TrendPoint[]
  salesByKategori: Record<string, number>
}

interface AiAnalysis {
  analysis: string
  summary: unknown
}

const CHART_COLORS = [
  'oklch(0.65 0.2 35)',
  'oklch(0.68 0.16 70)',
  'oklch(0.6 0.15 140)',
  'oklch(0.62 0.18 15)',
  'oklch(0.7 0.13 90)',
]

function formatRM(v: number) {
  return `RM ${v.toFixed(2)}`
}

function formatTarikh(d: string) {
  try {
    return new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })
  } catch {
    return d
  }
}

function formatJam(h: number) {
  const jam = String(h).padStart(2, '0')
  return `${jam}:00`
}

const PERIOD_LABEL: Record<Period, string> = {
  hari: 'Hari Ini',
  minggu: 'Minggu Ini',
  bulan: 'Bulan Ini',
}

export function LaporanSection({ user }: SectionProps) {
  const canView = user.role === 'PEMILIK'
  const [period, setPeriod] = React.useState<Period>('minggu')

  const { data, loading, error, refresh } = useApi<LaporanData>(
    () => api.get(`/api/laporan?period=${period}`),
    [period],
  )

  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiText, setAiText] = React.useState<string>('')

  async function runAiAnalysis() {
    setAiLoading(true)
    setAiText('')
    try {
      const res = await api.post<AiAnalysis>('/api/laporan/ai-analysis', { period })
      setAiText(res.analysis)
      toast.success('Analisis AI berjaya dijana.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ralat menjana analisis AI.')
    } finally {
      setAiLoading(false)
    }
  }

  if (!canView) {
    return (
      <EmptyState
        title="Akses Ditolak"
        description="Anda tidak mempunyai kebenaran untuk melihat laporan jualan."
        icon={Lock}
      />
    )
  }

  if (error) {
    return (
      <EmptyState
        title="Ralat memuatkan laporan"
        description={error}
        icon={AlertTriangle}
        action={<Button variant="outline" onClick={refresh}>Cuba Lagi</Button>}
      />
    )
  }

  const s = data?.summary
  const menuTerlaris = data?.menuTerlaris ?? []
  const menuKurangLaku = data?.menuKurangLaku ?? []
  const peakHours = data?.peakHours ?? []
  const trendJualan = data?.trendJualan ?? []
  const salesByKategori = data?.salesByKategori ?? {}
  const kategoriData = Object.entries(salesByKategori).map(([key, value]) => ({
    name: (KATEGORI_MENU as Record<string, string>)[key] ?? key,
    value,
  }))

  // Get top peak hour
  const topPeak = peakHours.length > 0 ? peakHours[0] : null

  return (
    <div>
      <PageHeader
        title="Laporan Jualan"
        description={`Analisis jualan CKT Adik · ${PERIOD_LABEL[period]}`}
        icon={BarChart3}
        actions={
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="hari">Hari Ini</TabsTrigger>
              <TabsTrigger value="minggu">Minggu</TabsTrigger>
              <TabsTrigger value="bulan">Bulan</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {loading ? (
        <LoadingState label="Memuatkan laporan jualan..." />
      ) : !data ? null : (
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-5">
            <StatCard
              label="Total Jualan"
              value={formatRM(s?.totalJualan ?? 0)}
              icon={DollarSign}
              variant="success"
              trend={PERIOD_LABEL[period]}
            />
            <StatCard
              label="Total Pesanan"
              value={s?.totalPesanan ?? 0}
              icon={ShoppingBag}
            />
            <StatCard
              label="Bil. Item Terjual"
              value={s?.bilItem ?? 0}
              icon={Receipt}
              variant="warning"
            />
            <StatCard
              label="Purata per Pesanan"
              value={formatRM(s?.purataPesanan ?? 0)}
              icon={TrendingUp}
            />
          </div>

          {/* AI Analysis */}
          <GlassPanel className="mb-5 overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Analisis AI</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dapatkan insight jualan dengan AI
                  </p>
                </div>
              </div>
              <Button onClick={runAiAnalysis} disabled={aiLoading} className="gap-2 shrink-0">
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {aiLoading ? 'Menjana...' : 'Jana Analisis AI'}
              </Button>
            </CardHeader>
            <CardContent>
              {aiLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI sedang menganalisis data jualan...</span>
                </div>
              ) : aiText ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90 bg-transparent border-0 p-0">
                    {aiText}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">
                  Klik &quot;Jana Analisis AI&quot; untuk mendapatkan insight automatik tentang
                  trend jualan, menu terlaris, waktu puncak & cadangan tindakan.
                </p>
              )}
            </CardContent>
          </GlassPanel>

          {/* Charts grid */}
          <div className="grid gap-4 lg:grid-cols-2 mb-5">
            {/* Trend Jualan */}
            <GlassPanel>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Trend Jualan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trendJualan.length === 0 ? (
                  <EmptyState title="Tiada data jualan" icon={BarChart3} />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={trendJualan} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 40 / 0.2)" />
                      <XAxis
                        dataKey="tarikh"
                        tickFormatter={formatTarikh}
                        tick={{ fontSize: 11 }}
                        stroke="oklch(0.5 0.02 40 / 0.6)"
                      />
                      <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 40 / 0.6)" />
                      <Tooltip
                        formatter={(v: number) => formatRM(v)}
                        labelFormatter={(l) => formatTarikh(String(l))}
                        contentStyle={{
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="jualan"
                        name="Jualan"
                        stroke="oklch(0.65 0.2 35)"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: 'oklch(0.65 0.2 35)' }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </GlassPanel>

            {/* Menu Terlaris */}
            <GlassPanel>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Menu Terlaris
                </CardTitle>
              </CardHeader>
              <CardContent>
                {menuTerlaris.length === 0 ? (
                  <EmptyState title="Tiada data menu terlaris" icon={BarChart3} />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={menuTerlaris}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 40 / 0.2)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 40 / 0.6)" />
                      <YAxis
                        type="category"
                        dataKey="nama"
                        tick={{ fontSize: 10 }}
                        width={110}
                        stroke="oklch(0.5 0.02 40 / 0.6)"
                      />
                      <Tooltip
                        formatter={(v: number) => [`${v} unit`, 'Kuantiti']}
                        contentStyle={{
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="kuantiti" fill="oklch(0.65 0.2 35)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </GlassPanel>

            {/* Waktu Puncak */}
            <GlassPanel>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Waktu Puncak
                  {topPeak && (
                    <span className="text-xs font-normal text-muted-foreground ml-auto">
                      Puncak: <span className="text-primary font-semibold">{formatJam(topPeak.jam)}</span> ({topPeak.bil} pesanan)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {peakHours.length === 0 ? (
                  <EmptyState title="Tiada data waktu puncak" icon={Clock} />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={peakHours} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 40 / 0.2)" />
                      <XAxis
                        dataKey="jam"
                        tickFormatter={formatJam}
                        tick={{ fontSize: 11 }}
                        stroke="oklch(0.5 0.02 40 / 0.6)"
                      />
                      <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 40 / 0.6)" />
                      <Tooltip
                        formatter={(v: number) => [`${v} pesanan`, 'Bil.']}
                        labelFormatter={(l) => `Jam ${formatJam(Number(l))}`}
                        contentStyle={{
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="bil" name="Pesanan" radius={[4, 4, 0, 0]}>
                        {peakHours.map((entry, idx) => (
                          <Cell
                            key={idx}
                            fill={entry.jam === topPeak?.jam ? 'oklch(0.62 0.18 15)' : 'oklch(0.68 0.16 70)'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </GlassPanel>

            {/* Sales by Kategori */}
            <GlassPanel>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Jualan mengikut Kategori
                </CardTitle>
              </CardHeader>
              <CardContent>
                {kategoriData.length === 0 ? (
                  <EmptyState title="Tiada data kategori" icon={BarChart3} />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={kategoriData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={45}
                        paddingAngle={3}
                      >
                        {kategoriData.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => formatRM(v)}
                        contentStyle={{
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </GlassPanel>
          </div>

          {/* Menu Kurang Laku + Table */}
          <div className="grid gap-4 lg:grid-cols-3 mb-5">
            <GlassPanel className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> Menu Kurang Laku
                </CardTitle>
              </CardHeader>
              <CardContent>
                {menuKurangLaku.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Tiada data.</p>
                ) : (
                  <ul className="space-y-2">
                    {menuKurangLaku.map((m, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.nama}</p>
                          <p className="text-xs text-muted-foreground">{formatRM(m.jumlah)}</p>
                        </div>
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400 shrink-0">
                          {m.kuantiti}×
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </GlassPanel>

            <GlassPanel className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Menu Terlaris — Butiran</CardTitle>
              </CardHeader>
              <CardContent>
                {menuTerlaris.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Tiada data.</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto scrollbar-thin">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Nama Menu</TableHead>
                          <TableHead className="text-right">Kuantiti</TableHead>
                          <TableHead className="text-right">Jumlah (RM)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {menuTerlaris.map((m, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-medium">{m.nama}</TableCell>
                            <TableCell className="text-right">{m.kuantiti}</TableCell>
                            <TableCell className="text-right font-semibold">{formatRM(m.jumlah)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </GlassPanel>
          </div>
        </>
      )}
    </div>
  )
}
