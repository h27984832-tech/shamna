import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { AppRole } from '../lib/models'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [roles, setRoles] = useState<AppRole[]>([])
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let alive = true
    const refreshRoles = async (userId: string) => {
      const { data } = await supabase!.from('user_roles').select('role').eq('user_id', userId)
      if (alive) setRoles((data ?? []).map((row) => row.role as AppRole))
    }

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      setSession(data.session)
      if (data.session?.user.id) await refreshRoles(data.session.user.id)
      if (alive) setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setRoles([])
      if (nextSession?.user.id) {
        window.setTimeout(() => { void refreshRoles(nextSession.user.id) }, 0)
      }
      setLoading(false)
    })

    return () => {
      alive = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  return { session, roles, loading, isConfigured: Boolean(supabase) }
}
