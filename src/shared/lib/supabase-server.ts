import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase'

let _client: SupabaseClient<Database> | null = null

function getClient(): SupabaseClient<Database> {
  if (!_client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    _client = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-client-info': 'rasi-server'
        }
      }
    })
  }
  return _client
}

// Proxy lazy: il client viene inizializzato solo alla prima chiamata, non all'import del modulo.
// Questo evita errori di build quando le env var non sono presenti durante la fase di static analysis.
export const supabaseServer = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver)
  }
})
