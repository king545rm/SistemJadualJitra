'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import type {
  Kursus,
  KumpulanSemester,
  Pensyarah,
  SessionUser,
} from '@/lib/types'
import {
  PageHeader,
  StatCard,
  CardSkeletons,
  EmptyState,
  Badge,
  useApi,
} from '@/components/sections/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Users,
  Layers,
  GraduationCap,
  CalendarClock,
  Eye,
} from 'lucide-react'

interface KursusSectionProps {
  user: SessionUser
}

type KumpulanStatus = KumpulanSemester['status']

const STATUS_LABEL: Record<KumpulanStatus, string> = {
  BELAJAR: 'Belajar',
  LATIHAN_INDUSTRI: 'Latihan Industri',
  TAMAT: 'Tamat',
}

const STATUS_BADGE: Record<KumpulanStatus, 'info' | 'warning' | 'default'> = {
  BELAJAR: 'info',
  LATIHAN_INDUSTRI: 'warning',
  TAMAT: 'default',
}

interface KursusFormState {
  namaKursus: string
  kodKursus: string
  deskripsi: string
}

interface KumpulanFormState {
  semesterNo: string
  bilPelajar: string
  status: KumpulanStatus
  kohortNama: string
}

const EMPTY_KURSUS_FORM: KursusFormState = {
  namaKursus: '',
  kodKursus: '',
  deskripsi: '',
}

const EMPTY_KUMPULAN_FORM: KumpulanFormState = {
  semesterNo: '1',
  bilPelajar: '30',
  status: 'BELAJAR',
  kohortNama: '',
}

export function KursusSection({ user }: KursusSectionProps) {
  const canManage = ['TIMBALAN_PENGARAH', 'HEA', 'KETUA_KURSUS'].includes(
    user.role,
  )
  const isKetuaKursus = user.role === 'KETUA_KURSUS'

  const { data, loading, refresh } = useApi<{ kursus: Kursus[] }>(
    () => api.get('/api/kursus'),
    [],
  )

  // For KETUA_KURSUS, only show their kursus
  const allKursus = data?.kursus ?? []
  const kursusList = isKetuaKursus
    ? allKursus.filter((k) => k.id === user.kursusId)
    : allKursus

  // Create / edit kursus dialog
  const [kursusDialogOpen, setKursusDialogOpen] = React.useState(false)
  const [editingKursus, setEditingKursus] = React.useState<Kursus | null>(null)
  const [kursusForm, setKursusForm] = React.useState<KursusFormState>(
    EMPTY_KURSUS_FORM,
  )
  const [savingKursus, setSavingKursus] = React.useState(false)

  // Detail dialog
  const [detailKursus, setDetailKursus] = React.useState<Kursus | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [detailLoading, setDetailLoading] = React.useState(false)

  // Kumpulan inline forms
  const [kumpulanForm, setKumpulanForm] = React.useState<KumpulanFormState>(
    EMPTY_KUMPULAN_FORM,
  )
  const [editingKumpulanId, setEditingKumpulanId] = React.useState<string | null>(
    null,
  )
  const [savingKumpulan, setSavingKumpulan] = React.useState(false)

  // Delete dialogs
  const [deleteKursusTarget, setDeleteKursusTarget] = React.useState<Kursus | null>(
    null,
  )
  const [deleteKumpulanTarget, setDeleteKumpulanTarget] =
    React.useState<KumpulanSemester | null>(null)
  const [deletingKursus, setDeletingKursus] = React.useState(false)
  const [deletingKumpulan, setDeletingKumpulan] = React.useState(false)

  const totalKursus = kursusList.length
  const totalKumpulan = kursusList.reduce(
    (sum, k) => sum + (k.kumpulan?.length ?? k._count?.kumpulan ?? 0),
    0,
  )
  const totalPensyarah = kursusList.reduce(
    (sum, k) => sum + (k._count?.pensyarahKursus ?? 0),
    0,
  )

  function openCreateKursus() {
    setEditingKursus(null)
    setKursusForm(EMPTY_KURSUS_FORM)
    setKursusDialogOpen(true)
  }

  function openEditKursus(k: Kursus) {
    setEditingKursus(k)
    setKursusForm({
      namaKursus: k.namaKursus,
      kodKursus: k.kodKursus,
      deskripsi: k.deskripsi ?? '',
    })
    setKursusDialogOpen(true)
  }

  async function handleSaveKursus() {
    const namaKursus = kursusForm.namaKursus.trim()
    const kodKursus = kursusForm.kodKursus.trim().toUpperCase()
    if (!namaKursus || !kodKursus) {
      toast.error('Nama kursus dan kod kursus diperlukan.')
      return
    }
    setSavingKursus(true)
    try {
      if (editingKursus) {
        await api.put(`/api/kursus/${editingKursus.id}`, {
          namaKursus,
          kodKursus,
          deskripsi: kursusForm.deskripsi,
        })
        toast.success('Kursus berjaya dikemas kini.')
      } else {
        await api.post('/api/kursus', {
          namaKursus,
          kodKursus,
          deskripsi: kursusForm.deskripsi,
        })
        toast.success('Kursus baharu berjaya ditambah.')
      }
      setKursusDialogOpen(false)
      refresh()
      // If editing the open detail kursus, refresh detail too
      if (detailKursus && editingKursus?.id === detailKursus.id) {
        setDetailKursus((prev) =>
          prev
            ? {
                ...prev,
                namaKursus,
                kodKursus,
                deskripsi: kursusForm.deskripsi,
              }
            : prev,
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ralat tidak diketahui.')
    } finally {
      setSavingKursus(false)
    }
  }

  async function openDetail(k: Kursus) {
    setDetailKursus(k)
    setDetailOpen(true)
    setDetailLoading(true)
    setEditingKumpulanId(null)
    setKumpulanForm(EMPTY_KUMPULAN_FORM)
    try {
      const res = await api.get<{ kursus: Kursus }>(`/api/kursus/${k.id}`)
      setDetailKursus(res.kursus)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuatkan kursus.')
    } finally {
      setDetailLoading(false)
    }
  }

  function startAddKumpulan() {
    setEditingKumpulanId(null)
    setKumpulanForm(EMPTY_KUMPULAN_FORM)
  }

  function startEditKumpulan(k: KumpulanSemester) {
    setEditingKumpulanId(k.id)
    setKumpulanForm({
      semesterNo: String(k.semesterNo),
      bilPelajar: String(k.bilPelajar),
      status: k.status,
      kohortNama: k.kohortNama,
    })
  }

  async function handleSaveKumpulan() {
    if (!detailKursus) return
    const semesterNo = Number(kumpulanForm.semesterNo)
    const bilPelajar = Number(kumpulanForm.bilPelajar)
    const kohortNama = kumpulanForm.kohortNama.trim()
    if (!semesterNo || !kohortNama) {
      toast.error('Semester dan kohort diperlukan.')
      return
    }
    if (semesterNo < 1 || semesterNo > 4) {
      toast.error('Semester mesti antara 1-4.')
      return
    }
    setSavingKumpulan(true)
    try {
      if (editingKumpulanId) {
        await api.put(`/api/kumpulan/${editingKumpulanId}`, {
          semesterNo,
          bilPelajar,
          status: kumpulanForm.status,
          kohortNama,
        })
        toast.success('Kumpulan berjaya dikemas kini.')
      } else {
        await api.post('/api/kumpulan', {
          kursusId: detailKursus.id,
          semesterNo,
          bilPelajar,
          status: kumpulanForm.status,
          kohortNama,
        })
        toast.success('Kumpulan semester baharu berjaya ditambah.')
      }
      setEditingKumpulanId(null)
      setKumpulanForm(EMPTY_KUMPULAN_FORM)
      // Refresh detail
      const res = await api.get<{ kursus: Kursus }>(
        `/api/kursus/${detailKursus.id}`,
      )
      setDetailKursus(res.kursus)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ralat tidak diketahui.')
    } finally {
      setSavingKumpulan(false)
    }
  }

  async function handleDeleteKursus() {
    if (!deleteKursusTarget) return
    setDeletingKursus(true)
    try {
      await api.del(`/api/kursus/${deleteKursusTarget.id}`)
      toast.success('Kursus berjaya dipadam.')
      setDeleteKursusTarget(null)
      if (detailOpen && detailKursus?.id === deleteKursusTarget.id) {
        setDetailOpen(false)
        setDetailKursus(null)
      }
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ralat tidak diketahui.')
    } finally {
      setDeletingKursus(false)
    }
  }

  async function handleDeleteKumpulan() {
    if (!deleteKumpulanTarget || !detailKursus) return
    setDeletingKumpulan(true)
    try {
      await api.del(`/api/kumpulan/${deleteKumpulanTarget.id}`)
      toast.success('Kumpulan berjaya dipadam.')
      setDeleteKumpulanTarget(null)
      const res = await api.get<{ kursus: Kursus }>(
        `/api/kursus/${detailKursus.id}`,
      )
      setDetailKursus(res.kursus)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ralat tidak diketahui.')
    } finally {
      setDeletingKumpulan(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengurusan Kursus"
        description="Daftar kursus dan kumpulan semester untuk setiap kohort pelajar."
        icon={BookOpen}
        actions={
          canManage ? (
            <Button onClick={openCreateKursus} className="bg-primary">
              <Plus className="h-4 w-4" /> Tambah Kursus
            </Button>
          ) : null
        }
      />

      {loading ? (
        <CardSkeletons count={3} />
      ) : kursusList.length === 0 ? (
        <EmptyState
          title="Tiada kursus dijumpai"
          description={
            isKetuaKursus
              ? 'Kursus yang anda urus belum didaftarkan. Sila hubungi Unit Akademik.'
              : 'Tambah kursus baharu untuk mula mendaftar kumpulan pelajar.'
          }
          icon={BookOpen}
          action={
            canManage && !isKetuaKursus ? (
              <Button onClick={openCreateKursus} className="bg-primary">
                <Plus className="h-4 w-4" /> Tambah Kursus
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Jumlah Kursus"
              value={totalKursus}
              icon={BookOpen}
            />
            <StatCard
              label="Kumpulan Semester"
              value={totalKumpulan}
              icon={Layers}
              variant="success"
            />
            <StatCard
              label="Pensyarah Aktif"
              value={totalPensyarah}
              icon={Users}
              variant="warning"
            />
            <StatCard
              label="Modul Daftar"
              value={kursusList.reduce(
                (sum, k) =>
                  sum +
                  (k.kumpulan?.reduce(
                    (s, kp) => s + (kp._count?.modul ?? 0),
                    0,
                  ) ?? 0),
                0,
              )}
              icon={GraduationCap}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kursusList.map((k) => {
              const kumpulanCount =
                k.kumpulan?.length ?? k._count?.kumpulan ?? 0
              const modulCount =
                k.kumpulan?.reduce(
                  (s, kp) => s + (kp._count?.modul ?? 0),
                  0,
                ) ?? 0
              return (
                <Card
                  key={k.id}
                  className="glass-card border-0 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => openDetail(k)}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="info" className="font-mono">
                        {k.kodKursus}
                      </Badge>
                      {canManage && (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => openEditKursus(k)}
                            aria-label="Edit kursus"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteKursusTarget(k)}
                            aria-label="Padam kursus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-base leading-snug group-hover:text-primary transition-colors">
                        {k.namaKursus}
                      </p>
                      {k.deskripsi && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {k.deskripsi}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50">
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          Kumpulan
                        </p>
                        <p className="text-sm font-semibold flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5 text-primary" />
                          {kumpulanCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          Modul
                        </p>
                        <p className="text-sm font-semibold flex items-center gap-1">
                          <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          {modulCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          Pensyarah
                        </p>
                        <p className="text-sm font-semibold flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          {k._count?.pensyarahKursus ?? 0}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-primary"
                        onClick={() => openDetail(k)}
                      >
                        <Eye className="h-3.5 w-3.5" /> Lihat Butiran
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Create / Edit Kursus Dialog */}
      <Dialog open={kursusDialogOpen} onOpenChange={setKursusDialogOpen}>
        <DialogContent className="glass-strong border-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingKursus ? 'Edit Kursus' : 'Tambah Kursus Baharu'}
            </DialogTitle>
            <DialogDescription>
              {editingKursus
                ? 'Kemas kini maklumat kursus.'
                : 'Isi maklumat kursus baharu untuk didaftarkan.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="kodKursus">Kod Kursus</Label>
              <Input
                id="kodKursus"
                value={kursusForm.kodKursus}
                onChange={(e) =>
                  setKursusForm((s) => ({
                    ...s,
                    kodKursus: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="cth: DTE, DKT, DPE"
                className="font-mono"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="namaKursus">Nama Kursus</Label>
              <Input
                id="namaKursus"
                value={kursusForm.namaKursus}
                onChange={(e) =>
                  setKursusForm((s) => ({ ...s, namaKursus: e.target.value }))
                }
                placeholder="cth: Diploma Teknologi Elektronik"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deskripsi">Deskripsi (pilihan)</Label>
              <Textarea
                id="deskripsi"
                value={kursusForm.deskripsi}
                onChange={(e) =>
                  setKursusForm((s) => ({ ...s, deskripsi: e.target.value }))
                }
                placeholder="Penerangan ringkas kursus..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setKursusDialogOpen(false)}
              disabled={savingKursus}
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveKursus}
              disabled={savingKursus}
              className="bg-primary"
            >
              {savingKursus
                ? 'Menyimpan...'
                : editingKursus
                  ? 'Simpan'
                  : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="glass-strong border-0 sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailKursus && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3 pr-8">
                  <div className="min-w-0">
                    <Badge variant="info" className="font-mono mb-2">
                      {detailKursus.kodKursus}
                    </Badge>
                    <DialogTitle className="text-xl">
                      {detailKursus.namaKursus}
                    </DialogTitle>
                    {detailKursus.deskripsi && (
                      <DialogDescription className="mt-1">
                        {detailKursus.deskripsi}
                      </DialogDescription>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDetailOpen(false)
                          openEditKursus(detailKursus)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteKursusTarget(detailKursus)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Padam
                      </Button>
                    </div>
                  )}
                </div>
              </DialogHeader>

              {detailLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Memuatkan butiran...
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Kumpulan Section */}
                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        Kumpulan Semester
                      </h3>
                      {canManage && !editingKumpulanId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={startAddKumpulan}
                        >
                          <Plus className="h-3.5 w-3.5" /> Tambah Kumpulan
                        </Button>
                      )}
                    </div>

                    {/* Inline form for add/edit kumpulan */}
                    {canManage && editingKumpulanId !== null && (
                      <Card className="glass-card border-0">
                        <CardContent className="p-4 space-y-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            {editingKumpulanId === ''
                              ? 'Tambah kumpulan semester baharu'
                              : 'Edit kumpulan semester'}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Semester</Label>
                              <Select
                                value={kumpulanForm.semesterNo}
                                onValueChange={(v) =>
                                  setKumpulanForm((s) => ({
                                    ...s,
                                    semesterNo: v,
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Sem 1</SelectItem>
                                  <SelectItem value="2">Sem 2</SelectItem>
                                  <SelectItem value="3">Sem 3</SelectItem>
                                  <SelectItem value="4">Sem 4</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Bil. Pelajar</Label>
                              <Input
                                type="number"
                                min={1}
                                value={kumpulanForm.bilPelajar}
                                onChange={(e) =>
                                  setKumpulanForm((s) => ({
                                    ...s,
                                    bilPelajar: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-1 col-span-2">
                              <Label className="text-xs">Kohort</Label>
                              <Input
                                value={kumpulanForm.kohortNama}
                                onChange={(e) =>
                                  setKumpulanForm((s) => ({
                                    ...s,
                                    kohortNama: e.target.value,
                                  }))
                                }
                                placeholder="cth: 2024/2025"
                                autoComplete="off"
                              />
                            </div>
                            <div className="space-y-1 col-span-2 sm:col-span-2">
                              <Label className="text-xs">Status</Label>
                              <Select
                                value={kumpulanForm.status}
                                onValueChange={(v) =>
                                  setKumpulanForm((s) => ({
                                    ...s,
                                    status: v as KumpulanStatus,
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="BELAJAR">
                                    Belajar
                                  </SelectItem>
                                  <SelectItem value="LATIHAN_INDUSTRI">
                                    Latihan Industri
                                  </SelectItem>
                                  <SelectItem value="TAMAT">Tamat</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingKumpulanId(null)
                                setKumpulanForm(EMPTY_KUMPULAN_FORM)
                              }}
                              disabled={savingKumpulan}
                            >
                              Batal
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSaveKumpulan}
                              disabled={savingKumpulan}
                              className="bg-primary"
                            >
                              {savingKumpulan ? 'Menyimpan...' : 'Simpan'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {detailKursus.kumpulan &&
                    detailKursus.kumpulan.length > 0 ? (
                      <div className="rounded-lg border border-border/60 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-xs">
                              <tr>
                                <th className="text-left p-2 font-medium">
                                  Kohort
                                </th>
                                <th className="text-left p-2 font-medium">
                                  Semester
                                </th>
                                <th className="text-left p-2 font-medium">
                                  Pelajar
                                </th>
                                <th className="text-left p-2 font-medium">
                                  Modul
                                </th>
                                <th className="text-left p-2 font-medium">
                                  Status
                                </th>
                                {canManage && (
                                  <th className="text-right p-2 font-medium">
                                    Aksi
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {detailKursus.kumpulan.map((kp) => (
                                <tr
                                  key={kp.id}
                                  className="border-t border-border/40"
                                >
                                  <td className="p-2 font-medium">
                                    {kp.kohortNama}
                                  </td>
                                  <td className="p-2">Sem {kp.semesterNo}</td>
                                  <td className="p-2">{kp.bilPelajar}</td>
                                  <td className="p-2">
                                    {kp._count?.modul ?? 0}
                                  </td>
                                  <td className="p-2">
                                    <Badge variant={STATUS_BADGE[kp.status]}>
                                      {STATUS_LABEL[kp.status]}
                                    </Badge>
                                  </td>
                                  {canManage && (
                                    <td className="p-2 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7"
                                          onClick={() =>
                                            startEditKumpulan(kp)
                                          }
                                          aria-label="Edit kumpulan"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                          onClick={() =>
                                            setDeleteKumpulanTarget(kp)
                                          }
                                          aria-label="Padam kumpulan"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground rounded-lg border border-dashed border-border/60">
                        <CalendarClock className="h-5 w-5 mx-auto mb-2 opacity-50" />
                        Tiada kumpulan semester berdaftar.
                      </div>
                    )}
                  </section>

                  {/* Pensyarah Section */}
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Pensyarah Kursus
                    </h3>
                    {detailKursus.pensyarahKursus &&
                    detailKursus.pensyarahKursus.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {detailKursus.pensyarahKursus.map(
                          ({ pensyarah }: { pensyarah: Pensyarah }) => (
                            <Badge key={pensyarah.id} variant="default">
                              {pensyarah.nama}
                            </Badge>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Tiada pensyarah ditugaskan. Tugaskan pensyarah melalui
                        halaman Pengurusan Pensyarah.
                      </p>
                    )}
                  </section>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Kursus confirmation */}
      <AlertDialog
        open={!!deleteKursusTarget}
        onOpenChange={(open) => !open && setDeleteKursusTarget(null)}
      >
        <AlertDialogContent className="glass-strong border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Padam kursus ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan memadam kursus{' '}
              <span className="font-semibold text-foreground">
                {deleteKursusTarget?.namaKursus}
              </span>{' '}
              ({deleteKursusTarget?.kodKursus}). Semua kumpulan semester dan
              modul di bawah kursus ini juga akan terhapus. Tindakan ini tidak
              boleh diundur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingKursus}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKursus}
              disabled={deletingKursus}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingKursus ? 'Memadam...' : 'Padam Kursus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Kumpulan confirmation */}
      <AlertDialog
        open={!!deleteKumpulanTarget}
        onOpenChange={(open) => !open && setDeleteKumpulanTarget(null)}
      >
        <AlertDialogContent className="glass-strong border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Padam kumpulan semester ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan memadam kumpulan{' '}
              <span className="font-semibold text-foreground">
                {deleteKumpulanTarget?.kohortNama}
              </span>{' '}
              (Semester {deleteKumpulanTarget?.semesterNo}). Modul dan slot
              jadual berkaitan juga akan terjejas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingKumpulan}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKumpulan}
              disabled={deletingKumpulan}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingKumpulan ? 'Memadam...' : 'Padam'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
