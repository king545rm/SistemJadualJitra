'use client'

import * as React from 'react'
import type { SessionUser, Role } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'
import { api } from '@/lib/api-client'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  Gauge,
  BookOpen,
  Users,
  Boxes,
  DoorOpen,
  FileText,
  ScrollText,
  UserCog,
  LogOut,
  Menu,
  Moon,
  Sun,
  GraduationCap,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { DashboardSection } from '@/components/sections/dashboard-section'
import { JadualSection } from '@/components/sections/jadual-section'
import { GenerateSection } from '@/components/sections/generate-section'
import { BebanSection } from '@/components/sections/beban-section'
import { KursusSection } from '@/components/sections/kursus-section'
import { PensyarahSection } from '@/components/sections/pensyarah-section'
import { ModulSection } from '@/components/sections/modul-section'
import { BilikSection } from '@/components/sections/bilik-section'
import { PermohonanSection } from '@/components/sections/permohonan-section'
import { AuditSection } from '@/components/sections/audit-section'
import { UsersSection } from '@/components/sections/users-section'

type SectionId =
  | 'dashboard'
  | 'jadual'
  | 'generate'
  | 'beban'
  | 'kursus'
  | 'pensyarah'
  | 'modul'
  | 'bilik'
  | 'permohonan'
  | 'audit'
  | 'users'

interface NavItem {
  id: SectionId
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Papan Pemuka', icon: LayoutDashboard, roles: ['TIMBALAN_PENGARAH', 'HEA', 'KETUA_KURSUS', 'PENSYARAH', 'IT'] },
  { id: 'jadual', label: 'Jadual Kelas', icon: CalendarDays, roles: ['TIMBALAN_PENGARAH', 'HEA', 'KETUA_KURSUS', 'PENSYARAH', 'IT'] },
  { id: 'generate', label: 'Jana Jadual AI', icon: Sparkles, roles: ['TIMBALAN_PENGARAH', 'HEA', 'KETUA_KURSUS'] },
  { id: 'beban', label: 'Beban Tugas', icon: Gauge, roles: ['TIMBALAN_PENGARAH', 'HEA', 'KETUA_KURSUS', 'PENSYARAH', 'IT'] },
  { id: 'kursus', label: 'Kursus', icon: BookOpen, roles: ['TIMBALAN_PENGARAH', 'HEA', 'KETUA_KURSUS', 'PENSYARAH', 'IT'] },
  { id: 'pensyarah', label: 'Pensyarah', icon: Users, roles: ['TIMBALAN_PENGARAH', 'HEA', 'KETUA_KURSUS', 'PENSYARAH', 'IT'] },
  { id: 'modul', label: 'Modul / Subjek', icon: Boxes, roles: ['TIMBALAN_PENGARAH', 'HEA', 'KETUA_KURSUS', 'PENSYARAH', 'IT'] },
  { id: 'bilik', label: 'Bilik & Makmal', icon: DoorOpen, roles: ['TIMBALAN_PENGARAH', 'HEA', 'KETUA_KURSUS', 'PENSYARAH', 'IT'] },
  { id: 'permohonan', label: 'Permohonan', icon: FileText, roles: ['TIMBALAN_PENGARAH', 'HEA', 'KETUA_KURSUS', 'PENSYARAH'] },
  { id: 'audit', label: 'Log Audit', icon: ScrollText, roles: ['TIMBALAN_PENGARAH', 'HEA', 'IT'] },
  { id: 'users', label: 'Pengguna', icon: UserCog, roles: ['TIMBALAN_PENGARAH', 'IT'] },
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
    } catch {
      onLogout()
    }
  }

  const initials = user.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const Section = (() => {
    switch (active) {
      case 'dashboard': return <DashboardSection user={user} onNavigate={setActive} />
      case 'jadual': return <JadualSection user={user} />
      case 'generate': return <GenerateSection user={user} />
      case 'beban': return <BebanSection user={user} />
      case 'kursus': return <KursusSection user={user} />
      case 'pensyarah': return <PensyarahSection user={user} />
      case 'modul': return <ModulSection user={user} />
      case 'bilik': return <BilikSection user={user} />
      case 'permohonan': return <PermohonanSection user={user} />
      case 'audit': return <AuditSection user={user} />
      case 'users': return <UsersSection user={user} />
      default: return null
    }
  })()

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border/60">
        <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md shrink-0">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-base gradient-text leading-tight">ASTS</p>
          <p className="text-[11px] text-muted-foreground leading-tight">ADTEC Jitra</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3 space-y-0.5">
        {visibleNav.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActive(item.id)
              setMobileOpen(false)
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              active === item.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-sidebar-border/60">
        <div className="glass rounded-lg p-2.5 text-[11px] text-muted-foreground">
          <p className="font-semibold text-foreground mb-0.5 flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-primary" /> Keselamatan
          </p>
          <p>Sesi: 8 jam · RBAC aktif · Audit log diaktifkan</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-30 glass-strong border-b border-border/40">
        <div className="flex items-center gap-3 px-4 h-16">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Buka menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 glass-sidebar">
              {SidebarContent}
            </SheetContent>
          </Sheet>

          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base sm:text-lg truncate">
              {NAV_ITEMS.find((n) => n.id === active)?.label}
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {ROLE_LABELS[user.role]}
            </p>
          </div>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Tukar tema"
          >
            {mounted && theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2 h-10">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
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
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 glass-sidebar flex-col">
          {SidebarContent}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">{Section}</div>
        </main>
      </div>

      {/* Sticky footer */}
      <footer className="mt-auto glass-strong border-t border-border/40">
        <div className="px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">ASTS</span> · ADTEC Smart Timetable
            System · Jabatan Tenaga Manusia (JTM) · © {new Date().getFullYear()} ADTEC Jitra, Kedah
          </p>
          <p className="flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-primary" />
            Sistem dilindungi · RBAC + Audit Log + Rate Limiting
          </p>
        </div>
      </footer>
    </div>
  )
}
