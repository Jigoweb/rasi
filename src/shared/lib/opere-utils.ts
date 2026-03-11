/**
 * Utility per la logica opere/episodi.
 * Separa "tipo opera" (film, serie_tv, animazione) da "ha episodi".
 */

export const TIPO_OPERA_LABELS: Record<string, string> = {
  film: 'Film',
  serie_tv: 'Serie TV',
  animazione: 'Animazione',
} as const

export type TipoOpera = 'film' | 'serie_tv' | 'animazione'

export type TipoOperaValues = typeof TIPO_OPERA_LABELS

/**
 * Determina se un'opera ha episodi.
 * Usa la colonna has_episodes quando disponibile, altrimenti fallback da tipo (migrazione).
 */
export function operaHaEpisodi(opera: {
  has_episodes?: boolean
  tipo?: string | null
}): boolean {
  if (typeof opera.has_episodes === 'boolean') return opera.has_episodes
  // Fallback durante migrazione: serie_tv e animazione possono avere episodi
  return ['serie_tv', 'animazione'].includes((opera.tipo || '').toLowerCase())
}
