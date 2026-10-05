import type { Database, Json } from '@/shared/lib/supabase'

export type AmbitoArtista = Database['public']['Enums']['ambito_artista']

export const AMBITO_LABELS: Record<AmbitoArtista, string> = {
  musica: 'Musica',
  cinema: 'Audiovisivo',
  entrambi: 'Interdisciplinare',
}

export const TERRITORIO_OPTIONS: { value: 'ITA' | 'ITA+' | 'WW' | 'WW-'; label: string }[] = [
  { value: 'ITA', label: 'Italia (ITA)' },
  { value: 'ITA+', label: 'Italia+ (ITA+)' },
  { value: 'WW', label: 'Mondo (WW)' },
  { value: 'WW-', label: 'Mondo- (WW-)' },
]

function hasAmbitoToken(label: string, token: 'AU' | 'AV'): boolean {
  return new RegExp(`(?:^|[^A-Z])${token}(?:[^A-Z]|$)`).test(label.toUpperCase())
}

/**
 * Diritti attivi usano il marcatore AU (musica) o AV (audiovisivo) nel nome articolo.
 * ALL / AL non contano. Entrambi i marcatori → interdisciplinare.
 */
export function deriveAmbitoFromDiritti(diritti: Json | null | undefined): AmbitoArtista | null {
  const labels = parseDirittiAttivi(diritti)
  let hasAu = false
  let hasAv = false
  for (const label of labels) {
    if (hasAmbitoToken(label, 'AU')) hasAu = true
    if (hasAmbitoToken(label, 'AV')) hasAv = true
  }
  if (hasAu && hasAv) return 'entrambi'
  if (hasAu) return 'musica'
  if (hasAv) return 'cinema'
  return null
}

/** Valore salvato in `ambito`, altrimenti ricavato dai diritti. */
export function resolveAmbito(
  ambito: AmbitoArtista | null | undefined,
  diritti?: Json | null,
): AmbitoArtista | null {
  if (ambito) return ambito
  return deriveAmbitoFromDiritti(diritti)
}

/** Legacy 2-letter tokens still stored in codice_paese alongside ISO alpha-3. */
const PAESE_TOKEN_ALIASES: Record<string, string[]> = {
  ESP: ['ES'],
  JPN: ['JP'],
  ROU: ['RO'],
}

function paeseTokenClauses(token: string): string[] {
  return [
    `codice_paese.eq.${token}`,
    `codice_paese.like.${token}/%`,
    `codice_paese.like.%/${token}`,
    `codice_paese.like.%/${token}/%`,
  ]
}

/** PostgREST OR that matches one ISO (or legacy) code as a slash-separated token. */
export function codicePaeseTokenOr(code: string): string {
  const token = code.trim().toUpperCase()
  if (!/^[A-Z0-9]+$/.test(token)) {
    throw new Error('codice_paese_non_valido')
  }
  const tokens = [token, ...(PAESE_TOKEN_ALIASES[token] ?? [])]
  return tokens.flatMap(paeseTokenClauses).join(',')
}

export function formatAmbitoLabel(ambito: AmbitoArtista | null | undefined): string {
  if (!ambito) return '—'
  return AMBITO_LABELS[ambito] ?? ambito
}

export function parseDirittiAttivi(diritti: Json | null | undefined): string[] {
  if (!diritti) return []
  if (Array.isArray(diritti)) {
    return diritti.map((d) => String(d)).filter(Boolean)
  }
  if (typeof diritti === 'object') {
    return Object.keys(diritti as Record<string, unknown>)
  }
  return []
}

export function formatDirittiCompact(diritti: Json | null | undefined, maxVisible = 2): {
  labels: string[]
  remaining: number
  total: number
} {
  const all = parseDirittiAttivi(diritti)
  return {
    labels: all.slice(0, maxVisible),
    remaining: Math.max(0, all.length - maxVisible),
    total: all.length,
  }
}

export function shouldShowFineMandato(stato: string | null | undefined): boolean {
  return stato === 'cessato' || stato === 'sospeso'
}
