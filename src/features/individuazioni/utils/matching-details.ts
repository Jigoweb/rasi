export type MatchingDetailRecord = Record<string, unknown>
export type SignalTone = 'ok' | 'warning' | 'risk' | 'neutral'

export interface ReviewAlert {
  tone: SignalTone
  title: string
  description?: string
}

export interface ReviewFact {
  label: string
  value: string
}

export interface MatchingSignal {
  key: string
  label: string
  tone: SignalTone
  summary: string
  detail?: string
  points?: string
}

export interface MatchingReviewContext {
  alerts: ReviewAlert[]
  transmission: ReviewFact[]
  catalog: ReviewFact[]
  signals: MatchingSignal[]
  scoreSummary?: {
    total: string
    threshold: string
    method?: string
  }
}

export interface BuildMatchingReviewContextInput {
  stato?: string | null
  punteggioMatching?: number | null
  metodo?: string | null
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
  snapshotCanale?: string | null
  snapshotTipo?: string | null
  artistaDisplay?: string | null
  ruoloDisplay?: string | null
  operaTitolo?: string | null
  operaTitoloOriginale?: string | null
  operaTipo?: string | null
  operaAnno?: number | null
  operaRegisti?: string[] | null
  operaStatoValidazione?: string | null
  episodioStagione?: number | null
  episodioNumero?: number | null
  episodioTitolo?: string | null
  dettagliMatching?: MatchingDetailRecord | null
}

const MATCH_SOURCE_LABELS: Record<string, string> = {
  titolo: 'titolo programmazione',
  titolo_originale: 'titolo originale programmazione',
  titolo_originale_opera: 'titolo originale opera',
  titolo_originale_programmazione: 'titolo originale programmazione',
  alias_titoli: 'alias in catalogo',
}

export function buildMatchingReviewContext(input: BuildMatchingReviewContextInput): MatchingReviewContext {
  const dettagli = input.dettagliMatching ?? {}
  const titolo = asRecord(dettagli.titolo)
  const titoloOriginale = asRecord(dettagli.titolo_originale)
  const anno = asRecord(dettagli.anno)
  const regia = asRecord(dettagli.regia)
  const episodio = asRecord(dettagli.episodio)
  const totale = asRecord(dettagli.totale)
  const episodeFallback = asRecord(dettagli.episode_normalization_fallback)

  const transmission = compactFacts([
    { label: 'Titolo', value: input.snapshotTitolo },
    { label: 'Titolo originale', value: input.snapshotTitoloOriginale },
    { label: 'Trasmissione', value: formatTransmission(input.snapshotDataTrasmissione, input.snapshotOraInizio, input.snapshotOraFine) },
    { label: 'Canale', value: input.snapshotCanale },
    { label: 'Tipo', value: input.snapshotTipo },
    { label: 'Anno', value: formatOptionalNumber(input.snapshotAnno) },
    { label: 'Regia', value: input.snapshotRegia },
    { label: 'Episodio', value: formatEpisode(input.snapshotStagione, input.snapshotEpisodio, input.snapshotTitoloEpisodio) },
  ])

  const catalog = compactFacts([
    { label: 'Opera', value: input.operaTitolo },
    { label: 'Titolo originale', value: input.operaTitoloOriginale },
    { label: 'Tipo', value: input.operaTipo },
    { label: 'Anno produzione', value: formatOptionalNumber(input.operaAnno) },
    { label: 'Registi', value: input.operaRegisti?.length ? input.operaRegisti.join(', ') : null },
    { label: 'Validazione opera', value: input.operaStatoValidazione },
    { label: 'Episodio in catalogo', value: formatEpisode(input.episodioStagione, input.episodioNumero, input.episodioTitolo) },
    { label: 'Artista', value: input.artistaDisplay },
    { label: 'Ruolo', value: input.ruoloDisplay },
  ])

  const signals = buildMatchingSignals({ titolo, titoloOriginale, anno, regia, episodio, totale, dettagli })
  const alerts = buildReviewAlerts({
    stato: input.stato,
    punteggioMatching: input.punteggioMatching,
    dettagli,
    totale,
    episodeFallback,
    signals,
  })

  const totalScore = readNumber(totale.score)
  const threshold = readNumber(totale.soglia_applicata)

  return {
    alerts,
    transmission,
    catalog,
    signals,
    scoreSummary: totalScore != null ? {
      total: formatScore(totalScore),
      threshold: threshold != null ? formatScore(threshold) : '-',
      method: input.metodo || undefined,
    } : undefined,
  }
}

function buildReviewAlerts(input: {
  stato?: string | null
  punteggioMatching?: number | null
  dettagli: MatchingDetailRecord
  totale: MatchingDetailRecord
  episodeFallback: MatchingDetailRecord
  signals: MatchingSignal[]
}): ReviewAlert[] {
  const alerts: ReviewAlert[] = []

  if (input.stato === 'dubbioso') {
    alerts.push({
      tone: 'warning',
      title: 'In coda di revisione',
      description: 'Il motore ha marcato questo match come da verificare manualmente.',
    })
  }

  if (input.dettagli.episodio_mancante === true || input.totale.episodio_mancante === true) {
    alerts.push({
      tone: 'warning',
      title: 'Episodio non trovato in catalogo',
      description: 'Il match è stato proposto a livello serie: controlla stagione/episodio prima di validare.',
    })
  }

  if (input.episodeFallback.confidence === 'review_required') {
    alerts.push({
      tone: 'warning',
      title: 'Numerazione episodio da verificare',
      description: 'La normalizzazione dell\'episodio richiede conferma umana.',
    })
  }

  const riskySignals = input.signals.filter(signal => signal.tone === 'risk')
  for (const signal of riskySignals) {
    alerts.push({
      tone: 'risk',
      title: signal.summary,
      description: signal.detail,
    })
  }

  const normalizedScore = normalizePercent(input.punteggioMatching)
  if (normalizedScore != null && normalizedScore < 70 && alerts.length === 0) {
    alerts.push({
      tone: 'warning',
      title: 'Match con confidenza bassa',
      description: `Punteggio complessivo ${Math.round(normalizedScore)}%: conviene verificare titolo, anno ed episodio.`,
    })
  }

  if (alerts.length === 0) {
    alerts.push({
      tone: 'ok',
      title: 'Nessun alert specifico',
      description: 'Non risultano criticità tracciate oltre allo stato corrente.',
    })
  }

  return dedupeAlerts(alerts)
}

function buildMatchingSignals(input: {
  titolo: MatchingDetailRecord
  titoloOriginale: MatchingDetailRecord
  anno: MatchingDetailRecord
  regia: MatchingDetailRecord
  episodio: MatchingDetailRecord
  totale: MatchingDetailRecord
  dettagli: MatchingDetailRecord
}): MatchingSignal[] {
  const signals: MatchingSignal[] = []

  if (Object.keys(input.titolo).length > 0) {
    const similarity = readNumber(input.titolo.score)
    const source = typeof input.titolo.match_source === 'string' ? input.titolo.match_source : null
    const matchedProg = typeof input.titolo.match_programmazione === 'string' ? input.titolo.match_programmazione : null
    const matchedOpera = typeof input.titolo.match_opera === 'string' ? input.titolo.match_opera : null
    const aliasScore = readNumber(input.titolo.score_alias)

    signals.push({
      key: 'titolo',
      label: 'Titolo',
      tone: getSimilarityTone(similarity),
      summary: source
        ? `Allineamento via ${formatMatchSource(source)}`
        : 'Allineamento titolo',
      detail: matchedProg && matchedOpera
        ? `"${matchedProg}" ↔ "${matchedOpera}"`
        : undefined,
      points: formatPoints(input.titolo.score, '/50'),
    })

    if (aliasScore != null && aliasScore > 0) {
      signals.push({
        key: 'alias',
        label: 'Alias',
        tone: 'neutral',
        summary: 'Contributo da alias titolo in catalogo',
        points: formatPoints(aliasScore, '/50'),
      })
    }
  }

  if (Object.keys(input.titoloOriginale).length > 0) {
    const similarity = readNumber(input.titoloOriginale.score)
    signals.push({
      key: 'titolo_originale',
      label: 'Titolo originale',
      tone: getSimilarityTone(similarity, 60),
      summary: similarity != null && similarity >= 60
        ? 'Titolo originale coerente'
        : 'Titolo originale poco allineato',
      points: formatPoints(input.titoloOriginale.score, '/10'),
    })
  }

  if (Object.keys(input.anno).length > 0) {
    const diff = readNumber(input.anno.differenza)
    const hardScarto = input.anno.hard_scarto === true
    const fonte = typeof input.anno.fonte === 'string' ? input.anno.fonte : 'opera'
    signals.push({
      key: 'anno',
      label: 'Anno',
      tone: hardScarto ? 'risk' : diff != null && diff > 0 ? 'warning' : 'ok',
      summary: hardScarto
        ? 'Anno fuori tolleranza'
        : diff === 0
          ? `Anno allineato (${formatValue(input.anno.programmazione)})`
          : `Anno con scostamento ${diff ?? '?'} anni`,
      detail: `Riferimento ${fonte}: ${formatValue(input.anno.riferimento ?? input.anno.opera)}`,
      points: formatPoints(input.anno.score, '/15'),
    })
  }

  if (Object.keys(input.regia).length > 0) {
    const penalita = input.regia.penalita === true || readNumber(input.regia.score) != null && readNumber(input.regia.score)! < 0
    const bestMatch = typeof input.regia.best_match === 'string' ? input.regia.best_match : null
    signals.push({
      key: 'regia',
      label: 'Regia',
      tone: penalita ? 'risk' : 'ok',
      summary: penalita
        ? 'Regia presente ma non coerente'
        : bestMatch
          ? `Regia coerente con ${bestMatch}`
          : 'Regia valutata',
      detail: typeof input.regia.programmazione === 'string'
        ? `Programmazione: ${input.regia.programmazione}`
        : undefined,
      points: formatPoints(input.regia.score, '/10'),
    })
  }

  if (input.dettagli.episodio_mancante === true || input.totale.episodio_mancante === true) {
    signals.push({
      key: 'episodio',
      label: 'Episodio',
      tone: 'warning',
      summary: 'Episodio non risolto nel catalogo',
      detail: 'Attribuzione proposta a livello serie.',
      points: formatPoints(input.episodio.score, '/15'),
    })
  } else if (Object.keys(input.episodio).length > 0) {
    const season = readNumber(input.episodio.prog_stagione)
    const episode = readNumber(input.episodio.prog_episodio)
    signals.push({
      key: 'episodio',
      label: 'Episodio',
      tone: 'ok',
      summary: `Episodio risolto ${formatEpisode(season, episode, typeof input.episodio.prog_titolo_ep === 'string' ? input.episodio.prog_titolo_ep : null)}`,
      points: formatPoints(input.episodio.score, '/15'),
    })
  } else if (input.totale.is_serie === true && input.totale.has_episode_data !== true) {
    signals.push({
      key: 'episodio',
      label: 'Episodio',
      tone: 'neutral',
      summary: 'Serie senza dati episodio specifici',
      detail: 'Il match non ha usato discriminante episodio.',
    })
  }

  return signals
}

function dedupeAlerts(alerts: ReviewAlert[]): ReviewAlert[] {
  const seen = new Set<string>()
  return alerts.filter(alert => {
    const key = `${alert.tone}:${alert.title}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function compactFacts(facts: Array<{ label: string; value: string | null | undefined }>): ReviewFact[] {
  return facts
    .filter(fact => fact.value != null && String(fact.value).trim() !== '' && fact.value !== '-')
    .map(fact => ({ label: fact.label, value: String(fact.value) }))
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

function formatOptionalNumber(value?: number | null) {
  return value == null ? null : String(value)
}

function formatEpisode(season?: number | null, episode?: number | null, title?: string | null) {
  const hasCode = season != null || episode != null
  if (!hasCode && !title) return null
  const code = hasCode ? `S${season ?? '?'}E${episode ?? '?'}` : null
  if (code && title) return `${code} · ${title}`
  return code || title || null
}

function formatTransmission(
  date?: string | null,
  start?: string | null,
  end?: string | null
) {
  const parts: string[] = []
  if (date) parts.push(new Date(date).toLocaleDateString('it-IT'))
  if (start || end) parts.push(`${formatTime(start)} - ${formatTime(end)}`)
  return parts.length > 0 ? parts.join(' · ') : null
}

function formatTime(value?: string | null) {
  if (!value) return '-'
  return value.substring(0, 5)
}

function formatMatchSource(source: string) {
  return MATCH_SOURCE_LABELS[source] || source.replace(/_/g, ' ')
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizePercent(score?: number | null): number | null {
  if (score == null || Number.isNaN(score)) return null
  return score > 1 ? score : score * 100
}

function formatScore(score: number) {
  return `${Math.round(score > 1 ? score : score * 100)}%`
}

function formatPoints(score: unknown, suffix: string) {
  const numeric = readNumber(score)
  if (numeric == null) return undefined
  return `${Math.round(numeric)}${suffix}`
}

function getSimilarityTone(score: number | null, warningThreshold = 70): SignalTone {
  if (score == null) return 'neutral'
  if (score >= warningThreshold) return 'ok'
  if (score >= 50) return 'warning'
  return 'risk'
}
