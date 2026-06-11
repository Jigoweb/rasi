import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './supabase'

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null

function getClient() {
  if (!_client) {
    _client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}

// Browser client using @supabase/ssr — stores session in cookies so the
// Next.js middleware can read it server-side
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient<Database>>, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver)
  }
})
