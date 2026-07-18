'use client'

import * as React from 'react'
import { api, ApiError } from '@/lib/api-client'
import type { SessionUser } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Flame, Loader2, Lock, Mail, ShieldCheck, Eye, EyeOff, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'

interface LoginScreenProps {
  onSuccess: () => void
}

const DEMO_ACCOUNTS = [
  { email: 'pemilik@cktadik.my', role: 'Pemilik', desc: 'Akses penuh' },
  { email: 'kaunter@cktadik.my', role: 'Pekerja Kaunter', desc: 'Ambil pesanan' },
  { email: 'dapur@cktadik.my', role: 'Pekerja Dapur', desc: 'Lihat pesanan' },
]

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPwd, setShowPwd] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post<{ user: SessionUser }>('/api/auth/login', { email, password })
      toast.success(`Selamat datang, ${res.user.name}`)
      onSuccess()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Log masuk gagal.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function fillDemo(em: string) {
    setEmail(em)
    setPassword('CktAdik2026!')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-6 items-center">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col gap-6 p-8 glass-strong rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg">
              <Flame className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">CAOMS</h1>
              <p className="text-sm text-muted-foreground">CKT Adik Order Management</p>
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold leading-tight">
              Sistem Rekod & Pengurusan Pesanan
            </h2>
            <p className="text-muted-foreground">
              CKT Adik — Char Kue Teow & menu lain. Memastikan <strong>tiada seorang pun pelanggan tercicir</strong> dengan
              penjejakan status pesanan real-time dan amaran automatik.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: UtensilsCrossed, title: 'Papan Status', desc: 'FIFO queue board' },
              { icon: ShieldCheck, title: 'Amaran Auto', desc: 'Anti-tercicir 20 min' },
            ].map((f) => (
              <div key={f.title} className="glass rounded-lg p-3">
                <f.icon className="h-5 w-5 text-primary mb-1" />
                <p className="text-sm font-medium">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Login form */}
        <Card className="glass-strong border-0 shadow-xl">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl gradient-text">CAOMS</CardTitle>
                <CardDescription>CKT Adik</CardDescription>
              </div>
            </div>
            <CardTitle className="hidden lg:block">Log Masuk</CardTitle>
            <CardDescription>Masukkan kredensial untuk akses sistem pesanan.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Emel</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@cktadik.my" className="pl-9" required autoComplete="email" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Kata Laluan</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9 pr-9" required autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Log Masuk
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Akaun demo (kata laluan: <span className="font-mono">CktAdik2026!</span>):
              </p>
              <div className="grid gap-1.5">
                {DEMO_ACCOUNTS.map((a) => (
                  <button key={a.email} type="button" onClick={() => fillDemo(a.email)} className="text-left text-xs glass rounded-md px-2.5 py-1.5 hover:bg-primary/10 transition-colors flex items-center justify-between gap-2">
                    <span className="font-mono truncate">{a.email}</span>
                    <span className="text-primary font-medium whitespace-nowrap">{a.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
