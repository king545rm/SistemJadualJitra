'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import type { Pelanggan, Pesanan } from '@/lib/types'
import { STATUS_PESANAN, JENIS_PESANAN } from '@/lib/types'
import {
  Users, Search, Plus, Phone, Loader2, UserPlus, MessageSquareText,
  Calendar, ShoppingBag, X, Inbox,
} from 'lucide-react'
import {
  PageHeader, StatCard, LoadingState, EmptyState, Badge, GlassPanel,
  useApi, type SectionProps,
} from '@/components/sections/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

type PelangganRow = Pelanggan & { _count?: { pesanan: number } }

interface PelangganDetail extends Pelanggan {
  pesanan: Pesanan[]
}

function statusBadge(status: string) {
  const cfg = (STATUS_PESANAN as Record<string, { label: string; color: string }>)[status]
  if (!cfg) return <Badge>{status}</Badge>
  const variant =
    status === 'SIAP' ? 'success' :
    status === 'DIBATALKAN' ? 'danger' :
    status === 'DIAMBIL' ? 'default' :
    'warning'
  return <Badge variant={variant as 'success' | 'danger' | 'default' | 'warning'}>{cfg.label}</Badge>
}

function formatTarikh(d: string) {
  try {
    return new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return d }
}

function formatMasa(d: string) {
  try {
    return new Date(d).toLocaleString('ms-MY', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  } catch { return d }
}

function formatRM(v: number) { return `RM ${v.toFixed(2)}` }

export function PelangganSection({ user }: SectionProps) {
  const canManage = user.role === 'PEMILIK' || user.role === 'KAUNTER'
  const { data, loading, error, refresh } = useApi<{ pelanggan: PelangganRow[] }>(
    () => api.get('/api/pelanggan'),
    [],
  )
  const [search, setSearch] = React.useState('')
  const [addOpen, setAddOpen] = React.useState(false)
  const [form, setForm] = React.useState({ nama: '', telefon: '', catatan: '' })
  const [submitting, setSubmitting] = React.useState(false)
  const [detailId, setDetailId] = React.useState<string | null>(null)

  const pelangganList = data?.pelanggan ?? []
  const filtered = React.useMemo(() => {
    if (!search) return pelangganList
    const q = search.toLowerCase()
    return pelangganList.filter(
      (p) => p.nama.toLowerCase().includes(q) || p.telefon.toLowerCase().includes(q),
    )
  }, [pelangganList, search])

  const totalPelanggan = pelangganList.length
  const totalPesanan = pelangganList.reduce((s, p) => s + (p._count?.pesanan ?? 0), 0)
  const pelangganAktif = pelangganList.filter((p) => (p._count?.pesanan ?? 0) > 0).length

  async function handleAdd() {
    if (!form.nama.trim() || !form.telefon.trim()) {
      toast.error('Nama dan no telefon diperlukan.')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/api/pelanggan', {
        nama: form.nama.trim(),
        telefon: form.telefon.trim(),
        catatan: form.catatan.trim() || null,
      })
      toast.success('Pelanggan baharu berjaya ditambah.')
      setAddOpen(false)
      setForm({ nama: '', telefon: '', catatan: '' })
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ralat menambah pelanggan.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Rekod Pelanggan"
        description="Pengurusan pelanggan & sejarah pesanan"
        icon={Users}
        actions={canManage ? (
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Tambah Pelanggan
          </Button>
        ) : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <StatCard label="Jumlah Pelanggan" value={totalPelanggan} icon={Users} />
        <StatCard label="Pelanggan Aktif" value={pelangganAktif} icon={UserPlus} variant="success" />
        <StatCard label="Total Pesanan" value={totalPesanan} icon={ShoppingBag} variant="warning" />
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama atau no telefon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {error ? (
        <EmptyState
          title="Ralat memuatkan pelanggan"
          description={error}
          icon={Inbox}
          action={<Button variant="outline" onClick={refresh}>Cuba Lagi</Button>}
        />
      ) : loading ? (
        <LoadingState label="Memuatkan pelanggan..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tiada pelanggan dijumpai"
          description={search ? 'Cuba kata kunci lain.' : 'Tambah pelanggan pertama anda.'}
          icon={Users}
        />
      ) : (
        <>
          {/* Desktop: Table */}
          <div className="hidden md:block">
            <GlassPanel>
              <CardContent className="p-0">
                <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background/80 backdrop-blur z-10">
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Telefon</TableHead>
                        <TableHead>Catatan</TableHead>
                        <TableHead className="text-center">Bil. Pesanan</TableHead>
                        <TableHead>Tarikh Daftar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p) => (
                        <TableRow
                          key={p.id}
                          onClick={() => setDetailId(p.id)}
                          className="cursor-pointer hover:bg-primary/5"
                        >
                          <TableCell className="font-medium">{p.nama}</TableCell>
                          <TableCell>
                            <a
                              href={`tel:${p.telefon}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-primary hover:underline"
                            >
                              <Phone className="h-3.5 w-3.5" /> {p.telefon}
                            </a>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {p.catatan ?? '—'}
                          </TableCell>
                          <TableCell className="text-center font-semibold">{p._count?.pesanan ?? 0}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatTarikh(p.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </GlassPanel>
          </div>

          {/* Mobile: Cards */}
          <div className="md:hidden grid gap-3">
            {filtered.map((p) => (
              <Card
                key={p.id}
                className="glass-card border-0 cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => setDetailId(p.id)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{p.nama}</h3>
                      <a
                        href={`tel:${p.telefon}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-sm text-primary"
                      >
                        <Phone className="h-3.5 w-3.5" /> {p.telefon}
                      </a>
                    </div>
                    <Badge variant="info">{p._count?.pesanan ?? 0} pesanan</Badge>
                  </div>
                  {p.catatan && (
                    <p className="text-xs text-muted-foreground line-clamp-2 flex items-start gap-1.5">
                      <MessageSquareText className="h-3 w-3 mt-0.5 shrink-0" />
                      {p.catatan}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> {formatTarikh(p.createdAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong border-0 max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Pelanggan Baharu</DialogTitle>
            <DialogDescription>Isi butiran pelanggan untuk disimpan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-nama">Nama</Label>
              <Input
                id="p-nama"
                value={form.nama}
                onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                placeholder="cth. Ahmad bin Ali"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-telefon">No. Telefon</Label>
              <Input
                id="p-telefon"
                value={form.telefon}
                onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
                placeholder="cth. 0123456789"
                inputMode="tel"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-catatan">Catatan</Label>
              <Textarea
                id="p-catatan"
                value={form.catatan}
                onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
                placeholder="cth. CKT kurang minyak, pedas sederhana"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <PelangganDetailDialog
        id={detailId}
        onClose={() => setDetailId(null)}
        onNavigatePesanan={undefined}
      />
    </div>
  )
}

function PelangganDetailDialog({ id, onClose }: { id: string | null; onClose: () => void; onNavigatePesanan?: (id: string) => void }) {
  const { data, loading } = useApi<{ pelanggan: PelangganDetail }>(
    () => (id ? api.get(`/api/pelanggan/${id}`) : Promise.reject('no id')),
    [id],
  )

  const pelanggan = data?.pelanggan
  const pesanan = pelanggan?.pesanan ?? []

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong border-0 max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Butiran Pelanggan
          </DialogTitle>
          <DialogDescription>Sejarah pesanan & maklumat pelanggan</DialogDescription>
        </DialogHeader>

        {loading || !pelanggan ? (
          <LoadingState label="Memuatkan butiran..." />
        ) : (
          <ScrollArea className="max-h-[65vh] pr-3">
            <div className="space-y-4">
              {/* Info */}
              <div className="grid sm:grid-cols-2 gap-3 rounded-lg border border-border/60 p-4 bg-muted/20">
                <div>
                  <p className="text-xs text-muted-foreground">Nama</p>
                  <p className="font-semibold">{pelanggan.nama}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telefon</p>
                  <a
                    href={`tel:${pelanggan.telefon}`}
                    className="font-semibold text-primary inline-flex items-center gap-1.5 hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" /> {pelanggan.telefon}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tarikh Daftar</p>
                  <p className="font-medium">{formatTarikh(pelanggan.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Jumlah Pesanan</p>
                  <p className="font-semibold">{pesanan.length}</p>
                </div>
                {pelanggan.catatan && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Catatan</p>
                    <p className="text-sm mt-0.5 flex items-start gap-1.5">
                      <MessageSquareText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                      {pelanggan.catatan}
                    </p>
                  </div>
                )}
              </div>

              {/* Order history */}
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" /> Sejarah Pesanan
                  <span className="text-xs text-muted-foreground font-normal">(20 terkini)</span>
                </h4>
                {pesanan.length === 0 ? (
                  <EmptyState title="Tiada pesanan" icon={Inbox} />
                ) : (
                  <div className="space-y-2">
                    {pesanan.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3 hover:bg-primary/5 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-semibold">{p.noPesanan}</span>
                            {statusBadge(p.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatMasa(p.waktuPesanan)} · {p.items.length} item
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold">{formatRM(p.jumlah)}</p>
                          <p className="text-xs text-muted-foreground">
                            {(JENIS_PESANAN as Record<string, { label: string }>)[p.jenis]?.label ?? p.jenis}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="gap-1.5">
            <X className="h-4 w-4" /> Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
