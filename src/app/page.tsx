'use client'

import * as React from 'react'
import { api } from '@/lib/api-client'
import type { SessionUser } from '@/lib/types'
import { LoginScreen } from '@/components/login-screen'
import { AppShell } from '@/components/app-shell'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const [user, setUser] = React.useState<SessionUser | null>(null)
  const [loading, setLoading] = React.useState(true)

  const refreshUser = React.useCallback(async () => {
    try {
      const res = await api.get<{ user: SessionUser | null }>('/api/auth/me')
      setUser(res.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    refreshUser()
  }, [refreshUser])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onSuccess={refreshUser} />
  }

  return <AppShell user={user} onLogout={refreshUser} />
}
