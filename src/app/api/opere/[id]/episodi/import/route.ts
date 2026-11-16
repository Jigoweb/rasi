import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/lib/supabase'
import { canEditOpera, mustProposeOpereChanges, OPERA_VALIDATA_ERROR, readAuthoritativeUserRole } from '@/shared/lib/auth-permissions'
import { proponiModifica } from '@/features/approvazioni/services/proposte.service'
import type { RigaBatch } from '@/features/approvazioni/lib/modifica-payload'
import {
  canImportEpisodi,
  confirmEpisodiDrafts,
  EPISODI_IMPORT_MAX_BYTES,
  runEpisodiImport,
  type EpisodeInsert,
  type EpisodiImportStore,
} from '@/features/opere/lib/episodi-import'

const PAGE_SIZE = 1000

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const auth = await authorize(req)
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    const editable = await checkOperaEditable(auth.token, auth.role, id)
    if (!editable.ok) {
      return NextResponse.json({ ok: false, error: editable.error }, { status: editable.status })
    }

    const contentType = req.headers.get('content-type') ?? ''
    if (contentType.toLowerCase().includes('application/json')) {
      return confirmFromJson(req, auth.token, id, auth.role)
    }

    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return NextResponse.json({ ok: false, error: 'Richiesta non valida.' }, { status: 400 })
    }

    const mode = form.get('mode')
    const file = form.get('file')
    if (mode === 'confirm') {
      return NextResponse.json(
        { ok: false, error: 'La conferma usa le righe modificate in anteprima.' },
        { status: 400 },
      )
    }
    if (mode !== 'preview') {
      return NextResponse.json({ ok: false, error: 'Modalità non valida.' }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'File mancante.' }, { status: 400 })
    }
    if (file.size > EPISODI_IMPORT_MAX_BYTES) {
      return NextResponse.json({ ok: false, error: 'Il file supera la dimensione massima di 5 MB.' }, { status: 400 })
    }

    const result = await runEpisodiImport({
      store: createStore(auth.token),
      operaId: id,
      filename: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
      mode: 'preview',
    })

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('Import episodi', error)
    return NextResponse.json({ ok: false, error: 'Importazione non riuscita.' }, { status: 500 })
  }
}

async function confirmFromJson(req: NextRequest, token: string, operaId: string, role: string | null) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Richiesta non valida.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body) || (body as { mode?: unknown }).mode !== 'confirm') {
    return NextResponse.json({ ok: false, error: 'Modalità non valida.' }, { status: 400 })
  }
  if (!mustProposeOpereChanges(role)) {
    const result = await confirmEpisodiDrafts({
      store: createStore(token),
      operaId,
      rows: (body as { rows?: unknown }).rows,
    })
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status })
    }
    return NextResponse.json(result)
  }

  const bucket: RigaBatch[] = []
  const client = userClient(token)
  const base = createStore(token)
  const result = await confirmEpisodiDrafts({
    store: {
      ...base,
      async insertEpisode(row) {
        bucket.push({ entita: 'episodio', operazione: 'insert', dopo: { ...row } })
        return { ok: true }
      },
      async updateEpisode(input) {
        const { data, error } = await client
          .from('episodi')
          .select('id')
          .eq('opera_id', input.opera_id)
          .eq('numero_stagione', input.numero_stagione)
          .eq('numero_episodio', input.numero_episodio)
          .maybeSingle()
        if (error || !data) return { ok: false, message: error?.message || 'Episodio non trovato' }
        bucket.push({
          entita: 'episodio',
          operazione: 'update',
          entitaId: data.id,
          dopo: input.patch,
        })
        return { ok: true }
      },
    },
    operaId,
    rows: (body as { rows?: unknown }).rows,
  })
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status })
  }
  if (bucket.length === 0) return NextResponse.json(result)
  const { error } = await proponiModifica({
    entita: 'episodio',
    operaId,
    righe: bucket,
  }, client)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ...result, inAttesa: true })
}

function userClient(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    throw new Error('Configurazione Supabase mancante')
  }
  return createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function authorize(
  req: NextRequest,
): Promise<{ ok: true; token: string; role: string | null } | { ok: false; status: number; error: string }> {
  const token = bearerToken(req.headers.get('authorization'))
  if (!token) {
    return { ok: false, status: 401, error: 'Autenticazione richiesta.' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    return { ok: false, status: 500, error: 'Configurazione Supabase mancante.' }
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data.user) {
    return { ok: false, status: 401, error: 'Autenticazione richiesta.' }
  }
  if (!canImportEpisodi(data.user)) {
    return {
      ok: false,
      status: 403,
      error: 'Accesso negato: il tuo ruolo non può importare gli episodi.',
    }
  }
  return { ok: true, token, role: readAuthoritativeUserRole(data.user) }
}

/**
 * Operatore base e Tirocinante non modificano le opere validate. La RLS blocca
 * comunque le scritture (opera_modificabile); qui si risponde con un messaggio
 * chiaro prima di leggere il file. Opera assente: ci pensa l'import (404).
 */
async function checkOperaEditable(
  token: string,
  role: string | null,
  operaId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (canEditOpera(role, null) && canEditOpera(role, 'validato')) return { ok: true }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    return { ok: false, status: 500, error: 'Configurazione Supabase mancante.' }
  }
  const client = createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client
    .from('opere')
    .select('stato_validazione')
    .eq('id', operaId)
    .maybeSingle()
  if (error) return { ok: false, status: 500, error: 'Lettura opera non riuscita.' }
  if (data && !canEditOpera(role, data.stato_validazione)) {
    return { ok: false, status: 403, error: OPERA_VALIDATA_ERROR }
  }
  return { ok: true }
}

function bearerToken(header: string | null): string | null {
  if (!header) return null
  const [scheme, token, ...rest] = header.trim().split(/\s+/)
  if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) return null
  return token
}

function createStore(token: string): EpisodiImportStore {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    throw new Error('Configurazione Supabase mancante')
  }

  const client = createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return {
    async getOpera(operaId) {
      const { data, error } = await client
        .from('opere')
        .select('id, tipo, has_episodes')
        .eq('id', operaId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
    async listEpisodeKeys(operaId) {
      const episodes: Array<{ numero_stagione: number; numero_episodio: number }> = []
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await client
          .from('episodi')
          .select('numero_stagione, numero_episodio')
          .eq('opera_id', operaId)
          .order('numero_stagione', { ascending: true })
          .order('numero_episodio', { ascending: true })
          .range(from, from + PAGE_SIZE - 1)
        if (error) throw new Error(error.message)
        episodes.push(...(data ?? []))
        if (!data || data.length < PAGE_SIZE) break
      }
      return episodes
    },
    async insertEpisode(row: EpisodeInsert) {
      const { error } = await client.from('episodi').insert({
        opera_id: row.opera_id,
        numero_stagione: row.numero_stagione,
        numero_episodio: row.numero_episodio,
        titolo_episodio: row.titolo_episodio,
        titolo_episodio_originale: row.titolo_episodio_originale,
        alias_titoli: row.alias_titoli,
        imdb_tconst: row.imdb_tconst,
        durata_minuti: row.durata_minuti,
        data_prima_messa_in_onda: row.data_prima_messa_in_onda,
      })
      if (!error) return { ok: true as const }
      return { ok: false as const, code: error.code, message: error.message }
    },
    async updateEpisode(input) {
      const { error } = await client
        .from('episodi')
        .update(input.patch)
        .eq('opera_id', input.opera_id)
        .eq('numero_stagione', input.numero_stagione)
        .eq('numero_episodio', input.numero_episodio)
      if (!error) return { ok: true as const }
      return { ok: false as const, code: error.code, message: error.message }
    },
  }
}
