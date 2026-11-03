import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildArtistPatch,
  classifyContattiImport,
  parseContattiImportFile,
  patchHasWrite,
  summarizeContattiCommit,
  summarizeContattiRows,
  type ContattiArtist,
  type ContattiCatalogArtist,
  type ContattiEdit,
  type ContattiImportRow,
  type ContattiCommitSummary,
  type ContattiPreviewSummary,
} from '@/features/artisti/lib/contatti-import'
import type { Database, Json } from '@/shared/lib/supabase'

type Client = SupabaseClient<Database>
const PAGE = 1000

type ArtistRow = {
  id: string
  nome: string
  cognome: string
  codice_fiscale: string | null
  partita_iva: string | null
  contatti: Json | null
  indirizzo: Json | null
}

type ReservedRow = {
  artista_id: string
  regime: string | null
  tassazione: string | null
  dettagli_regime: string | null
}

const MISSING_TABLE = 'Dati di regime non disponibili: applica la migrazione artisti_dati_riservati prima di importare i contatti'

function missingReserved(message: string): boolean {
  return message.includes('artisti_dati_riservati')
}

async function fetchAll<T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const all: T[] = []
  for (let page = 0; page < 100; page += 1) {
    const from = page * PAGE
    const { data, error } = await load(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const batch = data ?? []
    all.push(...batch)
    if (batch.length < PAGE) return all
  }
  throw new Error('Lettura interrotta: anagrafica troppo grande')
}

async function loadReserved(client: Client): Promise<ReservedRow[]> {
  try {
    return await fetchAll<ReservedRow>((from, to) =>
      client
        .from('artisti_dati_riservati')
        .select('artista_id, regime, tassazione, dettagli_regime')
        .order('artista_id')
        .range(from, to),
    )
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : ''
    if (missingReserved(message)) throw new Error(MISSING_TABLE)
    throw cause
  }
}

async function loadArtists(client: Client): Promise<ContattiArtist[]> {
  const [artists, reserved] = await Promise.all([
    fetchAll<ArtistRow>((from, to) =>
      client
        .from('artisti')
        .select('id, nome, cognome, codice_fiscale, partita_iva, contatti, indirizzo')
        .order('id')
        .range(from, to),
    ),
    loadReserved(client),
  ])

  const reservedByArtist = new Map<string, ReservedRow>()
  for (const row of reserved) reservedByArtist.set(row.artista_id, row)

  return artists.map((artist) => {
    const extra = reservedByArtist.get(artist.id)
    return {
      id: artist.id,
      nome: artist.nome,
      cognome: artist.cognome,
      codice_fiscale: artist.codice_fiscale,
      partita_iva: artist.partita_iva,
      contatti: artist.contatti,
      indirizzo: artist.indirizzo,
      riservati: extra
        ? {
            regime: extra.regime,
            tassazione: extra.tassazione,
            dettagli_regime: extra.dettagli_regime,
          }
        : null,
    }
  })
}

function catalogOf(artists: ContattiArtist[]): ContattiCatalogArtist[] {
  return artists.map((artist) => ({
    id: artist.id,
    nome: artist.nome,
    cognome: artist.cognome,
    codice_fiscale: artist.codice_fiscale,
  }))
}

function present(rows: ContattiImportRow[]) {
  return {
    ok: true as const,
    rows,
    summary: summarizeContattiRows(rows),
  }
}

export async function previewContattiFile(client: Client, filename: string, data: Buffer) {
  const parsed = parseContattiImportFile(filename, data)
  if (!parsed.ok) return parsed
  const artists = await loadArtists(client)
  const classified = classifyContattiImport(artists, parsed.edits)
  if (!classified.ok) return classified
  return {
    ...present(classified.rows),
    artisti: catalogOf(artists),
  }
}

export async function revalidateContattiEdits(client: Client, edits: ContattiEdit[]) {
  const artists = await loadArtists(client)
  const classified = classifyContattiImport(artists, edits, { keepIncluded: true })
  if (!classified.ok) return classified
  return present(classified.rows)
}

function toRpcPatch(patch: NonNullable<ReturnType<typeof buildArtistPatch>>): Json {
  const body: Record<string, Json> = { artista_id: patch.artista_id }
  if (patch.contatti) body.contatti = patch.contatti as Json
  if (patch.indirizzo) body.indirizzo = patch.indirizzo as Json
  if (patch.codice_fiscale) body.codice_fiscale = patch.codice_fiscale
  if (patch.partita_iva != null) body.partita_iva = patch.partita_iva
  if (patch.riservati) body.riservati = patch.riservati
  return body
}

export async function commitContattiEdits(
  client: Client,
  edits: ContattiEdit[],
): Promise<{ ok: true; rows: ContattiImportRow[]; summary: ContattiCommitSummary } | { ok: false; error: string }> {
  const artists = await loadArtists(client)
  const classified = classifyContattiImport(artists, edits, { keepIncluded: true })
  if (!classified.ok) return classified
  const byId = new Map(artists.map((artist) => [artist.id, artist]))
  const patches: Json[] = []
  for (const row of classified.rows) {
    if (!row.included || !row.artistaId) continue
    const artist = byId.get(row.artistaId)
    if (!artist) continue
    const patch = buildArtistPatch(artist, row)
    if (patch && patchHasWrite(patch)) patches.push(toRpcPatch(patch))
  }
  if (patches.length > 0) {
    const { error } = await client.rpc('apply_artisti_contatti_import', { p_patches: patches as Json })
    if (error) {
      if (missingReserved(error.message)) throw new Error(MISSING_TABLE)
      throw new Error(error.message)
    }
  }
  const summary = summarizeContattiCommit(classified.rows)
  if (patches.length === 0) {
    return { ok: true, rows: classified.rows, summary }
  }
  const refreshed = classifyContattiImport(await loadArtists(client), edits, { keepIncluded: true })
  if (!refreshed.ok) return refreshed
  return { ok: true, rows: refreshed.rows, summary }
}

export type { ContattiPreviewSummary, ContattiCommitSummary }
