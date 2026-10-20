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

export type PaeseCatalogo = { codice: string; nome: string }

/**
 * Codici paese presenti in `codice_paese` (token separati da `/`),
 * con il nome del catalogo quando esiste. I codici assenti dal catalogo restano selezionabili.
 */
export function paesiOptionsInUso(
  valori: Array<string | null | undefined>,
  catalogo: PaeseCatalogo[],
): PaeseCatalogo[] {
  const nomi = new Map<string, string>()
  for (const voce of catalogo) {
    const codice = voce.codice.trim().toUpperCase()
    if (!codice || nomi.has(codice)) continue
    nomi.set(codice, voce.nome)
  }

  const presenti = new Set<string>()
  for (const valore of valori) {
    if (!valore) continue
    for (const parte of valore.split('/')) {
      const codice = parte.trim().toUpperCase()
      if (codice) presenti.add(codice)
    }
  }

  return [...presenti]
    .map((codice) => ({ codice, nome: nomi.get(codice) ?? codice }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it') || a.codice.localeCompare(b.codice, 'it'))
}

export function formatPaeseOption(paese: PaeseCatalogo): string {
  if (paese.nome === paese.codice) return paese.codice
  return `${paese.nome} (${paese.codice})`
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
  return stato === 'cessato' || stato === 'sospeso' || stato === 'deceduto'
}

export type StatoIscrizione = Database['public']['Enums']['stato_iscrizione']

export const STATO_LABELS: Record<StatoIscrizione, string> = {
  attivo: 'Attivo',
  minorenne: 'Minorenne',
  sospeso: 'Sospeso',
  cessato: 'Cessato',
  deceduto: 'Deceduto',
}

export const STATO_OPTIONS = Object.keys(STATO_LABELS) as StatoIscrizione[]

export function formatStatoLabel(stato: string | null | undefined): string {
  if (!stato) return '—'
  return STATO_LABELS[stato as StatoIscrizione] ?? stato
}

export type TipoReferente = 'tutore' | 'erede'

/** Minorenne → tutori legali, deceduto → eredi. */
export function tipoReferentePerStato(stato: string | null | undefined): TipoReferente | null {
  if (stato === 'minorenne') return 'tutore'
  if (stato === 'deceduto') return 'erede'
  return null
}
