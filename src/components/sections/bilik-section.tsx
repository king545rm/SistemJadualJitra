'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import type { Bilik, SessionUser } from '@/lib/types'
import {
  PageHeader,
  StatCard,
  LoadingState,
  CardSkeletons,
  EmptyState,
  Badge,
  useApi,
} from '@/components/sections/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DoorOpen,
  Plus,
  Pencil,
  Trash2,
  Users,
  CalendarDays,
  Building2,
  MonitorCog,
  Wrench,
} from 'lucide-react'

interface BilikSectionProps {
  user: SessionUser
}

const JENIS_LABEL: Record<Bilik['jenis'], string> = {
  KELAS: 'Kelas',
  MAKMAL: 'Makmal',
  BENGKEL: 'Bengkel',
}

const JENIS_BADGE: Record<Bilik['jenis'], 'info' | 'success' | 'warning'> = {
  KELAS: 'info',
  MAKMAL: 'success',
  BENGKEL: 'warning',
}

const JENIS_ICON: Record<Bilik['jenis'], React.ComponentType<{ className?: string }>> = {
  KELAS: Building2,
  MAKMAL: MonitorCog,
  BENGKEL: Wrench,
}

interface BilikFormState {
  namaBilik: string
  jenis: Bilik['jenis']
  kapasiti: string
}

const EMPTY_FORM: BilikFormState = {
  namaBilik: '',
  jenis: 'KELAS',
  kapasiti: '30',
}

export function BilikSection({ user }: BilikSectionProps) {
  const canManageBilik = ['TIMBALAN_PENGARAH', 'HEA', 'IT'].includes(user.role)

  const { data, loading, refresh } = useApi<{ bilik: Bilik[] }>(
    () => api.get('/api/bilik'),
    [],
  )

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Bilik | null>(null)
  const [form, setForm] = React.useState<BilikFormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<Bilik | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const bilik = data?.bilik ?? []

  const totalKapasiti = bilik.reduce((sum, b) => sum + (b.kapasiti || 0), 0)
  const totalSlot = bilik.reduce(
    (sum, b) => sum + (b._count?.slotJadual ?? 0),
    0,
  )
  const totalMakmal = bilik.filter((b) => b.jenis === 'MAKMAL').length

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(b: Bilik) {
    setEditing(b)
    setForm({
      namaBilik: b.namaBilik,
      jenis: b.jenis,
      kapasiti: String(b.kapasiti),
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    const namaBilik = form.namaBilik.trim().toUpperCase()
    if (!namaBilik) {
      toast.error('Nama bilik diperlukan.')
      return
    }
    const kapasiti = Number(form.kapasiti)
    if (!Number.isFinite(kapasiti) || kapasiti <= 0) {
      toast.error('Kapasiti mesti nombor positif.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/api/bilik/${editing.id}`, {
          namaBilik,
          jenis: form.jenis,
          kapasiti,
        })
        toast.success('Bilik berjaya dikemas kini.')
      } else {
        await api.post('/api/bilik', {
          namaBilik,
          jenis: form.jenis,
          kapasiti,
        })
        toast.success('Bilik baharu berjaya ditambah.')
      }
      setDialogOpen(false)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ralat tidak diketahui.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.del(`/api/bilik/${deleteTarget.id}`)
      toast.success('Bilik berjaya dipadam.')
      setDeleteTarget(null)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ralat tidak diketahui.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengurusan Bilik & Makmal"
        description="Daftar bilik darjah, makmal dan bengkel untuk penjadualan kelas."
        icon={DoorOpen}
        actions={
          canManageBilik ? (
            <Button onClick={openCreate} className="bg-primary">
              <Plus className="h-4 w-4" /> Tambah Bilik
            </Button>
          ) : null
        }
      />

      {loading ? (
        <CardSkeletons count={3} />
      ) : bilik.length === 0 ? (
        <EmptyState
          title="Tiada bilik berdaftar"
          description="Tambah bilik baharu untuk mula menjadualkan kelas."
          icon={DoorOpen}
          action={
            canManageBilik ? (
              <Button onClick={openCreate} className="bg-primary">
                <Plus className="h-4 w-4" /> Tambah Bilik
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Jumlah Bilik"
              value={bilik.length}
              icon={DoorOpen}
            />
            <StatCard
              label="Bilik Makmal"
              value={totalMakmal}
              icon={MonitorCog}
              variant="success"
            />
            <StatCard
              label="Jumlah Kapasiti"
              value={totalKapasiti}
              icon={Users}
            />
            <StatCard
              label="Slot Aktif"
              value={totalSlot}
              icon={CalendarDays}
              variant="warning"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bilik.map((b) => {
              const Icon = JENIS_ICON[b.jenis]
              return (
                <Card key={b.id} className="glass-card border-0">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg font-bold leading-tight truncate">
                            {b.namaBilik}
                          </p>
                          <Badge variant={JENIS_BADGE[b.jenis]}>
                            {JENIS_LABEL[b.jenis]}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="rounded-lg bg-muted/40 p-2.5">
                        <p className="text-[11px] text-muted-foreground">
                          Kapasiti
                        </p>
                        <p className="text-base font-semibold flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          {b.kapasiti}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2.5">
                        <p className="text-[11px] text-muted-foreground">
                          Slot Aktif
                        </p>
                        <p className="text-base font-semibold flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          {b._count?.slotJadual ?? 0}
                        </p>
                      </div>
                    </div>

                    {canManageBilik && (
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(b)}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(b)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Padam
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong border-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Bilik' : 'Tambah Bilik Baharu'}
            </DialogTitle>
            <DialogDescription>
              Isi maklumat bilik. Nama akan disimpan dalam huruf besar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="namaBilik">Nama Bilik</Label>
              <Input
                id="namaBilik"
                value={form.namaBilik}
                onChange={(e) =>
                  setForm((s) => ({ ...s, namaBilik: e.target.value }))
                }
                placeholder="cth: MK-1, BENGKEL-ELEKTRIK"
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jenis">Jenis Bilik</Label>
              <Select
                value={form.jenis}
                onValueChange={(v) =>
                  setForm((s) => ({ ...s, jenis: v as Bilik['jenis'] }))
                }
              >
                <SelectTrigger id="jenis" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KELAS">Kelas</SelectItem>
                  <SelectItem value="MAKMAL">Makmal</SelectItem>
                  <SelectItem value="BENGKEL">Bengkel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kapasiti">Kapasiti (pelajar)</Label>
              <Input
                id="kapasiti"
                type="number"
                min={1}
                value={form.kapasiti}
                onChange={(e) =>
                  setForm((s) => ({ ...s, kapasiti: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary">
              {saving ? 'Menyimpan...' : editing ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="glass-strong border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Padam bilik ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan memadam{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget?.namaBilik}
              </span>
              . Tindakan ini tidak boleh diundur. Slot jadual yang berkaitan
              mungkin terjejas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? 'Memadam...' : 'Padam'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
