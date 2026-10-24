import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * The publishable key is intended for browser use and is not a secret.
 * Database access must be protected by RLS. Never put a service-role key here.
 */
export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient<Database>(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

export const isSupabaseConfigured = Boolean(supabase)
