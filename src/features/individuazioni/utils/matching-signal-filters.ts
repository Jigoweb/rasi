import type { MatchingSignalCode } from './matching-signal-codes'

export type MatchingSignalFilterMode = 'or' | 'and'

type FilterableQuery<T> = {
  or: (filters: string) => T
  filter: (column: string, operator: string, value: unknown) => T
}

/**
 * Predicati PostgREST per ciascun codice segnale.
 * Usano path JSONB allineati a extractMatchingSignalFlags.
 */
export function matchingSignalPredicate(code: MatchingSignalCode): string {
  switch (code) {
    case 'titolo_debole':
      // score JSON number < 70
      return 'dettagli_matching->titolo->score.lt.70'
    case 'titolo_originale_debole':
      return 'dettagli_matching->titolo_originale->score.lt.60'
    case 'anno_scostamento':
      return 'and(dettagli_matching->anno->differenza.gt.0,dettagli_matching->anno->>hard_scarto.neq.true)'
    case 'anno_fuori_tolleranza':
      return 'dettagli_matching->anno->>hard_scarto.eq.true'
    case 'regia_incoerente':
      return 'or(dettagli_matching->regia->>penalita.eq.true,dettagli_matching->regia->score.lt.0)'
    case 'episodio_mancante':
      return 'or(dettagli_matching->>episodio_mancante.eq.true,dettagli_matching->totale->>episodio_mancante.eq.true)'
    case 'episodio_da_verificare':
      // fallback review OR codice emittente non ancora normalizzato; escluso se episodio_mancante
      return 'and(or(dettagli_matching->episode_normalization_fallback->>confidence.eq.review_required,and(numero_stagione.is.null,numero_episodio.gt.200,dettagli_matching->episode_normalization_fallback->>confidence.neq.high)),or(dettagli_matching->>episodio_mancante.is.null,dettagli_matching->>episodio_mancante.neq.true),or(dettagli_matching->totale->>episodio_mancante.is.null,dettagli_matching->totale->>episodio_mancante.neq.true))'
    default: {
      const _exhaustive: never = code
      return _exhaustive
    }
  }
}

export function buildMatchingSignalOrFilter(codes: MatchingSignalCode[]): string | null {
  if (codes.length === 0) return null
  return codes.map(matchingSignalPredicate).join(',')
}

/**
 * Applica filtri segnale a una query Supabase.
 * Selezione vuota = no-op. OR = unione predicati; AND = intersezione.
 */
export function applyMatchingSignalFilters<T extends FilterableQuery<T>>(
  query: T,
  codes: MatchingSignalCode[] | undefined,
  mode: MatchingSignalFilterMode = 'or',
): T {
  if (!codes || codes.length === 0) return query

  if (mode === 'and') {
    let next = query
    for (const code of codes) {
      next = next.or(matchingSignalPredicate(code))
    }
    return next
  }

  const orFilter = buildMatchingSignalOrFilter(codes)
  return orFilter ? query.or(orFilter) : query
}
