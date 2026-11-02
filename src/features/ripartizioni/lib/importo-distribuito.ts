import type { SupabaseClient } from '@supabase/supabase-js'

export type CampagnaRipartizioneStato = {
  id: string
  stato: string | null
}

export type RigaImportoNetto = {
  campagna_ripartizione_id: string
  importo_netto: unknown
}

const PAGE_SIZE = 1000

function toAmount(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

/**
 * Somma `ripartizioni.importo_netto` delle campagne con stato `distribuita`.
 * Non usa `importo_totale_disponibile`.
 */
export function sumImportoNettoDistribuito(
  campagne: readonly CampagnaRipartizioneStato[],
  righe: readonly RigaImportoNetto[],
): number {
  const distribuite = new Set(
    campagne.filter(campagna => campagna.stato === 'distribuita').map(campagna => campagna.id),
  )

  return righe.reduce((total, riga) => {
    if (!distribuite.has(riga.campagna_ripartizione_id)) return total
    return total + toAmount(riga.importo_netto)
  }, 0)
}

type PageResult<T> = {
  data: T[] | null
  error: { message: string } | null
}

async function fetchAllPages<T>(
  loadPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = []
  let from = 0

  for (;;) {
    const { data, error } = await loadPage(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const page = data ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
    from += PAGE_SIZE
  }
}

/** Lettura client delle righe già presenti. Non modifica la funzione SQL delle metriche. */
export async function fetchImportoNettoDistribuito(supabase: SupabaseClient): Promise<number> {
  const campagne = await fetchAllPages<CampagnaRipartizioneStato>((from, to) =>
    supabase
      .from('campagne_ripartizione')
      .select('id, stato')
      .order('id', { ascending: true })
      .range(from, to),
  )

  const righe = await fetchAllPages<RigaImportoNetto>((from, to) =>
    supabase
      .from('ripartizioni')
      .select('campagna_ripartizione_id, importo_netto')
      .order('id', { ascending: true })
      .range(from, to),
  )

  return sumImportoNettoDistribuito(campagne, righe)
}
