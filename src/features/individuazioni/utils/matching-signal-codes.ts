export const MATCHING_SIGNAL_CODES = [
  'titolo_debole',
  'titolo_originale_debole',
  'anno_scostamento',
  'anno_fuori_tolleranza',
  'regia_incoerente',
  'episodio_mancante',
  'episodio_da_verificare',
] as const

export type MatchingSignalCode = (typeof MATCHING_SIGNAL_CODES)[number]

export type MatchingSignalFlags = Record<MatchingSignalCode, boolean>

export type MatchingSignalCatalogItem = {
  code: MatchingSignalCode
  label: string
}

/** Soglie allineate a getSimilarityTone in matching-details.ts */
const TITLE_WEAK_BELOW = 70
const ORIGINAL_TITLE_WEAK_BELOW = 60

export const MATCHING_SIGNAL_CATALOG: readonly MatchingSignalCatalogItem[] = [
  { code: 'titolo_debole', label: 'Titolo debole' },
  { code: 'titolo_originale_debole', label: 'Titolo originale debole' },
  { code: 'anno_scostamento', label: 'Anno con scostamento' },
  { code: 'anno_fuori_tolleranza', label: 'Anno fuori tolleranza' },
  { code: 'regia_incoerente', label: 'Regia incoerente' },
  { code: 'episodio_mancante', label: 'Episodio mancante' },
  { code: 'episodio_da_verificare', label: 'Episodio da verificare' },
] as const

export type MatchingSignalRowContext = {
  numero_episodio?: number | null
  numero_stagione?: number | null
}

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : {}
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function isBroadcasterEpisodeCode(episode?: number | null, season?: number | null): boolean {
  return season == null && typeof episode === 'number' && episode > 200
}

function emptyFlags(): MatchingSignalFlags {
  return {
    titolo_debole: false,
    titolo_originale_debole: false,
    anno_scostamento: false,
    anno_fuori_tolleranza: false,
    regia_incoerente: false,
    episodio_mancante: false,
    episodio_da_verificare: false,
  }
}

/**
 * Deriva i flag segnale problematici da dettagli_matching (+ opzionale contesto riga episodio).
 * Assenza blocco/score → false.
 */
export function extractMatchingSignalFlags(
  dettagliMatching: unknown,
  row?: MatchingSignalRowContext | null,
): MatchingSignalFlags {
  const flags = emptyFlags()
  const dettagli = asRecord(dettagliMatching)
  const titolo = asRecord(dettagli.titolo)
  const titoloOriginale = asRecord(dettagli.titolo_originale)
  const anno = asRecord(dettagli.anno)
  const regia = asRecord(dettagli.regia)
  const totale = asRecord(dettagli.totale)
  const episodeFallback = asRecord(dettagli.episode_normalization_fallback)

  const titoloScore = readNumber(titolo.score)
  if (Object.keys(titolo).length > 0 && titoloScore != null && titoloScore < TITLE_WEAK_BELOW) {
    flags.titolo_debole = true
  }

  const titoloOriginaleScore = readNumber(titoloOriginale.score)
  if (
    Object.keys(titoloOriginale).length > 0
    && titoloOriginaleScore != null
    && titoloOriginaleScore < ORIGINAL_TITLE_WEAK_BELOW
  ) {
    flags.titolo_originale_debole = true
  }

  const hardScarto = anno.hard_scarto === true
  const differenza = readNumber(anno.differenza)
  if (hardScarto) {
    flags.anno_fuori_tolleranza = true
  } else if (differenza != null && differenza > 0) {
    flags.anno_scostamento = true
  }

  const regiaScore = readNumber(regia.score)
  if (regia.penalita === true || (regiaScore != null && regiaScore < 0)) {
    flags.regia_incoerente = true
  }

  flags.episodio_mancante =
    dettagli.episodio_mancante === true || totale.episodio_mancante === true

  if (!flags.episodio_mancante) {
    const needsFallbackReview = episodeFallback.confidence === 'review_required'
    const alreadyNormalized = episodeFallback.confidence === 'high'
    const needsBroadcasterReview = !alreadyNormalized && isBroadcasterEpisodeCode(
      row?.numero_episodio ?? null,
      row?.numero_stagione ?? null,
    )
    flags.episodio_da_verificare = needsFallbackReview || needsBroadcasterReview
  }

  return flags
}

export function formatSignalFlag(value: boolean): 'SI' | 'NO' {
  return value ? 'SI' : 'NO'
}

export function getActiveMatchingSignalCodes(
  dettagliMatching: unknown,
  row?: MatchingSignalRowContext | null,
): MatchingSignalCode[] {
  const flags = extractMatchingSignalFlags(dettagliMatching, row)
  return MATCHING_SIGNAL_CATALOG
    .filter(item => flags[item.code])
    .map(item => item.code)
}

export function getMatchingSignalLabel(code: MatchingSignalCode): string {
  return MATCHING_SIGNAL_CATALOG.find(item => item.code === code)?.label ?? code
}

export function isMatchingSignalCode(value: string): value is MatchingSignalCode {
  return (MATCHING_SIGNAL_CODES as readonly string[]).includes(value)
}
