'use client'

import * as React from 'react'
import { api } from '@/lib/api-client'
import type { AuditLogEntry, Role } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'
import {
  ScrollText, Filter, Inbox, Lock, ShieldAlert, X, User as UserIcon,
} from 'lucide-react'
import {
  PageHeader, LoadingState, EmptyState, Badge, GlassPanel, useApi,
  type SectionProps,
} from '@/components/sections/shared'
import { Button } from '@/components/ui/button'
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
import { ScrollArea } from '@/components/ui/scroll-area'

const ENTITY_OPTIONS = [
  { value: 'PESANAN', label: 'Pesanan' },
  { value: 'MENU', label: 'Menu' },
  { value: 'PELANGGAN', label: 'Pelanggan' },
  { value: 'USER', label: 'Pengguna' },
]

const ACTION_OPTIONS = [
  { value: 'CREATE', label: 'Cipta' },
  { value: 'UPDATE', label: 'Kemas Kini' },
  { value: 'DELETE', label: 'Padam' },
  { value: 'STATUS_UPDATE', label: 'Kemas Kini Status' },
  { value: 'CANCEL', label: 'Batal' },
  { value: 'LOGIN', label: 'Log Masuk' },
  { value: 'LOGOUT', label: 'Log Keluar' },
  { value: 'LOGIN_FAILED', label: 'Log Masuk Gagal' },
]

function actionVariant(action: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  switch (action) {
    case 'CREATE': return 'success'
    case 'UPDATE': case 'STATUS_UPDATE': return 'info'
    case 'DELETE': case 'CANCEL': return 'danger'
    case 'LOGIN': case 'LOGOUT': return 'default'
    case 'LOGIN_FAILED': return 'warning'
    default: return 'default'
  }
}

function entityLabel(entity: string): string {
  return ENTITY_OPTIONS.find((e) => e.value === entity)?.label ?? entity
}

function actionLabel(action: string): string {
  return ACTION_OPTIONS.find((a) => a.value === action)?.label ?? action
}

function formatTimestamp(ts: string) {
  try {
    return new Date(ts).toLocaleString('ms-MY', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return ts }
}

function prettyJson(s?: string | null): string {
  if (!s) return '—'
  try {
    return JSON.stringify(JSON.parse(s), null, 2)
  } catch {
    return s
  }
}

export function AuditSection({ user }: SectionProps) {
  const canView = user.role === 'PEMILIK'
  const [entity, setEntity] = React.useState<string>('SEMUA')
  const [action, setAction] = React.useState<string>('SEMUA')
  const [limit, setLimit] = React.useState<string>('100')
  const [selectedLog, setSelectedLog] = React.useState<AuditLogEntry | null>(null)

  const query = React.useMemo(() => {
    const params = new URLSearchParams()
    if (entity !== 'SEMUA') params.set('entity', entity)
    if (action !== 'SEMUA') params.set('action', action)
    params.set('limit', limit)
    return params.toString()
  }, [entity, action, limit])

  const { data, loading, error, refresh } = useApi<{ logs: AuditLogEntry[]; total: number }>(
    () => api.get(`/api/audit?${query}`),
    [query],
  )

  if (!canView) {
    return (
      <EmptyState
        title="Akses Ditolak"
        description="Anda tidak mempunyai kebenaran untuk melihat log audit."
        icon={Lock}
      />
    )
  }

  const logs = data?.logs ?? []
  const total = data?.total ?? 0

  return (
    <div>
      <PageHeader
        title="Log Audit"
        description="Jejak semua perubahan untuk governans"
        icon={ScrollText}
        actions={
          <Button variant="outline" onClick={refresh} className="gap-2">
            <Filter className="h-4 w-4" /> Muat Semula
          </Button>
        }
      />

      {/* Filters */}
      <GlassPanel className="mb-5">
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Entiti</label>
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMUA">Semua Entiti</SelectItem>
                  {ENTITY_OPTIONS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Aksi</label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMUA">Semua Aksi</SelectItem>
                  {ACTION_OPTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Bilangan Catatan</label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 terkini</SelectItem>
                  <SelectItem value="100">100 terkini</SelectItem>
                  <SelectItem value="250">250 terkini</SelectItem>
                  <SelectItem value="500">500 terkini</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Menunjukkan {logs.length} dari {total} jumlah log audit.
          </p>
        </CardContent>
      </GlassPanel>

      {error ? (
        <EmptyState
          title="Ralat memuatkan log audit"
          description={error}
          icon={ShieldAlert}
          action={<Button variant="outline" onClick={refresh}>Cuba Lagi</Button>}
        />
      ) : loading ? (
        <LoadingState label="Memuatkan log audit..." />
      ) : logs.length === 0 ? (
        <EmptyState
          title="Tiada log audit dijumpai"
          description="Cuba penapis lain atau tiada aktiviti direkodkan."
          icon={Inbox}
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
                        <TableHead>Tarikh & Masa</TableHead>
                        <TableHead>Pengguna</TableHead>
                        <TableHead>Aksi</TableHead>
                        <TableHead>Entiti</TableHead>
                        <TableHead>IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className="cursor-pointer hover:bg-primary/5"
                        >
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatTimestamp(log.timestamp)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <UserIcon className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{log.userName}</p>
                                {log.userRole && (
                                  <p className="text-xs text-muted-foreground">
                                    {ROLE_LABELS[log.userRole as Role] ?? log.userRole}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={actionVariant(log.action)}>
                              {actionLabel(log.action)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{entityLabel(log.entity)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {log.ipAddress ?? '—'}
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
            {logs.map((log) => (
              <Card
                key={log.id}
                className="glass-card border-0 cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => setSelectedLog(log)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{log.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.userRole ? (ROLE_LABELS[log.userRole as Role] ?? log.userRole) : ''}
                      </p>
                    </div>
                    <Badge variant={actionVariant(log.action)}>{actionLabel(log.action)}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{entityLabel(log.entity)}</span>
                    <span>{formatTimestamp(log.timestamp)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <DialogContent className="glass-strong border-0 max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" /> Butiran Log Audit
            </DialogTitle>
            <DialogDescription>
              {selectedLog && formatTimestamp(selectedLog.timestamp)}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <ScrollArea className="max-h-[65vh] pr-3">
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/60 p-3 bg-muted/20">
                    <p className="text-xs text-muted-foreground">Pengguna</p>
                    <p className="font-semibold">{selectedLog.userName}</p>
                    {selectedLog.userRole && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ROLE_LABELS[selectedLog.userRole as Role] ?? selectedLog.userRole}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border/60 p-3 bg-muted/20">
                    <p className="text-xs text-muted-foreground">Aksi</p>
                    <Badge variant={actionVariant(selectedLog.action)}>
                      {actionLabel(selectedLog.action)}
                    </Badge>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3 bg-muted/20">
                    <p className="text-xs text-muted-foreground">Entiti</p>
                    <p className="font-semibold">{entityLabel(selectedLog.entity)}</p>
                    {selectedLog.entityId && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        ID: {selectedLog.entityId}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border/60 p-3 bg-muted/20">
                    <p className="text-xs text-muted-foreground">Alamat IP</p>
                    <p className="font-mono text-sm">{selectedLog.ipAddress ?? '—'}</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">SEBELUM (Before)</p>
                    <pre className="text-xs bg-muted/40 border border-border/60 rounded-lg p-3 overflow-x-auto max-h-60 overflow-y-auto scrollbar-thin font-mono whitespace-pre-wrap break-words">
                      {prettyJson(selectedLog.before)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">SELEPAS (After)</p>
                    <pre className="text-xs bg-muted/40 border border-border/60 rounded-lg p-3 overflow-x-auto max-h-60 overflow-y-auto scrollbar-thin font-mono whitespace-pre-wrap break-words">
                      {prettyJson(selectedLog.after)}
                    </pre>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLog(null)} className="gap-1.5">
              <X className="h-4 w-4" /> Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
