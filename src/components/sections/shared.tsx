'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Inbox } from 'lucide-react'
import type { SectionId } from '@/components/app-shell'

export function PageHeader({ title, description, icon: Icon, actions }: {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div className="flex items-start gap-3">
        {Icon && <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="h-5 w-5" /></div>}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, icon: Icon, trend, variant = 'default' }: {
  label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>; trend?: string; variant?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const variantClass = variant === 'success' ? 'text-emerald-600 dark:text-emerald-400' : variant === 'warning' ? 'text-amber-600 dark:text-amber-400' : variant === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-primary'
  return (
    <Card className="glass-card border-0 overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
            {trend && <p className={cn('text-xs mt-1 font-medium', variantClass)}>{trend}</p>}
          </div>
          <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/10', variantClass)}><Icon className="h-5 w-5" /></div>
        </div>
      </CardContent>
    </Card>
  )
}

export function LoadingState({ label = 'Memuatkan...' }: { label?: string }) {
  return <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />{label}</div>
}

export function CardSkeletons({ count = 3 }: { count?: number }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: count }).map((_, i) => (<Card key={i} className="glass-card border-0"><CardContent className="p-4 space-y-3"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-3 w-1/2" /></CardContent></Card>))}</div>
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: { title: string; description?: string; icon?: React.ComponentType<{ className?: string }>; action?: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center py-12 text-center"><div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3"><Icon className="h-6 w-6 text-muted-foreground" /></div><p className="font-medium">{title}</p>{description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}{action && <div className="mt-4">{action}</div>}</div>
}

export function Badge({ children, variant = 'default', className }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'; className?: string }) {
  const variantClass = variant === 'success' ? 'status-ok' : variant === 'warning' ? 'status-warn' : variant === 'danger' ? 'status-danger' : variant === 'info' ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-muted text-muted-foreground border border-border'
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', variantClass, className)}>{children}</span>
}

export function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Card className={cn('glass-card border-0', className)}>{children}</Card>
}

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const refresh = React.useCallback(() => setRefreshKey((k) => k + 1), [])
  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetcher().then((d) => { if (!cancelled) { setData(d); setError(null) } }).catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Ralat tidak diketahui.') }).finally(() => { if (!cancelled) setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey])
  return { data, loading, error, refresh, setData }
}

// Shared section props
export interface SectionProps {
  user: import('@/lib/types').SessionUser
  onNavigate: (section: SectionId) => void
}
