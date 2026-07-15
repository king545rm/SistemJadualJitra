'use client'

import * as React from 'react'
import {
  ScrollText,
  Filter,
  Loader2,
  Inbox,
  Eye,
  Shield,
  Activity,
} from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api-client'
import {
  ROLE_LABELS,
  type SessionUser,
  type AuditLogEntry,
  type Role,
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
import { ScrollArea } from '@/components/ui/scroll-area'

interface AuditResponse {
  logs: AuditLogEntry[]
  total: number
}

const ENTITY_OPTIONS = [
  'KURSUS',
  'PENSYARAH',
  'MODUL',
  'SLOT_JADUAL',
  'PERMOHONAN',
  'USER',
  'BILIK',
  'KUMPULAN',
] as const

const ACTION_OPTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'LOGIN_FAILED',
  'APPROVE',
  'REJECT',
  'GENERATE',
  'CLASH_DETECTED',
] as const

function actionVariant(a: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (a) {
    case 'CREATE':
    case 'APPROVE':
      return 'success'
    case 'UPDATE':
    case 'GENERATE':
      return 'info'
    case 'DELETE':
    case 'REJECT':
    case 'LOGIN_FAILED':
    case 'CLASH_DETECTED':
      return 'danger'
    case 'LOGIN':
    case 'LOGOUT':
      return 'default'
    default:
      return 'default'
  }
}

function formatTimestamp(iso: string) {
  try {
    return new Date(iso).toLocaleString('ms-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

function prettyJson(s?: string | null) {
  if (!s) return '(tiada data)'
  try {
    return JSON.stringify(JSON.parse(s), null, 2)
  } catch {
    return s
  }
}

export function AuditSection({ user }: { user: SessionUser }) {
  const [entity, setEntity] = React.useState<string>('all')
  const [action, setAction] = React.useState<string>('all')
  const [limit, setLimit] = React.useState<string>('100')
  const [selected, setSelected] = React.useState<AuditLogEntry | null>(null)

  const url = React.useMemo(() => {
    const params = new URLSearchParams()
    if (entity !== 'all') params.set('entity', entity)
    if (action !== 'all') params.set('action', action)
    params.set('limit', limit)
    return `/api/audit?${params.toString()}`
  }, [entity, action, limit])

  const { data, loading } = useApi<AuditResponse>(() => api.get(url), [url])

  const logs = data?.logs ?? []
  const total = data?.total ?? 0

  // Compute quick stats
  const stats = React.useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayCount = logs.filter((l) => new Date(l.timestamp) >= today).length
    const createCount = logs.filter((l) => l.action === 'CREATE').length
    const deleteCount = logs.filter((l) => l.action === 'DELETE').length
    return { today: todayCount, create: createCount, delete: deleteCount }
  }, [logs])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Log Audit Perubahan"
        description="Jejak governans — siapa, bila, apa perubahan."
        icon={ScrollText}
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jumlah Log" value={total} icon={ScrollText} />
        <StatCard label="Hari Ini" value={stats.today} icon={Activity} variant="info" />
        <StatCard label="Cipta" value={stats.create} icon={Eye} variant="success" />
        <StatCard label="Padam" value={stats.delete} icon={Shield} variant="danger" />
      </div>

      {/* Filters */}
      <GlassPanel>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Penapis</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="entity" className="text-xs">Entiti</Label>
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger id="entity" className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Entiti</SelectItem>
                  {ENTITY_OPTIONS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="action" className="text-xs">Aksi</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger id="action" className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Aksi</SelectItem>
                  {ACTION_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="limit" className="text-xs">Bilangan Maksimum</Label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger id="limit" className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 rekod</SelectItem>
                  <SelectItem value="100">100 rekod</SelectItem>
                  <SelectItem value="200">200 rekod</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </GlassPanel>

      {/* Logs table */}
      <GlassPanel>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Rekod Audit ({logs.length} dipaparkan)</p>
            <Badge variant="info">{total} jumlah</Badge>
          </div>

          {loading ? (
            <LoadingState label="Memuatkan log audit..." />
          ) : logs.length === 0 ? (
            <EmptyState
              title="Tiada log dijumpai"
              description="Tiada rekod audit untuk penapis ini."
              icon={Inbox}
            />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">Tarikh & Masa</TableHead>
                    <TableHead>Pengguna</TableHead>
                    <TableHead className="w-28">Aksi</TableHead>
                    <TableHead>Entiti</TableHead>
                    <TableHead className="w-32">ID Entiti</TableHead>
                    <TableHead className="w-32">IP</TableHead>
                    <TableHead className="w-16 text-right">Butiran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow
                      key={l.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setSelected(l)}
                    >
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {formatTimestamp(l.timestamp)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <p className="font-medium">{l.userName || '—'}</p>
                        {l.userRole && (
                          <Badge variant="default" className="mt-0.5 text-[10px]">
                            {ROLE_LABELS[l.userRole as Role] || l.userRole}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={actionVariant(l.action)}>{l.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{l.entity}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {l.entityId ? (
                          <span title={l.entityId}>
                            {l.entityId.slice(0, 8)}…
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {l.ipAddress || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelected(l)
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </GlassPanel>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="glass-strong border-0 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Butiran Log Audit</DialogTitle>
            <DialogDescription>
              {selected && formatTimestamp(selected.timestamp)}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground">Pengguna</p>
                  <p className="font-medium">{selected.userName || '—'}</p>
                  {selected.userRole && (
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[selected.userRole as Role] || selected.userRole}
                    </p>
                  )}
                </div>
                <div className="rounded-md bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground">Aksi</p>
                  <Badge variant={actionVariant(selected.action)}>{selected.action}</Badge>
                </div>
                <div className="rounded-md bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground">Entiti</p>
                  <p className="font-medium">{selected.entity}</p>
                </div>
                <div className="rounded-md bg-muted/40 p-2.5">
                  <p className="text-xs text-muted-foreground">ID Entiti</p>
                  <p className="font-mono text-xs break-all">{selected.entityId || '—'}</p>
                </div>
                <div className="rounded-md bg-muted/40 p-2.5 col-span-2">
                  <p className="text-xs text-muted-foreground">Alamat IP</p>
                  <p className="font-mono text-xs">{selected.ipAddress || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold mb-1">Data Sebelum (Before)</p>
                  <ScrollArea className="h-48 rounded-md border border-border/40 bg-muted/20">
                    <pre className="text-xs p-2 font-mono whitespace-pre-wrap break-all">
                      {prettyJson(selected.before)}
                    </pre>
                  </ScrollArea>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1">Data Selepas (After)</p>
                  <ScrollArea className="h-48 rounded-md border border-border/40 bg-muted/20">
                    <pre className="text-xs p-2 font-mono whitespace-pre-wrap break-all">
                      {prettyJson(selected.after)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
