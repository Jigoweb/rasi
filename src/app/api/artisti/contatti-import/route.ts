import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { authorizeContattiImport } from '@/features/artisti/lib/contatti-import-access'
import { parseContattiEdits } from '@/features/artisti/lib/contatti-import'
import {
  commitContattiEdits,
  previewContattiFile,
  revalidateContattiEdits,
} from '@/features/artisti/services/contatti-import.server'
import type { Database } from '@/shared/lib/supabase'

export const runtime = 'nodejs'

const MAX_BYTES = 2_000_000

type CookieToSet = { name: string; value: string; options: CookieOptions }

async function requireContattiImporter(
  req: NextRequest,
): Promise<{ ok: true; client: SupabaseClient<Database> } | { ok: false; response: NextResponse }> {
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
    const access = authorizeContattiImport(error || !data.user ? null : data.user)
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
          // In un Route Handler il refresh del cookie può fallire.
        }
      },
    },
  })
  const { data, error } = await client.auth.getUser()
  const access = authorizeContattiImport(error || !data.user ? null : data.user)
  if (!access.ok) {
    return { ok: false, response: NextResponse.json({ error: access.error }, { status: access.status }) }
  }
  return { ok: true, client }
}

export async function POST(req: NextRequest) {
  const auth = await requireContattiImporter(req)
  if (!auth.ok) return auth.response

  const contentType = req.headers.get('content-type') || ''
  try {
    if (contentType.includes('application/json')) {
      return handleEdits(req, auth.client)
    }
    return handlePreview(req, auth.client)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Errore durante il recupero contatti'
    console.error('Recupero contatti artisti:', cause)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function handlePreview(req: NextRequest, client: SupabaseClient<Database>) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 })
  }
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File mancante' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File troppo grande (massimo 2 MB)' }, { status: 400 })
  }
  const data = Buffer.from(await file.arrayBuffer())
  const result = await previewContattiFile(client, file.name, data)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ mode: 'preview', ...result })
}

async function handleEdits(req: NextRequest, client: SupabaseClient<Database>) {
  let body: { mode?: unknown; rows?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 })
  }
  if (body.mode !== 'revalidate' && body.mode !== 'commit') {
    return NextResponse.json({ error: 'Modalità non valida' }, { status: 400 })
  }
  const edits = parseContattiEdits(body.rows)
  if (!edits.ok) return NextResponse.json({ error: edits.error }, { status: 400 })
  const result = body.mode === 'revalidate'
    ? await revalidateContattiEdits(client, edits.edits)
    : await commitContattiEdits(client, edits.edits)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ mode: body.mode, rows: result.rows, summary: result.summary })
}
