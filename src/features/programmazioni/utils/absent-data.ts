// src/features/programmazioni/utils/absent-data.ts
/**
 * Marcatori globali di "dato assente" per l'import programmazioni.
 *
 * Convenzioni universali (N.D., N/A, null, trattino) che indicano un valore
 * mancante nei file degli emittenti. Vengono normalizzate a cella vuota su
 * TUTTE le colonne di TUTTI gli emittenti, in fase di apply del mapping.
 *
 * Match su cella intera, trimmed, case-insensitive — mai su sottostringa.
 * La cella vuota/whitespace NON è qui: resta gestita da `coerce`.
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
