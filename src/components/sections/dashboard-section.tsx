'use client'

import * as React from 'react'
import {
  LayoutDashboard, ShoppingCart, ChefHat, AlertTriangle, Utensils, DollarSign,
  ArrowRight, ClipboardList, ListOrdered, CheckCircle2, Flame, UtensilsCrossed,
  Soup, CupSoda, Package, Truck,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PageHeader, StatCard, LoadingState, CardSkeletons, EmptyState, Badge, GlassPanel,
  useApi, type SectionProps,
} from '@/components/sections/shared'
import { api } from '@/lib/api-client'
import {
  KATEGORI_LIST, JENIS_PESANAN,
  type Pesanan, type SessionUser,
} from '@/lib/types'

// ---------------- Types ----------------
interface DashboardStats {
  totalPesananHari: number
  pesananAktif: number
  pesananTertunggak: number
  jualanHari: number
  menuTersedia: number
}
interface ActiveOrder extends Pesanan {
  menitBerlalu: number
  timerStatus: 'ok' | 'kuning' | 'merah'
}
interface TertunggakItem {
  id: string
  noPesanan: string
  mejaNama?: string | null
  menitBerlalu: number
  status: string
}
interface DashboardResponse {
  session: SessionUser
  stats: DashboardStats
  activeOrders: ActiveOrder[]
  tertunggakList: TertunggakItem[]
  salesByKategori: Record<string, number>
}

// Warm food-brand chart palette (NO blue/indigo)
const CHART_COLORS = [
  'oklch(0.65 0.2 35)',    // orange-red (chart-1)
  'oklch(0.68 0.16 70)',   // amber (chart-2)
  'oklch(0.6 0.15 140)',   // green (chart-3)
  'oklch(0.62 0.18 15)',   // red (chart-4)
  'oklch(0.7 0.13 90)',    // yellow-gold (chart-5)
]

function timerVariant(t: 'ok' | 'kuning' | 'merah') {
  if (t === 'merah') return 'danger' as const
  if (t === 'kuning') return 'warning' as const
  return 'success' as const
}

function timerClasses(t: 'ok' | 'kuning' | 'merah') {
  if (t === 'merah') return 'text-red-600 dark:text-red-400'
  if (t === 'kuning') return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

function formatRM(n: number) {
  return `RM ${Number(n || 0).toFixed(2)}`
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '--:--'
  }
}

function JenisIcon({ jenis, className }: { jenis: string; className?: string }) {
  if (jenis === 'BUNGKUS') return <Package className={className} />
  if (jenis === 'DELIVERY') return <Truck className={className} />
  return <Utensils className={className} />
}

function kategoriIcon(key: string) {
  if (key === 'NASI') return Soup
  if (key === 'MINUMAN') return CupSoda
  if (key === 'SNEK') return Package
  if (key === 'TAMBAHAN') return UtensilsCrossed
  return Utensils // MEE_KUEY_TEOW default
}

// ---------------- Component ----------------
export function DashboardSection({ user, onNavigate }: SectionProps) {
  const { data, loading, error, refresh } = useApi<DashboardResponse>(
    () => api.get<DashboardResponse>('/api/dashboard'),
    [],
  )

  // Auto-refresh every 30 seconds
  React.useEffect(() => {
    const id = setInterval(() => refresh(), 30_000)
    return () => clearInterval(id)
  }, [refresh])

  const isDapur = user.role === 'DAPUR'

  if (loading && !data) return <><PageHeader title="Papan Pemuka" icon={LayoutDashboard} description="Memuatkan data..." /><CardSkeletons count={4} /></>
  if (error && !data) {
    return (
      <>
        <PageHeader title="Papan Pemuka" icon={LayoutDashboard} description={`Selamat datang, ${user.name}`} />
        <EmptyState title="Gagal memuatkan papan pemuka" description={error} icon={AlertTriangle}
          action={<Button onClick={refresh}>Cuba Semula</Button>} />
      </>
    )
  }
  if (!data) return null

  const { stats, activeOrders, tertunggakList, salesByKategori } = data

  // Build pie chart data
  const pieData = KATEGORI_LIST.map((k, i) => ({
    name: k.label,
    key: k.key,
    value: salesByKategori[k.key] ?? 0,
    color: CHART_COLORS[i % CHART_COLORS.length],
  })).filter((d) => d.value > 0)

  const previewOrders = activeOrders.slice(0, 6)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Papan Pemuka"
        description={`Selamat datang, ${user.name}`}
        icon={LayoutDashboard}
        actions={
          <Button variant="outline" size="sm" onClick={refresh} className="h-10">
            <ArrowRight className="h-4 w-4 mr-1 rotate-90" /> Muat Semula
          </Button>
        }
      />

      {/* ---------- Stats ---------- */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {!isDapur && (
          <StatCard
            label="Jualan Hari Ini"
            value={formatRM(stats.jualanHari)}
            icon={DollarSign}
            trend="Hasil jualan hari ini"
            variant="success"
          />
        )}
        <StatCard
          label="Pesanan Hari Ini"
          value={stats.totalPesananHari}
          icon={ShoppingCart}
          trend="Jumlah pesanan direkod"
        />
        <StatCard
          label="Pesanan Aktif"
          value={stats.pesananAktif}
          icon={ChefHat}
          trend="Sedang diproses dapur"
          variant={stats.pesananAktif > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Pesanan Tertunggak"
          value={stats.pesananTertunggak}
          icon={AlertTriangle}
          trend={stats.pesananTertunggak > 0 ? `Melebihi 20 minit` : 'Semua dalam kawalan'}
          variant={stats.pesananTertunggak > 0 ? 'danger' : 'success'}
        />
        {!isDapur && (
          <StatCard
            label="Menu Tersedia"
            value={stats.menuTersedia}
            icon={Utensils}
            trend="Item sedia untuk dijual"
          />
        )}
      </div>

      {/* ---------- Tertunggak Alert Banner ---------- */}
      {stats.pesananTertunggak > 0 ? (
        <Card className="glass-card border-0 border-l-4 border-l-red-500 bg-red-500/10">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-red-700 dark:text-red-300">
                  ⚠️ {stats.pesananTertunggak} pesanan tertunggak melebihi 20 minit!
                </p>
                <p className="text-sm text-red-600/80 dark:text-red-400/80">
                  Sila semak papan status dan utamakan pesanan ini.
                </p>
              </div>
            </div>
            <Button
              onClick={() => onNavigate('papan')}
              className="bg-red-600 hover:bg-red-700 text-white shrink-0 h-11"
            >
              <ListOrdered className="h-4 w-4 mr-2" /> Lihat Papan Status
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card border-0 border-l-4 border-l-emerald-500 bg-emerald-500/10">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">✅ Tiada pesanan tertunggak</p>
              <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">
                Semua pesanan dalam kawalan masa yang ditetapkan.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={`grid gap-4 ${isDapur ? 'lg:grid-cols-1' : 'lg:grid-cols-3'}`}>
        {/* ---------- Active Orders Preview ---------- */}
        <div className={isDapur ? 'lg:col-span-1' : 'lg:col-span-2'}>
          <GlassPanel>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flame className="h-4 w-4 text-primary" /> Pesanan Aktif
                  <Badge variant="info">{activeOrders.length}</Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('papan')} className="h-9 text-primary">
                  Lihat Semua <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {previewOrders.length === 0 ? (
                <EmptyState
                  title="Tiada pesanan aktif"
                  description="Pesanan baharu akan dipaparkan di sini."
                  icon={ChefHat}
                  action={<Button onClick={() => onNavigate('ambil')} className="h-11"><ClipboardList className="h-4 w-4 mr-2" /> Ambil Pesanan</Button>}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {previewOrders.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => onNavigate('papan')}
                      className="text-left glass-card border-0 p-3 rounded-xl hover:ring-2 hover:ring-primary/50 transition-all min-h-[44px]"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-primary">{o.noPesanan}</span>
                          <JenisIcon jenis={o.jenis} className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <Badge variant={timerVariant(o.timerStatus)}>
                          {o.menitBerlalu} min
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {o.mejaNama || o.pelanggan?.nama || JENIS_PESANAN[o.jenis].label}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-muted-foreground">
                          {o.items.length} item · {formatTime(o.waktuPesanan)}
                        </span>
                        <span className="text-sm font-semibold">{formatRM(o.jumlah)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </GlassPanel>
        </div>

        {/* ---------- Sales by Category (hidden for DAPUR) ---------- */}
        {!isDapur && (
          <GlassPanel>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-primary" /> Jualan Mengikut Kategori
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <EmptyState title="Tiada jualan hari ini" description="Jualan akan dipaparkan di sini." icon={DollarSign} />
              ) : (
                <>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={80}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {pieData.map((d) => (
                            <Cell key={d.key} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => formatRM(v)}
                          contentStyle={{
                            background: 'var(--popover)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                    {pieData.map((d) => {
                      const Icon = kategoriIcon(d.key)
                      return (
                        <div key={d.key} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">{d.name}</span>
                          </div>
                          <span className="font-semibold">{formatRM(d.value)}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </GlassPanel>
        )}
      </div>

      {/* ---------- Quick Actions ---------- */}
      <GlassPanel>
        <CardContent className="p-4 sm:p-5">
          <p className="text-sm font-medium text-muted-foreground mb-3">Tindakan Pantas</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onNavigate('ambil')} className="h-11 px-5">
              <ClipboardList className="h-4 w-4 mr-2" /> Ambil Pesanan
            </Button>
            <Button onClick={() => onNavigate('papan')} variant="outline" className="h-11 px-5">
              <ListOrdered className="h-4 w-4 mr-2" /> Papan Status
            </Button>
            {!isDapur && (
              <Button onClick={() => onNavigate('menu')} variant="outline" className="h-11 px-5">
                <UtensilsCrossed className="h-4 w-4 mr-2" /> Menu & Harga
              </Button>
            )}
          </div>
        </CardContent>
      </GlassPanel>

      {/* ---------- Tertunggak List (compact) ---------- */}
      {tertunggakList.length > 0 && (
        <GlassPanel>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" /> Senarai Tertunggak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tertunggakList.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onNavigate('papan')}
                  className="text-left p-3 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/15 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{t.noPesanan}</span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">{t.menitBerlalu} min</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.mejaNama || 'Tiada meja'}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </GlassPanel>
      )}
    </div>
  )
}
