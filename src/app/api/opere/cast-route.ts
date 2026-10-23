import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { authorizeCastImport } from '@/features/opere/lib/cast-import-access'
import type { Database } from '@/shared/lib/supabase'

export type CastRouteClient = SupabaseClient<Database>

type CookieToSet = { name: string; value: string; options: CookieOptions }

export async function requireCastManager(
  req: NextRequest,
): Promise<{ ok: true; client: CastRouteClient } | { ok: false; response: NextResponse }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Configurazione Supabase mancante' }, { status: 500 }),
    }
  }

  const header = req.headers.get('authorization')
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim()
    const client = createClient<Database>(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await client.auth.getUser(token)
    const access = authorizeCastImport(error || !data.user ? null : data.user)
    if (!access.ok) {
      return { ok: false, response: NextResponse.json({ error: access.error }, { status: access.status }) }
    }
    return { ok: true, client }
  }

  const cookieStore = await cookies()
  const client = createServerClient<Database>(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          for (const cookie of cookiesToSet) cookieStore.set(cookie.name, cookie.value, cookie.options)
        } catch {
          // In un Route Handler di sola lettura il refresh del cookie può fallire.
        }
      },
    },
  })
  const { data, error } = await client.auth.getUser()
  const access = authorizeCastImport(error || !data.user ? null : data.user)
  if (!access.ok) {
    return { ok: false, response: NextResponse.json({ error: access.error }, { status: access.status }) }
  }
  return { ok: true, client }
}

export function contentDisposition(filename: string): string {
  const fallback = filename.replace(/[^\w.\-]+/g, '_')
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}
