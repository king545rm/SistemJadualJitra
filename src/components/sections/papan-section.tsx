'use client'

import * as React from 'react'
import {
  ListOrdered, AlertTriangle, ChefHat, CheckCircle2, Hand, XCircle, Clock,
  Utensils, Package, Truck, Receipt, Loader2, Flame, StickyNote,
} from 'lucide-react'
import {
  PageHeader, LoadingState, EmptyState, Badge, GlassPanel, useApi, type SectionProps,
} from '@/components/sections/shared'
import { api } from '@/lib/api-client'
import {
  JENIS_PESANAN, AMARAN_TERTUNGGAK_MINIT, ALERT_KUNING_MINIT, ALERT_MERAH_MINIT,
  type Pesanan, type SessionUser,
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ---------------- Types ----------------
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
interface BoardResponse {
  session: SessionUser
  activeOrders: ActiveOrder[]
  tertunggakList: TertunggakItem[]
  stats: { pesananTertunggak: number }
}

// ---------------- Helpers ----------------
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
function minsBetween(start: string): number {
  try {
    return Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 60000))
  } catch {
    return 0
  }
}
function computeTimer(mins: number): 'ok' | 'kuning' | 'merah' {
  if (mins > ALERT_MERAH_MINIT) return 'merah'
  if (mins > ALERT_KUNING_MINIT) return 'kuning'
  return 'ok'
}
function timerVariant(t: 'ok' | 'kuning' | 'merah') {
  if (t === 'merah') return 'danger' as const
  if (t === 'kuning') return 'warning' as const
  return 'success' as const
}

function JenisIcon({ jenis, className }: { jenis: string; className?: string }) {
  if (jenis === 'BUNGKUS') return <Package className={className} />
  if (jenis === 'DELIVERY') return <Truck className={className} />
  return <Utensils className={className} />
}

// ---------------- Component ----------------
export function PapanSection({ user, onNavigate }: SectionProps) {
  const { data, loading, error, refresh, setData } = useApi<BoardResponse>(
    () => api.get<BoardResponse>('/api/dashboard'),
    [],
  )

  // Local "live" tick — recompute menitBerlalu from waktuPesanan each second
  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Auto-refresh from server every 15 seconds
  React.useEffect(() => {
    const id = setInterval(() => refresh(), 15_000)
    return () => clearInterval(id)
  }, [refresh])

  const [selected, setSelected] = React.useState<ActiveOrder | null>(null)
  const [cancelTarget, setCancelTarget] = React.useState<ActiveOrder | null>(null)
  const [advancingId, setAdvancingId] = React.useState<string | null>(null)

  const role = user.role
  // Role-based permission map
  const canMulaMasak = role === 'PEMILIK' || role === 'KAUNTER' || role === 'DAPUR'
  const canTandaSiap = role === 'PEMILIK' || role === 'DAPUR'
  const canTandaDiambil = role === 'PEMILIK' || role === 'KAUNTER'
  const canCancel = role === 'PEMILIK' || role === 'KAUNTER'

  // Compute live orders (recompute mins each render via the tick)
  const liveOrders = React.useMemo<ActiveOrder[]>(() => {
    if (!data?.activeOrders) return []
    return data.activeOrders.map((o) => {
      const mins = minsBetween(o.waktuPesanan)
      return { ...o, menitBerlalu: mins, timerStatus: computeTimer(mins) }
    })
  }, [data?.activeOrders]) // tick causes re-render so this re-evaluates

  const diterima = liveOrders.filter((o) => o.status === 'DITERIMA')
  const dimasak = liveOrders.filter((o) => o.status === 'DIMASAK')
  const siap = liveOrders.filter((o) => o.status === 'SIAP')

  const tertunggakCount = liveOrders.filter(
    (o) => (o.status === 'DITERIMA' || o.status === 'DIMASAK') && o.menitBerlalu > AMARAN_TERTUNGGAK_MINIT
  ).length

  // ---- Status advance ----
  async function advance(order: ActiveOrder, newStatus: 'DIMASAK' | 'SIAP' | 'DIAMBIL' | 'DIBATALKAN') {
    setAdvancingId(order.id)
    try {
      const res = await api.post<{ pesanan: Pesanan }>(`/api/pesanan/${order.id}/status`, { status: newStatus })
      // Optimistically update local state
      if (data) {
        if (newStatus === 'DIAMBIL' || newStatus === 'DIBATALKAN') {
          setData({ ...data, activeOrders: data.activeOrders.filter((o) => o.id !== order.id) })
        } else {
          setData({
            ...data,
            activeOrders: data.activeOrders.map((o) => o.id === order.id ? { ...o, ...res.pesanan } as ActiveOrder : o),
          })
        }
      }
      const labels: Record<string, string> = {
        DIMASAK: 'Sedang dimasak',
        SIAP: 'Siap dihidang',
        DIAMBIL: 'Telah diambil',
        DIBATALKAN: 'Dibatalkan',
      }
      toast.success(`Pesanan ${order.noPesanan}: ${labels[newStatus]}`)
      setSelected(null)
      setCancelTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengemaskini status.')
      refresh()
    } finally {
      setAdvancingId(null)
    }
  }

  // ---- Loading / error ----
  if (loading && !data) {
    return (
      <>
        <PageHeader title="Papan Status Pesanan" description="FIFO queue — tiada pesanan tercicir" icon={ListOrdered} />
        <div className="grid lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <GlassPanel key={i}><CardContent className="p-6"><LoadingState /></CardContent></GlassPanel>
          ))}
        </div>
      </>
    )
  }
  if (error && !data) {
    return (
      <>
        <PageHeader title="Papan Status Pesanan" description="FIFO queue — tiada pesanan tercicir" icon={ListOrdered} />
        <EmptyState title="Gagal memuatkan papan status" description={error} icon={AlertTriangle}
          action={<Button onClick={refresh}>Cuba Semula</Button>} />
      </>
    )
  }
  if (!data) return null

  const columns = [
    { title: 'Diterima', subtitle: 'Menunggu dimasak', status: 'DITERIMA', orders: diterima, color: 'amber' as const, icon: Clock },
    { title: 'Sedang Dimasak', subtitle: 'Dalam proses dapur', status: 'DIMASAK', orders: dimasak, color: 'orange' as const, icon: ChefHat },
    { title: 'Siap', subtitle: 'Sedia untuk diambil', status: 'SIAP', orders: siap, color: 'emerald' as const, icon: CheckCircle2 },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Papan Status Pesanan"
        description="FIFO queue — tiada pesanan tercicir"
        icon={ListOrdered}
        actions={
          <Button variant="outline" size="sm" onClick={refresh} className="h-10">
            <Loader2 className="h-4 w-4 mr-1.5" /> Muat Semula
          </Button>
        }
      />

      {/* ---------- Anti-tercicir alert bar ---------- */}
      {tertunggakCount > 0 ? (
        <Card className="glass-card border-0 border-l-4 border-l-red-500 bg-red-500/10">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <p className="font-semibold text-red-700 dark:text-red-300 text-sm sm:text-base">
                  ⚠️ {tertunggakCount} pesanan melebihi {AMARAN_TERTUNGGAK_MINIT} minit belum siap!
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80">Utamakan pesanan ini segera.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card border-0 border-l-4 border-l-emerald-500 bg-emerald-500/10">
          <CardContent className="p-3 flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              ✅ Semua pesanan dalam kawalan masa
            </p>
          </CardContent>
        </Card>
      )}

      {/* ---------- Board: 3 columns ---------- */}
      <div className="flex lg:grid lg:grid-cols-3 gap-3 sm:gap-4 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-thin -mx-1 px-1">
        {columns.map((col) => (
          <div key={col.status} className="min-w-[300px] sm:min-w-[340px] lg:min-w-0 flex flex-col">
            {/* Column header */}
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <col.icon className={cn(
                  'h-4 w-4',
                  col.color === 'amber' && 'text-amber-600 dark:text-amber-400',
                  col.color === 'orange' && 'text-primary',
                  col.color === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
                )} />
                <h3 className="font-semibold text-sm">{col.title}</h3>
                <span className="text-xs text-muted-foreground hidden sm:inline">· {col.subtitle}</span>
              </div>
              <Badge variant={col.orders.length > 0 ? 'info' : 'default'}>{col.orders.length}</Badge>
            </div>

            {/* Column body */}
            <div className="space-y-2.5 min-h-[200px]">
              {col.orders.length === 0 ? (
                <div className="glass-card border-0 rounded-xl p-6 text-center text-sm text-muted-foreground">
                  Tiada pesanan
                </div>
              ) : (
                col.orders.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    onClick={() => setSelected(o)}
                    onAdvance={advance}
                    onCancel={(ord) => setCancelTarget(ord)}
                    advancing={advancingId === o.id}
                    canMulaMasak={canMulaMasak}
                    canTandaSiap={canTandaSiap}
                    canTandaDiambil={canTandaDiambil}
                    canCancel={canCancel}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ---------- Detail Dialog ---------- */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="glass-strong border-0 max-w-md max-h-[85vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              Pesanan {selected?.noPesanan}
            </DialogTitle>
            <DialogDescription>
              Butiran penuh pesanan
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoRow label="Jenis" value={JENIS_PESANAN[selected.jenis].label} />
                <InfoRow label="Meja/Pelanggan" value={selected.mejaNama || selected.pelanggan?.nama || '-'} />
                <InfoRow label="Waktu" value={formatTime(selected.waktuPesanan)} />
                <InfoRow
                  label="Menit Berlalu"
                  value={
                    <span className={cn(
                      'font-bold',
                      selected.timerStatus === 'merah' && 'text-red-600 dark:text-red-400',
                      selected.timerStatus === 'kuning' && 'text-amber-600 dark:text-amber-400',
                      selected.timerStatus === 'ok' && 'text-emerald-600 dark:text-emerald-400',
                    )}>
                      {selected.menitBerlalu} min
                    </span>
                  }
                />
              </div>

              {/* Items */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Item Pesanan</p>
                <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin">
                  {selected.items.map((it) => (
                    <div key={it.id} className="rounded-lg bg-muted/40 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{it.namaSewaktu} <span className="text-muted-foreground">× {it.kuantiti}</span></p>
                          {it.nota && (
                            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                              <StickyNote className="h-3 w-3" /> {it.nota}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-semibold shrink-0">{formatRM(it.subtotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selected.catatan && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Catatan</p>
                  <p className="text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">{selected.catatan}</p>
                </div>
              )}

              {/* Totals */}
              <div className="border-t border-border/40 pt-2.5 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jumlah</span>
                  <span className="font-bold text-base text-primary">{formatRM(selected.jumlah)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dibayar</span>
                  <span>{formatRM(selected.jumlahDibayar)}</span>
                </div>
                {selected.baki !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Baki</span>
                    <span className={selected.baki > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                      {formatRM(selected.baki)}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <StatusActions
                  order={selected}
                  advancing={advancingId === selected.id}
                  onAdvance={advance}
                  onCancel={(o) => { setCancelTarget(o); setSelected(null) }}
                  canMulaMasak={canMulaMasak}
                  canTandaSiap={canTandaSiap}
                  canTandaDiambil={canTandaDiambil}
                  canCancel={canCancel}
                />
                <Button
                  variant="outline"
                  className="w-full h-10"
                  onClick={() => { setSelected(null); onNavigate('resit') }}
                >
                  <Receipt className="h-4 w-4 mr-2" /> Lihat Resit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------- Cancel confirm dialog ---------- */}
      <Dialog open={!!cancelTarget} onOpenChange={(v) => !v && setCancelTarget(null)}>
        <DialogContent className="glass-strong border-0 max-w-sm">
          <DialogHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center mb-2">
              <XCircle className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center">Batalkan Pesanan?</DialogTitle>
            <DialogDescription className="text-center">
              Adakah anda pasti mahu membatalkan pesanan <span className="font-semibold text-foreground">{cancelTarget?.noPesanan}</span>?
              Tindakan ini tidak boleh dibuat asal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              className="w-full h-11"
              disabled={advancingId === cancelTarget?.id}
              onClick={() => cancelTarget && advance(cancelTarget, 'DIBATALKAN')}
            >
              {advancingId === cancelTarget?.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              Ya, Batalkan
            </Button>
            <Button variant="outline" className="w-full h-11" onClick={() => setCancelTarget(null)}>
              Tidak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------- Order Card ----------------
function OrderCard({
  order, onClick, onAdvance, onCancel, advancing, canMulaMasak, canTandaSiap, canTandaDiambil, canCancel,
}: {
  order: ActiveOrder
  onClick: () => void
  onAdvance: (o: ActiveOrder, s: 'DIMASAK' | 'SIAP' | 'DIAMBIL') => void
  onCancel: (o: ActiveOrder) => void
  advancing: boolean
  canMulaMasak: boolean
  canTandaSiap: boolean
  canTandaDiambil: boolean
  canCancel: boolean
}) {
  const t = order.timerStatus
  const pulse = t === 'merah' ? 'animate-pulse' : t === 'kuning' ? 'animate-pulse' : ''
  return (
    <Card
      className={cn(
        'glass-card border-0 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] overflow-hidden',
        'border-l-4',
        t === 'merah' && 'border-l-red-500 ring-2 ring-red-500/40',
        t === 'kuning' && 'border-l-amber-500 ring-1 ring-amber-500/40',
        t === 'ok' && 'border-l-emerald-500',
        pulse,
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2.5">
        {/* Header: noPesanan + timer */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-base text-primary truncate">{order.noPesanan}</span>
            <JenisIcon jenis={order.jenis} className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </div>
          <div className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold shrink-0',
            t === 'merah' && 'bg-red-500/20 text-red-600 dark:text-red-400',
            t === 'kuning' && 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
            t === 'ok' && 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
          )}>
            {t === 'merah' && <AlertTriangle className="h-3 w-3" />}
            <Clock className="h-3 w-3" />
            {order.menitBerlalu} min
          </div>
        </div>

        {/* Meja / pelanggan + waktu */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground truncate">
            {order.mejaNama || order.pelanggan?.nama || JENIS_PESANAN[order.jenis].label}
          </span>
          <span className="text-muted-foreground shrink-0">{formatTime(order.waktuPesanan)}</span>
        </div>

        {/* Items summary */}
        <div className="space-y-0.5">
          {order.items.slice(0, 3).map((it) => (
            <div key={it.id} className="flex items-start justify-between gap-2 text-xs">
              <span className="truncate">
                {it.kuantiti}× {it.namaSewaktu}
                {it.nota && <span className="text-amber-700 dark:text-amber-400"> · {it.nota}</span>}
              </span>
              <span className="text-muted-foreground shrink-0">{formatRM(it.subtotal)}</span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-xs text-muted-foreground italic">+{order.items.length - 3} lagi item</p>
          )}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between border-t border-border/40 pt-1.5">
          <span className="text-xs text-muted-foreground">Jumlah</span>
          <span className="font-bold text-sm text-primary">{formatRM(order.jumlah)}</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
          {order.status === 'DITERIMA' && canMulaMasak && (
            <Button
              size="sm"
              className="flex-1 h-9 bg-amber-600 hover:bg-amber-700 text-white"
              disabled={advancing}
              onClick={() => onAdvance(order, 'DIMASAK')}
            >
              {advancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChefHat className="h-3.5 w-3.5 mr-1" />}
              Mula Masak
            </Button>
          )}
          {order.status === 'DIMASAK' && canTandaSiap && (
            <Button
              size="sm"
              className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={advancing}
              onClick={() => onAdvance(order, 'SIAP')}
            >
              {advancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
              Tanda Siap
            </Button>
          )}
          {order.status === 'SIAP' && canTandaDiambil && (
            <Button
              size="sm"
              className="flex-1 h-9"
              disabled={advancing}
              onClick={() => onAdvance(order, 'DIAMBIL')}
            >
              {advancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Hand className="h-3.5 w-3.5 mr-1" />}
              Tanda Diambil
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={advancing}
              onClick={() => onCancel(order)}
              aria-label="Batalkan"
            >
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------- Status Actions (used in detail dialog) ----------------
function StatusActions({
  order, advancing, onAdvance, onCancel, canMulaMasak, canTandaSiap, canTandaDiambil, canCancel,
}: {
  order: ActiveOrder
  advancing: boolean
  onAdvance: (o: ActiveOrder, s: 'DIMASAK' | 'SIAP' | 'DIAMBIL') => void
  onCancel: (o: ActiveOrder) => void
  canMulaMasak: boolean
  canTandaSiap: boolean
  canTandaDiambil: boolean
  canCancel: boolean
}) {
  return (
    <div className="flex gap-2">
      {order.status === 'DITERIMA' && canMulaMasak && (
        <Button className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white" disabled={advancing} onClick={() => onAdvance(order, 'DIMASAK')}>
          {advancing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ChefHat className="h-4 w-4 mr-2" />}
          Mula Masak
        </Button>
      )}
      {order.status === 'DIMASAK' && canTandaSiap && (
        <Button className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={advancing} onClick={() => onAdvance(order, 'SIAP')}>
          {advancing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
          Tanda Siap
        </Button>
      )}
      {order.status === 'SIAP' && canTandaDiambil && (
        <Button className="flex-1 h-11" disabled={advancing} onClick={() => onAdvance(order, 'DIAMBIL')}>
          {advancing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Hand className="h-4 w-4 mr-2" />}
          Tanda Diambil
        </Button>
      )}
      {canCancel && (
        <Button variant="outline" className="h-11 px-3 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={advancing} onClick={() => onCancel(order)}>
          <XCircle className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

// ---------------- Info row ----------------
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}
