export type AttentionSeverity = 'high' | 'medium' | 'low'

export type AttentionItem = {
  id: string
  severity: AttentionSeverity
  title: string
  count: number
  href: string
  description?: string
}

export type ActivityFeedItem = {
  tipo: string
  label: string
  dettaglio: string
  timestamp: string
  href?: string
}

export type DashboardKpiValues = {
  campagneAttive: number
  tassoMatching: number | null
  programmazioniMese: number
  importoDistribuito: number
}

/** Relative Italian time label for activity timestamps. */
export function tempoRelativo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'adesso'
  if (min < 60) return `${min} min fa`
  const ore = Math.floor(min / 60)
  if (ore < 24) return `${ore} or${ore === 1 ? 'a' : 'e'} fa`
  const giorni = Math.floor(ore / 24)
  if (giorni < 30) return `${giorni} giorn${giorni === 1 ? 'o' : 'i'} fa`
  const mesi = Math.floor(giorni / 30)
  return `${mesi} mes${mesi === 1 ? 'e' : 'i'} fa`
}

export function formatImportoEur(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

export function formatMatchingPercent(rate: number | null | undefined): string {
  if (rate == null) return '—'
  return `${rate}%`
}
