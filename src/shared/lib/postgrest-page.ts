/** PostgREST `db-max-rows` in supabase/config.toml. Non alzarlo: le letture lunghe si paginano. */
export const POSTGREST_MAX_ROWS = 1000

const MAX_PAGES = 200

export type PageError = { message: string }

type PageResult<T> = { data: T[] | null; error: PageError | null }

/**
 * Scarica tutte le righe a blocchi da al massimo `POSTGREST_MAX_ROWS`, con l'ordine
 * deciso da `load` (deve essere stabile e univoco, altrimenti offset salta righe).
 * Se `error` è valorizzato, `data` può essere parziale: il chiamante non deve trattarlo come elenco completo.
 */
export async function fetchAllPages<T>(
  load: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = POSTGREST_MAX_ROWS,
): Promise<{ data: T[]; error: PageError | null }> {
  if (pageSize < 1 || pageSize > POSTGREST_MAX_ROWS) {
    return { data: [], error: { message: `pageSize deve essere tra 1 e ${POSTGREST_MAX_ROWS}` } }
  }

  const all: T[] = []
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * pageSize
    const { data, error } = await load(from, from + pageSize - 1)
    if (error) return { data: all, error }
    const batch = data ?? []
    all.push(...batch)
    if (batch.length < pageSize) return { data: all, error: null }
  }

  return { data: all, error: { message: 'Lettura interrotta: risultato troppo grande' } }
}

/** Spezza gli id per i filtri `.in()`, che finiscono nella query string. */
export function chunkIds(ids: string[], size = 100): string[][] {
  if (size < 1) throw new Error('size deve essere almeno 1')
  const chunks: string[][] = []
  for (let index = 0; index < ids.length; index += size) {
    chunks.push(ids.slice(index, index + size))
  }
  return chunks
}
