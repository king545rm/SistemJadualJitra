'use client'

import * as React from 'react'
import { api } from '@/lib/api-client'
import type { Pesanan, JenisPesanan } from '@/lib/types'
import { STATUS_PESANAN, JENIS_PESANAN } from '@/lib/types'
import {
  Receipt, Search, Printer, X, Calendar, Inbox, Flame,
} from 'lucide-react'
import {
  PageHeader, StatCard, LoadingState, EmptyState, Badge, GlassPanel,
  useApi, type SectionProps,
} from '@/components/sections/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

interface ResitItem {
  nama: string
  kuantiti: number
  harga: number
  subtotal: number
  nota?: string | null
}
interface ResitData {
  noPesanan: string
  waktuPesanan: string
  jenis: JenisPesanan
  mejaNama?: string | null
  diambilOleh?: string | null
  items: ResitItem[]
  jumlah: number
  jumlahDibayar: number
  baki: number
}

function formatRM(v: number) { return `RM ${v.toFixed(2)}` }

function formatMasa(d: string) {
  try {
    return new Date(d).toLocaleString('ms-MY', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return d }
}

function statusBadge(status: string) {
  const cfg = (STATUS_PESANAN as Record<string, { label: string }>)[status]
  const variant =
    status === 'SIAP' ? 'success' :
    status === 'DIBATALKAN' ? 'danger' :
    status === 'DIAMBIL' ? 'default' :
    'warning'
  return <Badge variant={variant as 'success' | 'danger' | 'default' | 'warning'}>{cfg?.label ?? status}</Badge>
}

function jenisLabel(j: string) {
  return (JENIS_PESANAN as Record<string, { label: string }>)[j]?.label ?? j
}

export function ResitSection(_props: SectionProps) {
  const { data, loading, error, refresh } = useApi<{ pesanan: Pesanan[] }>(
    () => api.get('/api/pesanan?limit=100'),
    [],
  )
  const [search, setSearch] = React.useState('')
  const [tarikhFilter, setTarikhFilter] = React.useState('')
  const [resitPesananId, setResitPesananId] = React.useState<string | null>(null)

  const pesananList = data?.pesanan ?? []
  const filtered = React.useMemo(() => {
    return pesananList.filter((p) => {
      if (search) {
        const q = search.toLowerCase()
        if (!p.noPesanan.toLowerCase().includes(q) && !(p.mejaNama ?? '').toLowerCase().includes(q)) {
          return false
        }
      }
      if (tarikhFilter) {
        const d = new Date(p.waktuPesanan).toISOString().split('T')[0]
        if (d !== tarikhFilter) return false
      }
      return true
    })
  }, [pesananList, search, tarikhFilter])

  const totalHari = pesananList.length
  const jumlahJualan = pesananList
    .filter((p) => p.status !== 'DIBATALKAN')
    .reduce((s, p) => s + p.jumlah, 0)

  return (
    <div>
      <PageHeader
        title="Resit Pesanan"
        description="Lihat & cetak semula resit pesanan"
        icon={Receipt}
      />

      <div className="grid gap-3 sm:grid-cols-2 mb-5">
        <StatCard label="Total Pesanan (100 terkini)" value={totalHari} icon={Receipt} />
        <StatCard label="Jumlah Jualan" value={formatRM(jumlahJualan)} icon={Flame} variant="success" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari no. pesanan atau meja..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative sm:w-44">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            value={tarikhFilter}
            onChange={(e) => setTarikhFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {error ? (
        <EmptyState
          title="Ralat memuatkan pesanan"
          description={error}
          icon={Inbox}
          action={<Button variant="outline" onClick={refresh}>Cuba Lagi</Button>}
        />
      ) : loading ? (
        <LoadingState label="Memuatkan pesanan..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tiada pesanan dijumpai"
          description={search || tarikhFilter ? 'Cuba penapis lain.' : 'Belum ada pesanan.'}
          icon={Receipt}
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
                        <TableHead>No. Pesanan</TableHead>
                        <TableHead>Masa</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Meja/Pelanggan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono font-semibold">{p.noPesanan}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatMasa(p.waktuPesanan)}</TableCell>
                          <TableCell className="text-sm">{jenisLabel(p.jenis)}</TableCell>
                          <TableCell className="text-sm">{p.mejaNama ?? '—'}</TableCell>
                          <TableCell>{statusBadge(p.status)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatRM(p.jumlah)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => setResitPesananId(p.id)}
                            >
                              <Receipt className="h-3.5 w-3.5" /> Lihat Resit
                            </Button>
                          </TableCell>
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
              <Card key={p.id} className="glass-card border-0">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono font-semibold">{p.noPesanan}</p>
                      <p className="text-xs text-muted-foreground">{formatMasa(p.waktuPesanan)}</p>
                    </div>
                    {statusBadge(p.status)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {jenisLabel(p.jenis)} · {p.mejaNama ?? '—'}
                    </span>
                    <span className="font-semibold">{formatRM(p.jumlah)}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => setResitPesananId(p.id)}
                  >
                    <Receipt className="h-3.5 w-3.5" /> Lihat Resit
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <ResitDialog pesananId={resitPesananId} onClose={() => setResitPesananId(null)} />
    </div>
  )
}

function ResitDialog({ pesananId, onClose }: { pesananId: string | null; onClose: () => void }) {
  const { data, loading, error } = useApi<{ resit: ResitData }>(
    () => (pesananId ? api.get(`/api/pesanan/${pesananId}/resit`) : Promise.reject('no id')),
    [pesananId],
  )
  const resit = data?.resit

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {/* Print styles — only the receipt prints */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-receipt, .print-receipt * { visibility: visible !important; }
          .print-receipt {
            position: absolute !important;
            top: 0; left: 0; right: 0;
            width: 80mm;
            margin: 0 auto;
            padding: 8mm 4mm;
            background: white !important;
            color: black !important;
            backdrop-filter: none !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <Dialog open={!!pesananId} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="glass-strong border-0 max-w-md max-h-[90vh]">
          <DialogHeader className="no-print">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" /> Resit Pesanan
            </DialogTitle>
            <DialogDescription>Cetak semula resit pesanan</DialogDescription>
          </DialogHeader>

          {loading ? (
            <LoadingState label="Memuatkan resit..." />
          ) : error ? (
            <EmptyState title="Ralat memuatkan resit" description={error} icon={Inbox} />
          ) : !resit ? null : (
            <ScrollArea className="max-h-[60vh]">
              <div className="print-receipt bg-white text-black rounded-lg p-5 font-mono text-sm">
                {/* Header */}
                <div className="text-center border-b border-dashed border-black/30 pb-3 mb-3">
                  <div className="inline-flex items-center justify-center gap-1.5">
                    <Flame className="h-5 w-5 text-orange-600" />
                    <h2 className="text-lg font-bold tracking-wide">CKT ADIK</h2>
                  </div>
                  <p className="text-xs mt-1">Char Kue Teow Specialist</p>
                  <p className="text-xs font-semibold mt-2">Terima Kasih!</p>
                </div>

                {/* Meta */}
                <div className="space-y-0.5 text-xs mb-3">
                  <div className="flex justify-between">
                    <span>No. Pesanan</span>
                    <span className="font-bold">{resit.noPesanan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Masa</span>
                    <span>{formatMasa(resit.waktuPesanan)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jenis</span>
                    <span>{jenisLabel(resit.jenis)}</span>
                  </div>
                  {resit.mejaNama && (
                    <div className="flex justify-between">
                      <span>{resit.jenis === 'DINE_IN' ? 'Meja' : 'Pelanggan'}</span>
                      <span className="font-semibold">{resit.mejaNama}</span>
                    </div>
                  )}
                  {resit.diambilOleh && (
                    <div className="flex justify-between">
                      <span>Diambil Oleh</span>
                      <span>{resit.diambilOleh}</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="border-t border-dashed border-black/30 pt-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-black/20">
                        <th className="text-left pb-1 font-semibold">Item</th>
                        <th className="text-right pb-1 font-semibold w-10">Bil</th>
                        <th className="text-right pb-1 font-semibold w-16">Harga</th>
                        <th className="text-right pb-1 font-semibold w-16">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resit.items.map((it, i) => (
                        <tr key={i} className="align-top">
                          <td className="py-1">
                            <span className="font-semibold">{it.nama}</span>
                            {it.nota && (
                              <span className="block text-[10px] italic text-black/60">
                                * {it.nota}
                              </span>
                            )}
                          </td>
                          <td className="text-right py-1">{it.kuantiti}</td>
                          <td className="text-right py-1">{it.harga.toFixed(2)}</td>
                          <td className="text-right py-1 font-semibold">{it.subtotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="border-t border-dashed border-black/30 mt-2 pt-2 space-y-0.5 text-xs">
                  <div className="flex justify-between font-bold text-sm">
                    <span>JUMLAH</span>
                    <span>RM {resit.jumlah.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dibayar</span>
                    <span>RM {resit.jumlahDibayar.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>{resit.baki >= 0 ? 'Baki' : 'Kembalian'}</span>
                    <span>RM {Math.abs(resit.baki).toFixed(2)}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-dashed border-black/30 mt-3 pt-2 text-center text-[10px]">
                  <p className="font-semibold">— Sistem CAOMS —</p>
                  <p>CKT Adik Order Management System</p>
                  <p className="mt-1">Simpan resit ini untuk rujukan</p>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="no-print">
            <Button variant="outline" onClick={onClose} className="gap-1.5">
              <X className="h-4 w-4" /> Tutup
            </Button>
            <Button onClick={handlePrint} disabled={loading || !resit} className="gap-1.5">
              <Printer className="h-4 w-4" /> Cetak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
