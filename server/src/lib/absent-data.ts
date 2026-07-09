// server/src/lib/absent-data.ts
/**
 * Marcatori globali di "dato assente" per l'import programmazioni (worker).
 * Copia server del modulo client `src/features/programmazioni/utils/absent-data.ts`
 * (build separata: `server/src` non importa da `src/`).
 *
 * Match su cella intera, trimmed, case-insensitive — mai su sottostringa.
 */
export const ABSENT_MARKERS: ReadonlySet<string> = new Set([
  'n/a', 'na',
  'n.d.', 'n.d', 'nd',
  'null',
  '-', '--',
])

/** True se il valore raw è un marcatore di dato assente (match cella intera). */
export function isAbsentMarker(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return ABSENT_MARKERS.has(value.trim().toLowerCase())
}

/**
 * True se il valore è "vuoto o assente": null/undefined, cella vuota/whitespace,
 * oppure un marcatore di dato assente. Implementazione unica del blank-check usato
 * dal coalesce delle regole e degli slot anno (evita set duplicati che divergono).
 */
export function isBlankValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (String(value).trim() === '') return true
  return isAbsentMarker(value)
}
