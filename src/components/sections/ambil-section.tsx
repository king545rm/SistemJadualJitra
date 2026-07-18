'use client'

import * as React from 'react'
import {
  ClipboardList, Search, Plus, Minus, Trash2, Utensils, Package, Truck,
  StickyNote, ShoppingCart, X, CheckCircle2, Loader2, User, Phone, Receipt,
  Flame, AlertCircle, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  PageHeader, LoadingState, EmptyState, Badge, GlassPanel, useApi, type SectionProps,
} from '@/components/sections/shared'
import { api } from '@/lib/api-client'
import {
  KATEGORI_LIST, JENIS_PESANAN,
  type Menu, type JenisPesanan, type Pesanan, type Pelanggan,
} from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ---------------- Cart type ----------------
interface CartItem {
  menuId: string
  nama: string
  harga: number
  kuantiti: number
  nota: string
  showNota: boolean
}

function formatRM(n: number) {
  return `RM ${Number(n || 0).toFixed(2)}`
}

const JENIS_OPTIONS: { value: JenisPesanan; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'DINE_IN', label: 'Makan Di Sini', icon: Utensils },
  { value: 'BUNGKUS', label: 'Bungkus', icon: Package },
  { value: 'DELIVERY', label: 'Penghantaran', icon: Truck },
]

// ---------------- Component ----------------
export function AmbilSection({ user, onNavigate }: SectionProps) {
  const { data, loading, error } = useApi<{ menu: Menu[] }>(() => api.get('/api/menu'), [])

  // Cart + order state
  const [cart, setCart] = React.useState<CartItem[]>([])
  const [jenis, setJenis] = React.useState<JenisPesanan>('DINE_IN')
  const [mejaNama, setMejaNama] = React.useState('')
  const [pelangganNama, setPelangganNama] = React.useState('')
  const [pelangganTelefon, setPelangganTelefon] = React.useState('')
  const [existingPelanggan, setExistingPelanggan] = React.useState<Pelanggan | null>(null)
  const [catatan, setCatatan] = React.useState('')
  const [jumlahDibayar, setJumlahDibayar] = React.useState<string>('')
  const [searchingTelefon, setSearchingTelefon] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [lastOrder, setLastOrder] = React.useState<Pesanan | null>(null)
  const [showSuccess, setShowSuccess] = React.useState(false)

  // Menu filter state
  const [activeKat, setActiveKat] = React.useState<string>('SEMUA')
  const [search, setSearch] = React.useState('')

  // Lookup pelanggan by telefon (debounced)
  React.useEffect(() => {
    if (pelangganTelefon.length < 4) {
      setExistingPelanggan(null)
      return
    }
    const t = setTimeout(async () => {
      setSearchingTelefon(true)
      try {
        const res = await api.get<{ pelanggan: Pelanggan[] }>(`/api/pelanggan?telefon=${encodeURIComponent(pelangganTelefon)}`)
        if (res.pelanggan.length > 0) {
          setExistingPelanggan(res.pelanggan[0])
          if (!pelangganNama) setPelangganNama(res.pelanggan[0].nama)
        } else {
          setExistingPelanggan(null)
        }
      } catch {
        setExistingPelanggan(null)
      } finally {
        setSearchingTelefon(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [pelangganTelefon])

  // ---- Cart operations ----
  const addToCart = React.useCallback((menu: Menu) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuId === menu.id && !c.nota)
      if (existing) {
        return prev.map((c) => c.menuId === menu.id && !c.nota ? { ...c, kuantiti: c.kuantiti + 1 } : c)
      }
      return [...prev, { menuId: menu.id, nama: menu.nama, harga: menu.harga, kuantiti: 1, nota: '', showNota: false }]
    })
  }, [])

  const updateQty = (menuId: string, nota: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => {
          if (c.menuId === menuId && c.nota === nota) {
            const next = c.kuantiti + delta
            return next <= 0 ? null : { ...c, kuantiti: next }
          }
          return c
        })
        .filter(Boolean) as CartItem[]
    })
  }

  const removeItem = (menuId: string, nota: string) => {
    setCart((prev) => prev.filter((c) => !(c.menuId === menuId && c.nota === nota)))
  }

  const toggleNota = (menuId: string, nota: string) => {
    setCart((prev) => prev.map((c) => c.menuId === menuId && c.nota === nota ? { ...c, showNota: !c.showNota } : c))
  }

  const setItemNota = (menuId: string, oldNota: string, newNota: string) => {
    setCart((prev) => {
      // If nota changes to non-empty and matches another existing nota for same menu, merge
      const target = prev.find((c) => c.menuId === menuId && c.nota === oldNota)
      if (!target) return prev
      const trimmed = newNota.trim()
      const conflict = prev.find((c) => c.menuId === menuId && c.nota === trimmed && c !== target)
      if (conflict && trimmed) {
        // merge target into conflict
        return prev
          .filter((c) => c !== target)
          .map((c) => c === conflict ? { ...c, kuantiti: c.kuantiti + target.kuantiti } : c)
      }
      return prev.map((c) => c === target ? { ...c, nota: trimmed } : c)
    })
  }

  const clearCart = () => {
    setCart([])
    setMejaNama('')
    setPelangganNama('')
    setPelangganTelefon('')
    setExistingPelanggan(null)
    setCatatan('')
    setJumlahDibayar('')
  }

  // ---- Calculations ----
  const total = cart.reduce((s, c) => s + c.harga * c.kuantiti, 0)
  const dibayarNum = parseFloat(jumlahDibayar) || 0
  const baki = dibayarNum - total

  // ---- Filtered menu ----
  const filteredMenu = React.useMemo(() => {
    if (!data?.menu) return []
    return data.menu.filter((m) => {
      if (activeKat !== 'SEMUA' && m.kategori !== activeKat) return false
      if (search) {
        const q = search.toLowerCase()
        if (!m.nama.toLowerCase().includes(q) && !m.kod.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [data?.menu, activeKat, search])

  // ---- Submit ----
  const canSubmit = (() => {
    if (cart.length === 0) return false
    if (jenis === 'DINE_IN' && !mejaNama.trim()) return false
    if ((jenis === 'BUNGKUS' || jenis === 'DELIVERY') && !pelangganNama.trim()) return false
    return true
  })()

  async function handleSubmit() {
    if (!canSubmit) {
      toast.error('Sila lengkapkan pesanan sebelum dihantar.')
      return
    }
    setSubmitting(true)
    try {
      // Group items by menuId+nota (cart items already unique per menuId+nota)
      const items = cart.map((c) => ({
        menuId: c.menuId,
        kuantiti: c.kuantiti,
        nota: c.nota || undefined,
      }))
      const payload: Record<string, unknown> = {
        jenis,
        items,
        catatan: catatan || undefined,
        jumlahDibayar: dibayarNum,
      }
      if (jenis === 'DINE_IN') payload.mejaNama = mejaNama.trim()
      else {
        payload.pelangganId = existingPelanggan?.id
        payload.mejaNama = pelangganNama.trim() // store customer name in mejaNama field for display
      }
      const res = await api.post<{ pesanan: Pesanan }>('/api/pesanan', payload)
      toast.success(`Pesanan ${res.pesanan.noPesanan} berjaya dihantar!`)
      setLastOrder(res.pesanan)
      setShowSuccess(true)
      clearCart()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menghantar pesanan.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ---- Loading / error states ----
  if (loading) {
    return (
      <>
        <PageHeader title="Ambil Pesanan" description="Rekod pesanan baharu dengan pantas" icon={ClipboardList} />
        <div className="grid lg:grid-cols-[1fr_400px] gap-4">
          <GlassPanel><CardContent className="p-6"><LoadingState label="Memuatkan menu..." /></CardContent></GlassPanel>
          <GlassPanel><CardContent className="p-6"><LoadingState label="Memuatkan..." /></CardContent></GlassPanel>
        </div>
      </>
    )
  }
  if (error) {
    return (
      <>
        <PageHeader title="Ambil Pesanan" description="Rekod pesanan baharu dengan pantas" icon={ClipboardList} />
        <EmptyState title="Gagal memuatkan menu" description={error} icon={AlertCircle} />
      </>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ambil Pesanan"
        description="Rekod pesanan baharu dengan pantas"
        icon={ClipboardList}
        actions={
          <Button variant="outline" size="sm" onClick={onNavigate.bind(null, 'papan')} className="h-10">
            <ShoppingCart className="h-4 w-4 mr-1.5" /> Papan Status
          </Button>
        }
      />

      <div className="grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] gap-4">
        {/* ============ LEFT: MENU GRID ============ */}
        <GlassPanel>
          <CardHeader className="pb-3">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari menu (nama atau kod)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-11"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1 -mx-1 px-1">
                <KategoriTab label="Semua" active={activeKat === 'SEMUA'} onClick={() => setActiveKat('SEMUA')} />
                {KATEGORI_LIST.map((k) => (
                  <KategoriTab key={k.key} label={k.label} active={activeKat === k.key} onClick={() => setActiveKat(k.key)} />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredMenu.length === 0 ? (
              <EmptyState title="Tiada menu dijumpai" description="Cuba tukar carian atau kategori." icon={Search} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {filteredMenu.map((m) => (
                  <button
                    key={m.id}
                    disabled={!m.tersedia}
                    onClick={() => addToCart(m)}
                    className={cn(
                      'relative text-left p-3 rounded-xl border transition-all min-h-[88px] flex flex-col justify-between',
                      m.tersedia
                        ? 'glass-card border-0 hover:ring-2 hover:ring-primary/60 hover:scale-[1.02] active:scale-95 cursor-pointer'
                        : 'bg-muted/40 border border-border/40 opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div>
                      <p className="font-semibold text-sm leading-tight line-clamp-2">{m.nama}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{m.kod}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-primary text-sm">{formatRM(m.harga)}</span>
                      {m.tersedia ? (
                        <span className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-medium">Habis</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </GlassPanel>

        {/* ============ RIGHT: CART ============ */}
        <GlassPanel className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] flex flex-col">
          <CardHeader className="pb-3 shrink-0">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" /> Troli Pesanan
              </span>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart} className="h-8 text-xs text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Kosong
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto scrollbar-thin space-y-3 pb-2">
            {/* --- Order type selector --- */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Jenis Pesanan</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {JENIS_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  const active = jenis === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setJenis(opt.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all min-h-[60px] justify-center',
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[10px] font-medium leading-tight text-center">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* --- Customer / table inputs --- */}
            {jenis === 'DINE_IN' ? (
              <div>
                <Label htmlFor="meja" className="text-xs text-muted-foreground mb-1.5 block">No. Meja *</Label>
                <Input
                  id="meja"
                  placeholder="cth: M5"
                  value={mejaNama}
                  onChange={(e) => setMejaNama(e.target.value)}
                  className="h-11"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <Label htmlFor="nama" className="text-xs text-muted-foreground mb-1.5 block">Nama Pelanggan *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="nama"
                      placeholder="Nama pelanggan"
                      value={pelangganNama}
                      onChange={(e) => setPelangganNama(e.target.value)}
                      className="pl-9 h-11"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="telefon" className="text-xs text-muted-foreground mb-1.5 block">No. Telefon (cari pelanggan sedia ada)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="telefon"
                      placeholder="0123456789"
                      value={pelangganTelefon}
                      onChange={(e) => setPelangganTelefon(e.target.value)}
                      className="pl-9 h-11 pr-9"
                      inputMode="tel"
                    />
                    {searchingTelefon && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {existingPelanggan && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Pelanggan sedia ada dijumpai
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* --- Cart items --- */}
            {cart.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground border border-dashed border-border/60 rounded-xl">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Tambah item dari menu
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((c) => (
                  <div key={`${c.menuId}-${c.nota}`} className="rounded-lg bg-muted/30 border border-border/40 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm leading-tight">{c.nama}</p>
                        <p className="text-xs text-muted-foreground">{formatRM(c.harga)}</p>
                      </div>
                      <button
                        onClick={() => removeItem(c.menuId, c.nota)}
                        className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center shrink-0"
                        aria-label="Buang item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQty(c.menuId, c.nota, -1)}
                          className="h-8 w-8 rounded-md bg-background border border-border flex items-center justify-center hover:bg-muted active:scale-95"
                          aria-label="Kurang"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center font-semibold text-sm">{c.kuantiti}</span>
                        <button
                          onClick={() => updateQty(c.menuId, c.nota, 1)}
                          className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95"
                          aria-label="Tambah"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="font-bold text-sm text-primary">{formatRM(c.harga * c.kuantiti)}</span>
                    </div>
                    {/* Nota */}
                    <div className="mt-2">
                      {c.showNota ? (
                        <Input
                          autoFocus
                          placeholder="cth: tak nak taugeh, pedas..."
                          value={c.nota}
                          onChange={(e) => setItemNota(c.menuId, c.nota, e.target.value)}
                          onBlur={() => c.nota || toggleNota(c.menuId, c.nota)}
                          className="h-8 text-xs"
                        />
                      ) : c.nota ? (
                        <button
                          onClick={() => toggleNota(c.menuId, c.nota)}
                          className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:underline"
                        >
                          <StickyNote className="h-3 w-3" /> {c.nota}
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleNota(c.menuId, c.nota)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        >
                          <StickyNote className="h-3 w-3" /> Tambah nota
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* --- Catatan keseluruhan --- */}
            {cart.length > 0 && (
              <div>
                <Label htmlFor="catatan" className="text-xs text-muted-foreground mb-1.5 block">Catatan Keseluruhan (pilihan)</Label>
                <Textarea
                  id="catatan"
                  placeholder="cth: kurang minyak, semua pedas..."
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="min-h-[60px] text-sm resize-none"
                />
              </div>
            )}
          </CardContent>

          {/* --- Footer: totals + submit --- */}
          {cart.length > 0 && (
            <div className="border-t border-border/40 p-4 space-y-3 shrink-0 glass-strong rounded-b-[var(--radius-xl)]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Jumlah</span>
                <span className="text-2xl font-bold text-primary">{formatRM(total)}</span>
              </div>
              <div>
                <Label htmlFor="bayar" className="text-xs text-muted-foreground mb-1.5 block">Jumlah Dibayar</Label>
                <Input
                  id="bayar"
                  type="number"
                  inputMode="decimal"
                  step="0.10"
                  placeholder="0.00"
                  value={jumlahDibayar}
                  onChange={(e) => setJumlahDibayar(e.target.value)}
                  className="h-11"
                />
                {dibayarNum > 0 && (
                  <div className="flex items-center justify-between mt-1.5 text-sm">
                    <span className="text-muted-foreground">
                      {baki >= 0 ? 'Baki/Kembalian' : 'Kurang Bayar'}
                    </span>
                    <span className={cn('font-semibold', baki >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                      {formatRM(Math.abs(baki))}
                    </span>
                  </div>
                )}
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {submitting ? (
                  <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Menghantar...</>
                ) : (
                  <><Flame className="h-5 w-5 mr-2" /> Hantar Pesanan</>
                )}
              </Button>
              {!canSubmit && (
                <p className="text-xs text-muted-foreground text-center">
                  {jenis === 'DINE_IN' && !mejaNama.trim() ? 'Sila masukkan no. meja' : 'Lengkapkan maklumat pesanan'}
                </p>
              )}
            </div>
          )}
        </GlassPanel>
      </div>

      {/* ============ SUCCESS DIALOG ============ */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="glass-strong border-0 max-w-md">
          <DialogHeader>
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <DialogTitle className="text-center text-xl">Pesanan Berjaya!</DialogTitle>
            <DialogDescription className="text-center">
              Pesanan telah dihantar ke dapur.
            </DialogDescription>
          </DialogHeader>
          {lastOrder && (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">No. Pesanan</p>
              <p className="text-3xl font-bold text-primary tracking-tight">{lastOrder.noPesanan}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Jumlah: <span className="font-semibold text-foreground">{formatRM(lastOrder.jumlah)}</span>
              </p>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => { setShowSuccess(false); onNavigate('resit') }}
              className="w-full h-11"
              variant="outline"
            >
              <Receipt className="h-4 w-4 mr-2" /> Lihat Resit
            </Button>
            <Button
              onClick={() => { setShowSuccess(false); onNavigate('papan') }}
              className="w-full h-11"
              variant="outline"
            >
              <ChevronRight className="h-4 w-4 mr-2" /> Papan Status
            </Button>
            <Button
              onClick={() => setShowSuccess(false)}
              className="w-full h-11"
            >
              <Plus className="h-4 w-4 mr-2" /> Ambil Pesanan Lagi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------- Kategori Tab ----------------
function KategoriTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap min-h-[36px]',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {label}
    </button>
  )
}
