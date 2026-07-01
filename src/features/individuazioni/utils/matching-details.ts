export type MatchingDetailRecord = Record<string, unknown>

export interface ComparisonRow {
  label: string
  programmazione: string
  catalogo: string
  highlight?: boolean
}

export interface MatchingBreakdownItem {
  key: string
  label: string
  score?: string
  details: Array<{ label: string; value: string }>
}

function asRecord(value: unknown): MatchingDetailRecord {
  return value && typeof value === 'object' ? value as MatchingDetailRecord : {}
}

function formatValue(value: unknown): string {
  if (value == null || value === '') return '-'
  if (Array.isArray(value)) return value.map(item => String(item)).join(', ')
  if (typeof value === 'boolean') return value ? 'sì' : 'no'
  if (typeof value === 'number') return String(value)
  return String(value)
}

function formatEpisodeCode(season?: number | null, episode?: number | null, title?: string | null) {
  const hasCode = season != null || episode != null
  const code = hasCode ? `S${season ?? '?'}E${episode ?? '?'}` : null
  if (code && title) return `${code} — ${title}`
  if (code) return code
  if (title) return title
  return '-'
}

export function buildMatchingComparison(input: {
  snapshotTitolo?: string | null
  snapshotTitoloOriginale?: string | null
  snapshotAnno?: number | null
  snapshotRegia?: string | null
  snapshotStagione?: number | null
  snapshotEpisodio?: number | null
  snapshotTitoloEpisodio?: string | null
  snapshotDataTrasmissione?: string | null
  snapshotOraInizio?: string | null
  snapshotOraFine?: string | null
  operaTitolo?: string | null
  operaTitoloOriginale?: string | null
  operaAnno?: number | null
  operaRegisti?: string[] | null
  episodioStagione?: number | null
  episodioNumero?: number | null
  episodioTitolo?: string | null
  dettagliMatching?: MatchingDetailRecord | null
}): ComparisonRow[] {
  const dettagli = input.dettagliMatching ?? {}
  const titoloDetails = asRecord(dettagli.titolo)
  const annoDetails = asRecord(dettagli.anno)

  const rows: ComparisonRow[] = [
    {
      label: 'Titolo',
      programmazione: input.snapshotTitolo || formatValue(titoloDetails.programmazione),
      catalogo: input.operaTitolo || formatValue(titoloDetails.opera),
      highlight: true,
    },
    {
      label: 'Titolo originale',
      programmazione: input.snapshotTitoloOriginale || '-',
      catalogo: input.operaTitoloOriginale || '-',
    },
    {
      label: 'Anno',
      programmazione: formatValue(input.snapshotAnno ?? annoDetails.programmazione),
      catalogo: formatValue(input.operaAnno ?? annoDetails.opera ?? annoDetails.riferimento),
    },
    {
      label: 'Regia',
      programmazione: input.snapshotRegia || '-',
      catalogo: input.operaRegisti?.length ? input.operaRegisti.join(', ') : '-',
    },
    {
      label: 'Episodio',
      programmazione: formatEpisodeCode(
        input.snapshotStagione,
        input.snapshotEpisodio,
        input.snapshotTitoloEpisodio
      ),
      catalogo: formatEpisodeCode(
        input.episodioStagione,
        input.episodioNumero,
        input.episodioTitolo
      ),
      highlight: dettagli.episodio_mancante === true,
    },
    {
      label: 'Trasmissione',
      programmazione: formatTransmission(
        input.snapshotDataTrasmissione,
        input.snapshotOraInizio,
        input.snapshotOraFine
      ),
      catalogo: '-',
    },
  ]

  return rows
}

export function buildMatchingBreakdown(dettagliMatching?: MatchingDetailRecord | null): MatchingBreakdownItem[] {
  if (!dettagliMatching) return []

  const sections: Array<{ key: string; label: string }> = [
    { key: 'titolo', label: 'Titolo' },
    { key: 'titolo_originale', label: 'Titolo originale' },
    { key: 'anno', label: 'Anno' },
    { key: 'regia', label: 'Regia' },
    { key: 'episodio', label: 'Episodio' },
    { key: 'totale', label: 'Totale' },
  ]

  return sections
    .map(section => {
      const record = asRecord(dettagliMatching[section.key])
      if (Object.keys(record).length === 0) return null

      const scoreValue = record.score
      const details = Object.entries(record)
        .filter(([key]) => key !== 'score')
        .map(([key, value]) => ({
          label: humanizeKey(key),
          value: formatValue(value),
        }))

      const item: MatchingBreakdownItem = {
        key: section.key,
        label: section.label,
        score: scoreValue == null ? undefined : formatValue(scoreValue),
        details,
      }
      return item
    })
    .filter((item): item is MatchingBreakdownItem => item !== null)
}

function formatTransmission(
  date?: string | null,
  start?: string | null,
  end?: string | null
) {
  const parts: string[] = []
  if (date) {
    parts.push(new Date(date).toLocaleDateString('it-IT'))
  }
  if (start || end) {
    parts.push(`${formatTime(start)} - ${formatTime(end)}`)
  }
  return parts.length > 0 ? parts.join(' · ') : '-'
}

function formatTime(value?: string | null) {
  if (!value) return '-'
  return value.substring(0, 5)
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}
