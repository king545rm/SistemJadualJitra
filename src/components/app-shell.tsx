'use client'

import * as React from 'react'
import type { SessionUser, Role } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'
import { api } from '@/lib/api-client'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard, ClipboardList, ListOrdered, UtensilsCrossed, BarChart3, Users,
  ScrollText, UserCog, LogOut, Menu, Moon, Sun, Flame, ShieldAlert, Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export type SectionId = 'dashboard' | 'ambil' | 'papan' | 'menu' | 'laporan' | 'pelanggan' | 'resit' | 'audit' | 'users'

interface NavItem {
  id: SectionId
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Papan Pemuka', icon: LayoutDashboard, roles: ['PEMILIK', 'KAUNTER', 'DAPUR'] },
  { id: 'ambil', label: 'Ambil Pesanan', icon: ClipboardList, roles: ['PEMILIK', 'KAUNTER'] },
  { id: 'papan', label: 'Papan Status', icon: ListOrdered, roles: ['PEMILIK', 'KAUNTER', 'DAPUR'] },
  { id: 'menu', label: 'Menu & Harga', icon: UtensilsCrossed, roles: ['PEMILIK', 'KAUNTER', 'DAPUR'] },
  { id: 'laporan', label: 'Laporan Jualan', icon: BarChart3, roles: ['PEMILIK'] },
  { id: 'pelanggan', label: 'Pelanggan', icon: Users, roles: ['PEMILIK', 'KAUNTER'] },
  { id: 'resit', label: 'Resit', icon: Receipt, roles: ['PEMILIK', 'KAUNTER'] },
  { id: 'audit', label: 'Log Audit', icon: ScrollText, roles: ['PEMILIK'] },
  { id: 'users', label: 'Pengguna', icon: UserCog, roles: ['PEMILIK'] },
]

interface AppShellProps {
  user: SessionUser
  onLogout: () => void
}

export function AppShell({ user, onLogout }: AppShellProps) {
  const [active, setActive] = React.useState<SectionId>('dashboard')
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const visibleNav = NAV_ITEMS.filter((n) => n.roles.includes(user.role))

  async function handleLogout() {
    try {
      await api.post('/api/auth/logout')
      toast.success('Anda telah log keluar.')
      onLogout()
    } catch { onLogout() }
  }

  const initials = user.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()

  // Lazy-load sections
  const Section = React.useMemo(() => {
    const props = { user, onNavigate: setActive }
    switch (active) {
      case 'dashboard': return <LazyDashboard {...props} />
      case 'ambil': return <LazyAmbil {...props} />
      case 'papan': return <LazyPapan {...props} />
      case 'menu': return <LazyMenu {...props} />
      case 'laporan': return <LazyLaporan {...props} />
      case 'pelanggan': return <LazyPelanggan {...props} />
      case 'resit': return <LazyResit {...props} />
      case 'audit': return <LazyAudit {...props} />
      case 'users': return <LazyUsers {...props} />
      default: return null
    }
  }, [active, user])

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border/60">
        <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md shrink-0">
          <Flame className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-base gradient-text leading-tight">CAOMS</p>
          <p className="text-[11px] text-muted-foreground leading-tight">CKT Adik</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3 space-y-0.5">
        {visibleNav.map((item) => (
          <button key={item.id} onClick={() => { setActive(item.id); setMobileOpen(false) }}
            className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              active === item.id ? 'bg-primary text-primary-foreground shadow-md' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')}>
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-sidebar-border/60">
        <div className="glass rounded-lg p-2.5 text-[11px] text-muted-foreground">
          <p className="font-semibold text-foreground mb-0.5 flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-primary" /> Anti-Tercicir
          </p>
          <p>Amaran auto 20 min · RBAC aktif</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 glass-strong border-b border-border/40">
        <div className="flex items-center gap-3 px-4 h-16">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" /><span className="sr-only">Buka menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 glass-sidebar">{SidebarContent}</SheetContent>
          </Sheet>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base sm:text-lg truncate">{NAV_ITEMS.find((n) => n.id === active)?.label}</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">{ROLE_LABELS[user.role]}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Tukar tema">
            {mounted && theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2 h-10">
                <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback></Avatar>
                <div className="text-left hidden sm:block leading-tight">
                  <p className="text-sm font-medium max-w-[140px] truncate">{user.name}</p>
                  <p className="text-[11px] text-muted-foreground">{ROLE_LABELS[user.role]}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground font-normal truncate">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Log Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="hidden lg:flex w-64 shrink-0 glass-sidebar flex-col">{SidebarContent}</aside>
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
            <React.Suspense fallback={<div className="flex items-center justify-center py-12 text-muted-foreground">Memuatkan...</div>}>
              {Section}
            </React.Suspense>
          </div>
        </main>
      </div>

      <footer className="mt-auto glass-strong border-t border-border/40">
        <div className="px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p><span className="font-semibold text-foreground">CAOMS</span> · CKT Adik Order Management System · © {new Date().getFullYear()} CKT Adik</p>
          <p className="flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5 text-primary" /> Tiada pesanan tercicir</p>
        </div>
      </footer>
    </div>
  )
}

// Lazy-loaded section components
const LazyDashboard = React.lazy(() => import('@/components/sections/dashboard-section').then(m => ({ default: m.DashboardSection })))
const LazyAmbil = React.lazy(() => import('@/components/sections/ambil-section').then(m => ({ default: m.AmbilSection })))
const LazyPapan = React.lazy(() => import('@/components/sections/papan-section').then(m => ({ default: m.PapanSection })))
const LazyMenu = React.lazy(() => import('@/components/sections/menu-section').then(m => ({ default: m.MenuSection })))
const LazyLaporan = React.lazy(() => import('@/components/sections/laporan-section').then(m => ({ default: m.LaporanSection })))
const LazyPelanggan = React.lazy(() => import('@/components/sections/pelanggan-section').then(m => ({ default: m.PelangganSection })))
const LazyResit = React.lazy(() => import('@/components/sections/resit-section').then(m => ({ default: m.ResitSection })))
const LazyAudit = React.lazy(() => import('@/components/sections/audit-section').then(m => ({ default: m.AuditSection })))
const LazyUsers = React.lazy(() => import('@/components/sections/users-section').then(m => ({ default: m.UsersSection })))
