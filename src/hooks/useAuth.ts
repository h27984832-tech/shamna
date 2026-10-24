import { useEffect, useState } from 'react'
import type { AuthSession as Session } from '@supabase/supabase-js'
import type { AppRole } from '../lib/models'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [roles, setRoles] = useState<AppRole[]>([])
  const [passwordRecovery, setPasswordRecovery] = useState(() => {
    const callbackParams = new URLSearchParams(window.location.hash.slice(1) || window.location.search)
    return callbackParams.get('type') === 'recovery'
  })
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) {
      return
    }

    let alive = true
    let activeUserId: string | null = null
    const refreshRoles = async (userId: string) => {
      const { data } = await supabase!.from('user_roles').select('role').eq('user_id', userId)
      if (alive) setRoles((data ?? []).map((row) => row.role as AppRole))
    }
    const refreshCurrentUserRoles = () => {
      if (activeUserId) void refreshRoles(activeUserId)
    }
    window.addEventListener('focus', refreshCurrentUserRoles)

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      activeUserId = data.session?.user.id ?? null
      setSession(data.session)
      if (activeUserId) await refreshRoles(activeUserId)
      if (alive) setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      activeUserId = nextSession?.user.id ?? null
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (event === 'SIGNED_OUT') setPasswordRecovery(false)
      setRoles([])
      if (activeUserId) {
        const userId = activeUserId
        window.setTimeout(() => { void refreshRoles(userId) }, 0)
      }
      setLoading(false)
    })

    return () => {
      alive = false
      window.removeEventListener('focus', refreshCurrentUserRoles)
      authListener.subscription.unsubscribe()
    }
  }, [])

  return { session, roles, loading, isConfigured: Boolean(supabase), passwordRecovery, clearPasswordRecovery: () => setPasswordRecovery(false) }
}
