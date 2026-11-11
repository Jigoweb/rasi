import { TEMPLATE_FIELDS_SET } from './coercion'

/**
 * Suggerimento del mapping a partire dalle intestazioni del file campione.
 *
 * Serve per le emittenti nuove: intestazioni come «Episode Name» o
 * «Season Number» vengono proposte già mappate. Non sostituisce mai una scelta
 * esistente: si usa solo sulle colonne non mappate e solo per campi template
 * non ancora assegnati. L'operatore può cambiare tutto dal menu.
 */

/** Intestazione normalizzata → campo template. */
const HEADER_ALIASES: ReadonlyArray<readonly [string, string]> = [
  // Titoli
  ['programme title', 'titolo'],
  ['program title', 'titolo'],
  ['title', 'titolo'],
  ['titolo', 'titolo'],
  ['titolo trasmissione', 'titolo'],
  ['titolo opera', 'titolo'],
  ['original title', 'titolo_originale'],
  ['titolo originale', 'titolo_originale'],
  ['titolo originale trasmissione', 'titolo_originale'],
  ['episode name', 'titolo_episodio'],
  ['episode title', 'titolo_episodio'],
  ['titolo episodio', 'titolo_episodio'],
  ['original episode title', 'titolo_episodio_originale'],
  ['titolo originale episodio', 'titolo_episodio_originale'],
  // Stagione ed episodio
  ['season number', 'numero_stagione'],
  ['season', 'numero_stagione'],
  ['stagione', 'numero_stagione'],
  ['numero stagione', 'numero_stagione'],
  ['numero anno stagione', 'numero_stagione'],
  ['episode number', 'numero_episodio'],
  ['episode no', 'numero_episodio'],
  ['numero episodio', 'numero_episodio'],
  // Altri campi
  ['duration', 'durata_minuti'],
  ['duration mins', 'durata_minuti'],
  ['duration minutes', 'durata_minuti'],
  ['durata', 'durata_minuti'],
  ['durata minuti', 'durata_minuti'],
  ['durata trasmissione', 'durata_minuti'],
  ['number of streams', 'views'],
  ['streams', 'views'],
  ['views', 'views'],
  ['visualizzazioni', 'views'],
  ['release year', 'anno'],
  ['year', 'anno'],
  ['anno', 'anno'],
  ['anno di produzione', 'anno'],
  ['director', 'regia'],
  ['regia', 'regia'],
  ['regista', 'regia'],
  ['tv film', 'tipo'],
  ['type', 'tipo'],
  ['tipo', 'tipo'],
  ['tipologia', 'tipo'],
  ['channel', 'canale'],
  ['channel name', 'canale'],
  ['canale', 'canale'],
  ['production', 'production'],
]

const ALIAS_MAP = new Map<string, string>(HEADER_ALIASES)

/**
 * Normalizza un'intestazione: minuscole, senza accenti, senza il testo tra
 * parentesi, solo lettere e cifre separate da uno spazio.
 * «Programme Title (Episode/Film name)» → «programme title»,
 * «Duration (mins)» → «duration», «TV/Film» → «tv film».
 */
export function normalizeHeader(header: string): string {
  return String(header)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Campo template suggerito per un'intestazione, oppure null. */
export function suggestFieldForHeader(header: string): string | null {
  const key = normalizeHeader(header)
  if (!key) return null
  const alias = ALIAS_MAP.get(key)
  if (alias) return alias
  const asField = key.replace(/ /g, '_')
  return TEMPLATE_FIELDS_SET.has(asField) ? asField : null
}

/**
 * Suggerimenti per le colonne non mappate. Ogni campo template va a una sola
 * colonna (la prima, nell'ordine del file) e i campi già usati nel mapping
 * esistente non vengono riproposti.
 */
export function suggestMappingFromHeaders(
  columns: string[],
  existing: Record<string, string> = {},
): Record<string, string> {
  const usedFields = new Set(Object.values(existing).filter(Boolean))
  const out: Record<string, string> = {}
  for (const column of columns) {
    if (existing[column]) continue
    const field = suggestFieldForHeader(column)
    if (!field || usedFields.has(field)) continue
    out[column] = field
    usedFields.add(field)
  }
  return out
}
