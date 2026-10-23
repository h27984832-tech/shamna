import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const supabase = url && publishableKey
  ? createClient<Database>(url, publishableKey)
  : null

export const isSupabaseConfigured = Boolean(supabase)
