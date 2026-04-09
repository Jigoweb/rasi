import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Browser client using @supabase/ssr — stores session in cookies so the
// Next.js middleware can read it server-side
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)