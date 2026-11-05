import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase'

let _client: SupabaseClient<Database> | null = null

function getClient(): SupabaseClient<Database> {
  if (!_client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    // `next build` prerenderizza sitemap.xml nello stesso processo, e la CI
    // non imposta la service role. Solo in quella fase si usa ancora la
    // chiave anon, come prima: a runtime il fallback è chiuso.
    const buildFallbackKey =
      process.env.NEXT_PHASE === 'phase-production-build'
        ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        : undefined
    const supabaseKey = supabaseServiceKey || buildFallbackKey

    if (!supabaseUrl) {
      throw new Error('Manca NEXT_PUBLIC_SUPABASE_URL')
    }

    // Niente fallback sulla chiave anon a runtime. Dopo la revoca di EXECUTE
    // ad anon, le RPC di campagna (lock, init, chunk, finalize) chiamate da
    // questo client fallirebbero con un permesso negato difficile da leggere.
    if (!supabaseKey) {
      throw new Error(
        'Manca SUPABASE_SERVICE_ROLE_KEY. Il client server non usa la chiave anon: le funzioni revocate ad anon non sarebbero eseguibili.'
      )
    }

    _client = createClient<Database>(supabaseUrl, supabaseKey, {
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
