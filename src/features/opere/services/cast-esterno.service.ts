import type { CastEsternoInput } from '@/features/opere/lib/cast-esterno'
import { supabase } from '@/shared/lib/supabase-client'
import type { Database, Json } from '@/shared/lib/supabase'
import { chunkIds, fetchAllPages, POSTGREST_MAX_ROWS } from '@/shared/lib/postgrest-page'

export type CastEsternoRow = Database['public']['Tables']['cast_esterno']['Row']

/** Righe visibili nel pannello. Il conteggio del badge resta il totale dell'opera. */
export const CAST_ESTERNO_PAGE_SIZE = 50

export type CastEsternoPageOptions = {
  page?: number
  pageSize?: number
  episodioId?: string | null
  soloSerie?: boolean
}

function castEsternoBase(operaId: string, options?: { soloSerie?: boolean; episodioId?: string | null }, withCount = false) {
  let query = supabase
    .from('cast_esterno')
    .select('*', withCount ? { count: 'exact' } : undefined)
    .eq('opera_id', operaId)

  if (options?.soloSerie) query = query.is('episodio_id', null)
  else if (options?.episodioId) query = query.eq('episodio_id', options.episodioId)

  return query
    .order('numero_stagione', { referencedTable: 'episodi', ascending: true, nullsFirst: true })
    .order('numero_episodio', { referencedTable: 'episodi', ascending: true, nullsFirst: true })
    .order('ordine', { ascending: true })
    .order('nome', { ascending: true })
    .order('id', { ascending: true })
}

export const listCastEsternoPage = async (operaId: string, options: CastEsternoPageOptions = {}) => {
  const page = Math.max(1, options.page ?? 1)
  const pageSize = Math.min(POSTGREST_MAX_ROWS, Math.max(1, options.pageSize ?? CAST_ESTERNO_PAGE_SIZE))
  const from = (page - 1) * pageSize
  const scope = { soloSerie: options.soloSerie, episodioId: options.episodioId }

  const [pageResult, totalResult] = await Promise.all([
    castEsternoBase(operaId, scope, true).range(from, from + pageSize - 1),
    supabase.from('cast_esterno').select('id', { count: 'exact', head: true }).eq('opera_id', operaId),
  ])

  if (pageResult.error) return { data: [] as CastEsternoRow[], count: 0, total: 0, error: pageResult.error }
  if (totalResult.error) {
    return { data: pageResult.data ?? [], count: pageResult.count ?? 0, total: 0, error: totalResult.error }
  }

  return {
    data: pageResult.data ?? [],
    count: pageResult.count ?? 0,
    total: totalResult.count ?? 0,
    error: null,
  }
}

/** Elenco completo, a blocchi. Lo usa l'export Excel, non il pannello. */
export const listCastEsterno = async (operaId: string) => {
  const result = await fetchAllPages<CastEsternoRow>((from, to) => castEsternoBase(operaId).range(from, to))
  if (result.error) return { data: null, error: result.error }
  return { data: result.data, error: null }
}

/** Sostituisce il cast esterno dell'opera intera (episodioId null) o di un solo episodio. */
export const replaceCastEsterno = async (operaId: string, rows: CastEsternoInput[], episodioId: string | null = null) => {
  const { error } = await supabase.rpc('replace_cast_esterno', {
    p_opera_id: operaId,
    p_rows: rows as unknown as Json,
    p_episodio_id: episodioId,
  })
  return { error }
}

export const createCastEsterno = async (operaId: string, row: CastEsternoInput, episodioId: string | null = null) => {
  const { data, error } = await supabase
    .from('cast_esterno')
    .insert({
      opera_id: operaId,
      episodio_id: episodioId,
      nome: row.nome,
      personaggio: row.personaggio,
      primarieta: row.primarieta,
      ruolo: row.ruolo,
      imdb_nconst: row.imdb_nconst,
      fonte: row.fonte,
      ordine: row.ordine,
    })
    .select('*')
    .single()

  return { data, error }
}

export const updateCastEsterno = async (
  id: string,
  patch: Partial<Pick<CastEsternoRow, 'nome' | 'personaggio' | 'primarieta' | 'ruolo' | 'ordine' | 'episodio_id'>>,
) => {
  const { data, error } = await supabase
    .from('cast_esterno')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  return { data, error }
}

export const deleteCastEsterno = async (id: string) => {
  const { error } = await supabase
    .from('cast_esterno')
    .delete()
    .eq('id', id)

  return { error }
}

/**
 * Match anagrafica del cast esterno. Con `castIds` si leggono solo le righe
 * della pagina visibile: la funzione è un SETOF e PostgREST la taglia a max_rows.
 */
export const listCastEsternoArtistiCorrispondenti = async (operaId: string, castIds?: string[]) => {
  if (castIds && castIds.length === 0) return { data: [], error: null }

  const groups = castIds ? chunkIds(castIds) : [undefined]
  const all: Database['public']['Functions']['cast_esterno_artisti_corrispondenti']['Returns'] = []

  for (const group of groups) {
    const result = await fetchAllPages((from, to) =>
      supabase
        .rpc('cast_esterno_artisti_corrispondenti', {
          p_opera_id: operaId,
          ...(group ? { p_cast_ids: group } : {}),
        })
        .range(from, to),
    )
    if (result.error) return { data: [], error: result.error }
    all.push(...result.data)
  }

  return { data: all, error: null }
}
