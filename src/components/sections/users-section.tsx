'use client'

import * as React from 'react'
import {
  UserCog,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  Loader2,
  Inbox,
  ShieldCheck,
  Mail,
  KeyRound,
} from 'lucide-react'
import { toast } from 'sonner'

import { api, ApiError } from '@/lib/api-client'
import {
  ROLE_LABELS,
  type SessionUser,
  type Role,
  type Kursus,
  type Pensyarah,
} from '@/lib/types'

import {
  PageHeader,
  StatCard,
  LoadingState,
  EmptyState,
  Badge,
  GlassPanel,
  useApi,
} from '@/components/sections/shared'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

interface UserRow {
  id: string
  name: string
  email: string
  role: Role
  kursusId?: string | null
  pensyarahId?: string | null
  lastLoginAt?: string | null
  failedLoginAttempts: number
  lockedUntil?: string | null
  isDummy: boolean
  createdAt: string
  kursus?: Kursus | null
  pensyarah?: Pensyarah | null
}

interface UsersResponse {
  users: UserRow[]
}

const ROLE_OPTIONS: Role[] = [
  'TIMBALAN_PENGARAH',
  'HEA',
  'KETUA_KURSUS',
  'PENSYARAH',
  'IT',
]

interface UserFormState {
  name: string
  email: string
  role: Role
  kursusId: string
  pensyarahId: string
  password: string
  resetPassword: string
}

function isLocked(u: UserRow) {
  if (u.lockedUntil && new Date(u.lockedUntil) > new Date()) return true
  return u.failedLoginAttempts >= 5
}

function formatLastLogin(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ms-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function UsersSection({ user }: { user: SessionUser }) {
  const canManageUsers = ['TIMBALAN_PENGARAH', 'IT'].includes(user.role)

  const { data, loading, refresh } = useApi<UsersResponse>(() => api.get('/api/users'), [])
  const { data: kursusData } = useApi<{ kursus: Kursus[] }>(() => api.get('/api/kursus'), [])
  const { data: pensyarahData } = useApi<{ pensyarah: Pensyarah[] }>(
    () => api.get('/api/pensyarah'),
    [],
  )

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<UserRow | null>(null)
  const [form, setForm] = React.useState<UserFormState>({
    name: '',
    email: '',
    role: 'PENSYARAH',
    kursusId: '',
    pensyarahId: '',
    password: '',
    resetPassword: '',
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<UserRow | null>(null)

  function openAddDialog() {
    setEditing(null)
    setForm({
      name: '',
      email: '',
      role: 'PENSYARAH',
      kursusId: '',
      pensyarahId: '',
      password: '',
      resetPassword: '',
    })
    setDialogOpen(true)
  }

  function openEditDialog(u: UserRow) {
    setEditing(u)
    setForm({
      name: u.name,
      email: u.email,
      role: u.role,
      kursusId: u.kursusId ?? '',
      pensyarahId: u.pensyarahId ?? '',
      password: '',
      resetPassword: '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.name || !form.email || !form.role) {
      toast.error('Nama, emel dan peranan diperlukan.')
      return
    }
    if (!editing && !form.password) {
      toast.error('Kata laluan diperlukan untuk pengguna baharu.')
      return
    }
    setSubmitting(true)
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          role: form.role,
          kursusId: form.kursusId || null,
          pensyarahId: form.pensyarahId || null,
        }
        if (form.resetPassword) body.resetPassword = form.resetPassword
        await api.put(`/api/users/${editing.id}`, body)
        toast.success('Pengguna dikemas kini.')
      } else {
        await api.post('/api/users', {
          name: form.name,
          email: form.email,
          role: form.role,
          kursusId: form.kursusId || null,
          pensyarahId: form.pensyarahId || null,
          password: form.password,
        })
        toast.success('Pengguna baharu dicipta.')
      }
      setDialogOpen(false)
      refresh()
    } catch (e) {
      const err = e as ApiError
      toast.error(err?.message || 'Ralat menyimpan pengguna.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUnlock(u: UserRow) {
    try {
      await api.put(`/api/users/${u.id}`, { unlock: true })
      toast.success('Akaun dibuka kunci.')
      refresh()
    } catch (e) {
      toast.error((e as Error).message || 'Ralat membuka kunci akaun.')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.del(`/api/users/${deleteTarget.id}`)
      toast.success('Pengguna dipadam.')
      setDeleteTarget(null)
      refresh()
    } catch (e) {
      toast.error((e as Error).message || 'Ralat memadam pengguna.')
    }
  }

  if (!canManageUsers) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Pengurusan Pengguna"
          description="Urus akaun pengguna & kawalan akses (RBAC)."
          icon={UserCog}
        />
        <GlassPanel>
          <CardContent className="p-4">
            <EmptyState
              title="Akses Ditolak"
              description="Anda tidak mempunyai kebenaran untuk mengurus pengguna."
              icon={Lock}
            />
          </CardContent>
        </GlassPanel>
      </div>
    )
  }

  const users = data?.users ?? []
  const lockedCount = users.filter(isLocked).length
  const pensyarahCount = users.filter((u) => u.role === 'PENSYARAH').length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pengurusan Pengguna"
        description="Urus akaun pengguna & kawalan akses (RBAC)."
        icon={UserCog}
        actions={
          <Button onClick={openAddDialog} className="gap-1.5">
            <Plus className="h-4 w-4" /> Tambah Pengguna
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jumlah Pengguna" value={users.length} icon={UserCog} />
        <StatCard label="Pensyarah" value={pensyarahCount} icon={UserCog} variant="info" />
        <StatCard
          label="Akaun Dikunci"
          value={lockedCount}
          icon={Lock}
          variant={lockedCount > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Peranan"
          value={ROLE_OPTIONS.length}
          icon={ShieldCheck}
        />
      </div>

      {/* Table */}
      <GlassPanel>
        <CardContent className="p-4">
          {loading ? (
            <LoadingState label="Memuatkan pengguna..." />
          ) : users.length === 0 ? (
            <EmptyState
              title="Tiada pengguna"
              description="Belum ada akaun pengguna didaftarkan."
              icon={Inbox}
            />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Peranan</TableHead>
                    <TableHead>Kursus / Pensyarah</TableHead>
                    <TableHead>Log Masuk Terakhir</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const locked = isLocked(u)
                    const isSelf = u.id === user.id
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium flex items-center gap-1.5">
                                {u.name}
                                {isSelf && (
                                  <Badge variant="info" className="text-[10px]">Anda</Badge>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {u.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              u.role === 'IT' || u.role === 'TIMBALAN_PENGARAH'
                                ? 'info'
                                : 'default'
                            }
                          >
                            {ROLE_LABELS[u.role] || u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {u.role === 'KETUA_KURSUS' && u.kursus && (
                            <span>{u.kursus.kodKursus}</span>
                          )}
                          {u.role === 'PENSYARAH' && u.pensyarah && (
                            <span>{u.pensyarah.nama}</span>
                          )}
                          {!(
                            (u.role === 'KETUA_KURSUS' && u.kursus) ||
                            (u.role === 'PENSYARAH' && u.pensyarah)
                          ) && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatLastLogin(u.lastLoginAt)}
                        </TableCell>
                        <TableCell>
                          {locked ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant="danger">
                                <Lock className="h-3 w-3" /> Dikunci
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 w-fit"
                                onClick={() => handleUnlock(u)}
                              >
                                <Unlock className="h-3 w-3" /> Buka Kunci
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="success">
                              <ShieldCheck className="h-3 w-3" /> Aktif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => openEditDialog(u)}
                              aria-label="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {!isSelf && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                onClick={() => setDeleteTarget(u)}
                                aria-label="Padam"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </GlassPanel>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong border-0 sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Pengguna' : 'Tambah Pengguna Baharu'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Kemas kini butiran pengguna. Bidang kata laluan pilihan.'
                : 'Lengkapkan butiran akaun pengguna baharu.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div>
              <Label htmlFor="name">Nama Penuh</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="cth. Ahmad bin Ali"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Emel</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="nama@adtecjitra.gov.my"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="role">Peranan</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}
              >
                <SelectTrigger id="role" className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.role === 'KETUA_KURSUS' && (
              <div>
                <Label htmlFor="kursus">Kursus Diampu</Label>
                <Select
                  value={form.kursusId}
                  onValueChange={(v) => setForm((f) => ({ ...f, kursusId: v }))}
                >
                  <SelectTrigger id="kursus" className="w-full mt-1">
                    <SelectValue placeholder="— Pilih kursus —" />
                  </SelectTrigger>
                  <SelectContent>
                    {kursusData?.kursus.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.kodKursus} — {k.namaKursus}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.role === 'PENSYARAH' && (
              <div>
                <Label htmlFor="pensyarah">Profil Pensyarah</Label>
                <Select
                  value={form.pensyarahId}
                  onValueChange={(v) => setForm((f) => ({ ...f, pensyarahId: v }))}
                >
                  <SelectTrigger id="pensyarah" className="w-full mt-1">
                    <SelectValue placeholder="— Pilih pensyarah —" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {pensyarahData?.pensyarah.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!editing && (
              <div>
                <Label htmlFor="password">Kata Laluan</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <KeyRound className="h-3 w-3" />
                  Minimum 8 aksara, mengandungi huruf besar, huruf kecil, nombor dan aksara khas.
                </p>
              </div>
            )}

            {editing && (
              <div>
                <Label htmlFor="resetPassword">Reset Kata Laluan (pilihan)</Label>
                <Input
                  id="resetPassword"
                  type="password"
                  value={form.resetPassword}
                  onChange={(e) => setForm((f) => ({ ...f, resetPassword: e.target.value }))}
                  placeholder="Biarkan kosong jika tidak diubah"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <KeyRound className="h-3 w-3" />
                  Minimum 8 aksara, mengandungi huruf besar, huruf kecil, nombor dan aksara khas.
                </p>
              </div>
            )}

            {editing && isLocked(editing) && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-amber-800 dark:text-amber-200">
                  Akaun ini sedang dikunci. Simpan dengan kata laluan baharu untuk membuka kunci,
                  atau gunakan butang "Buka Kunci" di senarai.
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Simpan' : 'Cipta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="glass-strong border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Padam pengguna ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak boleh diundur. Akaun{' '}
              <span className="font-medium">{deleteTarget?.name}</span> ({deleteTarget?.email})
              akan dipadam secara kekal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Padam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
