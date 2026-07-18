'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import type { Role } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'
import {
  UserCog, Plus, Pencil, Trash2, Loader2, Lock, ShieldAlert, Mail,
  Unlock, KeyRound, Inbox, ShieldCheck,
} from 'lucide-react'
import {
  PageHeader, StatCard, LoadingState, EmptyState, Badge, GlassPanel,
  useApi, type SectionProps,
} from '@/components/sections/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface UserRow {
  id: string
  name: string
  email: string
  role: Role
  isDummy: boolean
  failedLoginAttempts: number
  lockedUntil: string | null
  lastLoginAt: string | null
  createdAt: string
}

const ROLES: Role[] = ['PEMILIK', 'KAUNTER', 'DAPUR']

const PASSWORD_HINT = 'Minimum 8 aksara, huruf besar/kecil, nombor & aksara khas.'

function roleVariant(role: Role): 'info' | 'success' | 'warning' {
  switch (role) {
    case 'PEMILIK': return 'warning'
    case 'KAUNTER': return 'info'
    case 'DAPUR': return 'success'
  }
}

function formatTarikh(d: string | null) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('ms-MY', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return d }
}

function isLocked(lockedUntil: string | null) {
  if (!lockedUntil) return false
  return new Date(lockedUntil).getTime() > Date.now()
}

interface UserFormState {
  name: string
  email: string
  role: Role
  password: string
  resetPassword: string
}

const emptyForm: UserFormState = {
  name: '', email: '', role: 'KAUNTER', password: '', resetPassword: '',
}

export function UsersSection({ user }: SectionProps) {
  const canManage = user.role === 'PEMILIK'
  const { data, loading, error, refresh } = useApi<{ users: UserRow[] }>(() => api.get('/api/users'), [])
  const [addOpen, setAddOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<UserRow | null>(null)
  const [form, setForm] = React.useState<UserFormState>(emptyForm)
  const [submitting, setSubmitting] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<UserRow | null>(null)

  const users = data?.users ?? []
  const lockedCount = users.filter((u) => isLocked(u.lockedUntil)).length

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm)
    setAddOpen(true)
  }

  function openEdit(u: UserRow) {
    setEditTarget(u)
    setForm({ ...emptyForm, name: u.name, email: u.email, role: u.role })
    setAddOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Nama dan emel diperlukan.')
      return
    }
    setSubmitting(true)
    try {
      if (editTarget) {
        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
        }
        if (form.resetPassword) {
          payload.resetPassword = form.resetPassword
        }
        await api.put(`/api/users/${editTarget.id}`, payload)
        toast.success('Pengguna berjaya dikemas kini.')
      } else {
        if (!form.password) {
          toast.error('Kata laluan diperlukan untuk pengguna baharu.')
          setSubmitting(false)
          return
        }
        await api.post('/api/users', {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          password: form.password,
        })
        toast.success('Pengguna baharu berjaya ditambah.')
      }
      setAddOpen(false)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ralat menyimpan pengguna.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUnlock(u: UserRow) {
    setSubmitting(true)
    try {
      await api.put(`/api/users/${u.id}`, { unlock: true })
      toast.success('Akaun berjaya dibuka kuncinya.')
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ralat membuka kunci.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    if (deleteTarget.id === user.id) {
      toast.error('Tidak boleh memadam akaun sendiri.')
      setDeleteTarget(null)
      return
    }
    setSubmitting(true)
    try {
      await api.del(`/api/users/${deleteTarget.id}`)
      toast.success('Pengguna berjaya dipadam.')
      setDeleteTarget(null)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ralat memadam pengguna.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!canManage) {
    return (
      <EmptyState
        title="Akses Ditolak"
        description="Anda tidak mempunyai kebenaran untuk mengurus pengguna."
        icon={Lock}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Pengurusan Pengguna"
        description="Urus akaun pengguna & kawalan akses (RBAC)"
        icon={UserCog}
        actions={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Tambah Pengguna
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <StatCard label="Jumlah Pengguna" value={users.length} icon={UserCog} />
        <StatCard label="Pemilik" value={users.filter((u) => u.role === 'PEMILIK').length} icon={ShieldCheck} variant="warning" />
        <StatCard label="Akaun Terkunci" value={lockedCount} icon={Lock} variant={lockedCount > 0 ? 'danger' : 'default'} />
      </div>

      {error ? (
        <EmptyState
          title="Ralat memuatkan pengguna"
          description={error}
          icon={ShieldAlert}
          action={<Button variant="outline" onClick={refresh}>Cuba Lagi</Button>}
        />
      ) : loading ? (
        <LoadingState label="Memuatkan pengguna..." />
      ) : users.length === 0 ? (
        <EmptyState title="Tiada pengguna" icon={Inbox} />
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
                        <TableHead>Emel</TableHead>
                        <TableHead>Peranan</TableHead>
                        <TableHead>Log Masuk Terakhir</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => {
                        const locked = isLocked(u.lockedUntil)
                        return (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{u.name}</span>
                                {u.id === user.id && <Badge variant="info">Anda</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" /> {u.email}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={roleVariant(u.role)}>
                                {ROLE_LABELS[u.role]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatTarikh(u.lastLoginAt)}
                            </TableCell>
                            <TableCell>
                              {locked ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="danger">
                                    <Lock className="h-3 w-3" /> Terkunci
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1 text-xs"
                                    onClick={() => handleUnlock(u)}
                                    disabled={submitting}
                                  >
                                    <Unlock className="h-3 w-3" /> Buka
                                  </Button>
                                </div>
                              ) : (
                                <Badge variant="success">Aktif</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => openEdit(u)}
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTarget(u)}
                                  disabled={u.id === user.id}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </GlassPanel>
          </div>

          {/* Mobile: Cards */}
          <div className="md:hidden grid gap-3">
            {users.map((u) => {
              const locked = isLocked(u.lockedUntil)
              return (
                <Card key={u.id} className="glass-card border-0">
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{u.name}</h3>
                          {u.id === user.id && <Badge variant="info">Anda</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <Badge variant={roleVariant(u.role)}>{ROLE_LABELS[u.role]}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Log masuk: {formatTarikh(u.lastLoginAt)}
                      </span>
                      {locked ? (
                        <Badge variant="danger"><Lock className="h-3 w-3" /> Terkunci</Badge>
                      ) : (
                        <Badge variant="success">Aktif</Badge>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1 border-t border-border/40">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      {locked && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleUnlock(u)}
                          disabled={submitting}
                        >
                          <Unlock className="h-3.5 w-3.5" /> Buka
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(u)}
                        disabled={u.id === user.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong border-0 max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Pengguna' : 'Tambah Pengguna Baharu'}</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Kemas kini butiran pengguna.' : 'Cipta akaun pengguna baharu.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Nama</Label>
              <Input
                id="u-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="cth. Siti Aminah"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-email">Emel</Label>
              <Input
                id="u-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="siti@cktadik.my"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-role">Peranan</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}
              >
                <SelectTrigger id="u-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Pemilik: akses penuh · Kaunter: pesanan & pelanggan · Dapur: status masakan
              </p>
            </div>

            {editTarget ? (
              <div className="space-y-1.5">
                <Label htmlFor="u-reset" className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" /> Reset Kata Laluan (pilihan)
                </Label>
                <Input
                  id="u-reset"
                  type="password"
                  value={form.resetPassword}
                  onChange={(e) => setForm((f) => ({ ...f, resetPassword: e.target.value }))}
                  placeholder="Kosongkan jika tidak diubah"
                />
                <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="u-password">Kata Laluan</Label>
                <Input
                  id="u-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                />
                <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={submitting}>
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
            <AlertDialogTitle>Padam Pengguna?</AlertDialogTitle>
            <AlertDialogDescription>
              Akaun <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}) akan dipadam
              secara kekal. Tindakan ini tidak boleh diundur.
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
