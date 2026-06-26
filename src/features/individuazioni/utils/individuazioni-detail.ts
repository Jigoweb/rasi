export type IndividuazioneStatus = 'individuato' | 'validato' | 'respinto' | 'dubbioso'

export type MatchScoreBand = 'high' | 'medium' | 'low' | 'unknown'

export interface IndividuazioneDetailStats {
  coverage: {
    programmazioniTotali: number
    programmazioniProcessate: number
    programmazioniConMatch: number
    programmazioniSenzaMatch: number
    coperturaPercentuale: number
  }
  outcomes: {
    totale: number
    individuati: number
    validati: number
    dubbiosi: number
    respinti: number
    sicuri: number
  }
  quality: {
    scoreMedio: number
    scoreMin: number
    scoreMax: number
    matchAlti: number
    matchMedi: number
    matchBassi: number
  }
  review: {
    daControllare: number
    dubbiosi: number
    scoreBasso: number
    episodioDaControllare: number
  }
  catalog: {
    artistiDistinti: number
    opereDistinte: number
    ruoloPrincipale: {
      nome: string
      count: number
    } | null
  }
}

export interface StatusDisplay {
  label: string
  tone: 'blue' | 'green' | 'red' | 'yellow' | 'muted'
}

export function normalizeIndividuazioneStatus(status: string | null | undefined): IndividuazioneStatus | null {
  switch (status) {
    case 'individuato':
    case 'validato':
    case 'respinto':
    case 'dubbioso':
      return status
    case 'rifiutato':
      return 'respinto'
    case 'in_revisione':
      return 'dubbioso'
    default:
      return null
  }
}

export function getStatusDisplay(status: string | null | undefined): StatusDisplay {
  switch (normalizeIndividuazioneStatus(status)) {
    case 'validato':
      return { label: 'Validato', tone: 'green' }
    case 'individuato':
      return { label: 'Individuato', tone: 'blue' }
    case 'respinto':
      return { label: 'Respinto', tone: 'red' }
    case 'dubbioso':
      return { label: 'In revisione', tone: 'yellow' }
    default:
      return { label: status || '-', tone: 'muted' }
  }
}

export function normalizeMatchScore(score: number | null | undefined): number {
  if (typeof score !== 'number' || Number.isNaN(score)) return 0
  return score > 1 ? score : score * 100
}

export function getMatchScoreBand(score: number | null | undefined): MatchScoreBand {
  const normalized = normalizeMatchScore(score)
  if (normalized <= 0) return 'unknown'
  if (normalized >= 90) return 'high'
  if (normalized >= 70) return 'medium'
  return 'low'
}

export function getMatchScoreBandLabel(band: MatchScoreBand): string {
  switch (band) {
    case 'high':
      return 'Match alti'
    case 'medium':
      return 'Match medi'
    case 'low':
      return 'Match bassi'
    case 'unknown':
      return 'Match senza score'
  }
}

export function normalizeIndividuazioneDetailStats(payload: unknown): IndividuazioneDetailStats {
  const root = asRecord(payload)
  const coverage = asRecord(root.coverage)
  const outcomes = asRecord(root.outcomes)
  const quality = asRecord(root.quality)
  const review = asRecord(root.review)
  const catalog = asRecord(root.catalog)
  const ruoloPrincipale = catalog.ruoloPrincipale ?? catalog.ruolo_principale ?? null

  return {
    coverage: {
      programmazioniTotali: toNumber(coverage.programmazioniTotali ?? coverage.programmazioni_totali),
      programmazioniProcessate: toNumber(coverage.programmazioniProcessate ?? coverage.programmazioni_processate),
      programmazioniConMatch: toNumber(coverage.programmazioniConMatch ?? coverage.programmazioni_con_match),
      programmazioniSenzaMatch: toNumber(coverage.programmazioniSenzaMatch ?? coverage.programmazioni_senza_match),
      coperturaPercentuale: toNumber(coverage.coperturaPercentuale ?? coverage.copertura_percentuale),
    },
    outcomes: {
      totale: toNumber(outcomes.totale),
      individuati: toNumber(outcomes.individuati),
      validati: toNumber(outcomes.validati),
      dubbiosi: toNumber(outcomes.dubbiosi),
      respinti: toNumber(outcomes.respinti),
      sicuri: toNumber(outcomes.sicuri),
    },
    quality: {
      scoreMedio: toNumber(quality.scoreMedio ?? quality.score_medio),
      scoreMin: toNumber(quality.scoreMin ?? quality.score_min),
      scoreMax: toNumber(quality.scoreMax ?? quality.score_max),
      matchAlti: toNumber(quality.matchAlti ?? quality.match_alti),
      matchMedi: toNumber(quality.matchMedi ?? quality.match_medi),
      matchBassi: toNumber(quality.matchBassi ?? quality.match_bassi),
    },
    review: {
      daControllare: toNumber(review.daControllare ?? review.da_controllare),
      dubbiosi: toNumber(review.dubbiosi),
      scoreBasso: toNumber(review.scoreBasso ?? review.score_basso),
      episodioDaControllare: toNumber(review.episodioDaControllare ?? review.episodio_da_controllare),
    },
    catalog: {
      artistiDistinti: toNumber(catalog.artistiDistinti ?? catalog.artisti_distinti),
      opereDistinte: toNumber(catalog.opereDistinte ?? catalog.opere_distinte),
      ruoloPrincipale: ruoloPrincipale
        ? {
            nome: String(asRecord(ruoloPrincipale).nome || '-'),
            count: toNumber(asRecord(ruoloPrincipale).count),
          }
        : null,
    },
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function toNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(numeric) ? numeric : 0
}
