'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import type { Menu } from '@/lib/types'
import { KATEGORI_LIST, KATEGORI_MENU } from '@/lib/types'
import {
  UtensilsCrossed, Plus, Search, Pencil, Trash2, Loader2, PackageX,
} from 'lucide-react'
import {
  PageHeader, StatCard, LoadingState, EmptyState, Badge, GlassPanel,
  useApi, type SectionProps,
} from '@/components/sections/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const KATEGORI_COLORS: Record<string, string> = {
  MEE_KUEY_TEOW: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30',
  NASI: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
  MINUMAN: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30',
  SNEK: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30',
  TAMBAHAN: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
}

function kategoriBadge(kategori: string) {
  return KATEGORI_COLORS[kategori] ?? 'bg-muted text-muted-foreground border border-border'
}

function formatRM(v: number) {
  return `RM ${v.toFixed(2)}`
}

interface MenuFormState {
  nama: string
  kod: string
  kategori: string
  harga: string
  deskripsi: string
  tersedia: boolean
}

const emptyForm: MenuFormState = {
  nama: '', kod: '', kategori: KATEGORI_LIST[0].key, harga: '', deskripsi: '', tersedia: true,
}

export function MenuSection({ user }: SectionProps) {
  const canManage = user.role === 'PEMILIK'
  const { data, loading, error, refresh } = useApi<{ menu: Menu[] }>(() => api.get('/api/menu'), [])
  const [kategoriAktif, setKategoriAktif] = React.useState<string>('SEMUA')
  const [search, setSearch] = React.useState('')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<Menu | null>(null)
  const [form, setForm] = React.useState<MenuFormState>(emptyForm)
  const [submitting, setSubmitting] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<Menu | null>(null)

  const menuList = data?.menu ?? []
  const filtered = menuList.filter((m) => {
    if (kategoriAktif !== 'SEMUA' && m.kategori !== kategoriAktif) return false
    if (search) {
      const q = search.toLowerCase()
      return m.nama.toLowerCase().includes(q) || m.kod.toLowerCase().includes(q)
    }
    return true
  })

  const tersediaCount = menuList.filter((m) => m.tersedia).length

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(m: Menu) {
    setEditTarget(m)
    setForm({
      nama: m.nama,
      kod: m.kod,
      kategori: m.kategori,
      harga: String(m.harga),
      deskripsi: m.deskripsi ?? '',
      tersedia: m.tersedia,
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    const hargaNum = Number(form.harga)
    if (!form.nama.trim() || !form.kod.trim() || !form.harga || Number.isNaN(hargaNum)) {
      toast.error('Sila lengkapkan nama, kod dan harga yang sah.')
      return
    }
    setSubmitting(true)
    try {
      if (editTarget) {
        await api.put(`/api/menu/${editTarget.id}`, {
          nama: form.nama.trim(),
          kategori: form.kategori,
          harga: hargaNum,
          deskripsi: form.deskripsi.trim() || null,
          tersedia: form.tersedia,
        })
        toast.success('Menu berjaya dikemas kini.')
      } else {
        await api.post('/api/menu', {
          nama: form.nama.trim(),
          kod: form.kod.trim().toUpperCase(),
          kategori: form.kategori,
          harga: hargaNum,
          deskripsi: form.deskripsi.trim() || null,
        })
        toast.success('Menu baharu berjaya ditambah.')
      }
      setDialogOpen(false)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ralat menyimpan menu.')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleTersedia(m: Menu) {
    try {
      await api.put(`/api/menu/${m.id}`, { tersedia: !m.tersedia })
      toast.success(m.tersedia ? 'Menu ditandakan tidak tersedia.' : 'Menu ditandakan tersedia.')
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ralat menukar status.')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await api.del(`/api/menu/${deleteTarget.id}`)
      toast.success('Menu berjaya dipadam (ditanda tidak tersedia).')
      setDeleteTarget(null)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ralat memadam menu.')
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <EmptyState
        title="Ralat memuatkan menu"
        description={error}
        icon={PackageX}
        action={<Button variant="outline" onClick={refresh}>Cuba Lagi</Button>}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Menu & Harga"
        description="Urus menu Char Kue Teow & harga jualan"
        icon={UtensilsCrossed}
        actions={canManage ? (
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Tambah Menu
          </Button>
        ) : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <StatCard label="Jumlah Menu" value={menuList.length} icon={UtensilsCrossed} />
        <StatCard label="Tersedia" value={tersediaCount} icon={UtensilsCrossed} variant="success" />
        <StatCard label="Tidak Tersedia" value={menuList.length - tersediaCount} icon={PackageX} variant="warning" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau kod menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={kategoriAktif} onValueChange={setKategoriAktif} className="mb-5">
        <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/40 p-1">
          <TabsTrigger value="SEMUA">Semua</TabsTrigger>
          {KATEGORI_LIST.map((k) => (
            <TabsTrigger key={k.key} value={k.key}>{k.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <LoadingState label="Memuatkan menu..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tiada menu dijumpai"
          description={search ? 'Cuba kata kunci lain.' : 'Tambah menu pertama anda.'}
          icon={UtensilsCrossed}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Card
              key={m.id}
              className={`glass-card border-0 overflow-hidden transition-all ${m.tersedia ? '' : 'opacity-60'}`}
            >
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base truncate">{m.nama}</h3>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{m.kod}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge className={kategoriBadge(m.kategori)}>
                        {KATEGORI_MENU[m.kategori as keyof typeof KATEGORI_MENU] ?? m.kategori}
                      </Badge>
                      {!m.tersedia && <Badge variant="danger">Tidak Tersedia</Badge>}
                    </div>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-2">
                  <p className="text-2xl font-bold text-primary">{formatRM(m.harga)}</p>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`sw-${m.id}`} className="text-xs text-muted-foreground">
                        {m.tersedia ? 'Tersedia' : 'Disembunyi'}
                      </Label>
                      <Switch
                        id={`sw-${m.id}`}
                        checked={m.tersedia}
                        onCheckedChange={() => toggleTersedia(m)}
                      />
                    </div>
                  )}
                </div>

                {m.deskripsi && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{m.deskripsi}</p>
                )}

                {canManage && (
                  <div className="flex gap-2 pt-1 border-t border-border/40">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => openEdit(m)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(m)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Padam
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong border-0 max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Menu' : 'Tambah Menu Baharu'}</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Kemas kini butiran menu.' : 'Isi butiran menu baharu untuk ditambah.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nama">Nama Menu</Label>
              <Input
                id="nama"
                value={form.nama}
                onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                placeholder="cth. Char Kue Teow Klasik"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="kod">Kod</Label>
                <Input
                  id="kod"
                  value={form.kod}
                  onChange={(e) => setForm((f) => ({ ...f, kod: e.target.value.toUpperCase() }))}
                  placeholder="cth. CKT01"
                  disabled={!!editTarget}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="harga">Harga (RM)</Label>
                <Input
                  id="harga"
                  type="number"
                  step="0.50"
                  min="0"
                  value={form.harga}
                  onChange={(e) => setForm((f) => ({ ...f, harga: e.target.value }))}
                  placeholder="9.00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kategori">Kategori</Label>
              <Select
                value={form.kategori}
                onValueChange={(v) => setForm((f) => ({ ...f, kategori: v }))}
              >
                <SelectTrigger id="kategori"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KATEGORI_LIST.map((k) => (
                    <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                value={form.deskripsi}
                onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
                placeholder="cth. Dengan taugeh, udang & telur"
                rows={3}
              />
            </div>
            {editTarget && (
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div>
                  <Label htmlFor="tersedia" className="font-medium">Tersedia untuk Jualan</Label>
                  <p className="text-xs text-muted-foreground">Sembunyikan sementara tanpa memadam</p>
                </div>
                <Switch
                  id="tersedia"
                  checked={form.tersedia}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, tersedia: v }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editTarget ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="glass-strong border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Padam Menu?</AlertDialogTitle>
            <AlertDialogDescription>
              Menu <strong>{deleteTarget?.nama}</strong> akan ditandakan sebagai <em>tidak tersedia</em>.
              Rekod kekal untuk sejarah pesanan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Padam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
