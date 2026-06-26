export type EpisodeNormalizationConfidence = 'none' | 'medium' | 'high' | 'review_required'

export type EpisodeNormalizationStrategy =
  | 'existing_season'
  | 'existing_episode'
  | 'existing_episode_title'
  | 'broadcaster_episode_code'
  | 'packed_episode_number'
  | 'textual_season_episode'
  | 'absolute_episode_number'
  | 'quoted_episode_title'
  | 'colon_episode_title'
  | 'season_from_program_title'

export type EpisodeNormalizationWarningCode =
  | 'episode_packed_number_detected'
  | 'episode_title_embedded_detected'
  | 'episode_range_requires_review'
  | 'episode_season_mismatch'
  | 'episode_compound_number_requires_review'

export interface EpisodeNormalizationResult {
  season: number | null
  episode: number | null
  episodeTitle: string | null
  confidence: EpisodeNormalizationConfidence
  strategies: EpisodeNormalizationStrategy[]
  warnings: EpisodeNormalizationWarningCode[]
  sourceFields: string[]
  original: Record<string, unknown>
}

const MAX_SEASON = 50
const MAX_EPISODE = 200

const RANGE_PATTERNS = [
  /\b(?:episodes?|episodi?|eps?)\.?\s*\d{1,3}\s*[-/]\s*\d{1,3}\b/i,
  /\bs\d{1,2}\s*e\d{1,3}\s*[-/]\s*e?\d{1,3}\b/i,
]

const SEASON_EPISODE_PATTERNS = [
  /\bs(?:t)?\.?\s*(\d{1,2})\s*e(?:p(?:isode)?)?\.?\s*(\d{1,3})\b/i,
  /\b(\d{1,2})\s*x\s*(\d{1,3})\b/i,
  /\b(?:season|stagione|t)\s*(\d{1,2})\D{0,20}(?:episode|episodio|ep|e)\.?\s*(\d{1,3})\b/i,
]

const ABSOLUTE_EPISODE_RX = /\b(?:episode|episodio|ep)\.?\s*(\d{1,3})\b/i
const SEASON_IN_TITLE_RX = /\b(?:season|stagione)\s*(\d{1,2})\b/i

export function normalizeEpisodeSignals(row: Record<string, unknown>): EpisodeNormalizationResult {
  const strategies: EpisodeNormalizationStrategy[] = []
  const warnings: EpisodeNormalizationWarningCode[] = []
  const sourceFields = new Set<string>()
  const original = snapshotOriginal(row)

  let season = toPositiveInteger(row.numero_stagione)
  const rawEpisode = toPositiveInteger(row.numero_episodio)
  let episode = isCanonicalEpisodeNumber(rawEpisode, season) ? rawEpisode : null
  let episodeTitle = normalizeEpisodeTitle(row.titolo_episodio)

  if (season !== null) {
    strategies.push('existing_season')
    sourceFields.add('numero_stagione')
  }
  if (rawEpisode !== null && episode === null) {
    sourceFields.add('numero_episodio')
  } else if (episode !== null) {
    strategies.push('existing_episode')
    sourceFields.add('numero_episodio')
  }
  if (episodeTitle) {
    strategies.push('existing_episode_title')
    sourceFields.add('titolo_episodio')
  }

  const searchableText = buildSearchableText(row)
  if (RANGE_PATTERNS.some(pattern => pattern.test(searchableText))) {
    warnings.push('episode_range_requires_review')
    return buildResult(null, null, episodeTitle, 'review_required', strategies, warnings, sourceFields, original)
  }

  const textSignal = extractTextualSeasonEpisode(searchableText)
  if (textSignal) {
    season = season ?? textSignal.season
    episode = shouldReplaceEpisodeWithCanonical(episode) ? textSignal.episode : episode
    strategies.push('textual_season_episode')
    addTextSourceFields(row, sourceFields)
  }

  const packedSignal = extractPackedSeasonEpisode(row.numero_episodio)
  if (packedSignal) {
    const inferredSeason = inferSeasonFromTitles(row)
    if (inferredSeason !== null && inferredSeason !== packedSignal.season) {
      warnings.push('episode_season_mismatch')
    }

    season = season ?? packedSignal.season
    episode = packedSignal.episode
    strategies.push('packed_episode_number')
    warnings.push('episode_packed_number_detected')
    sourceFields.add('numero_episodio')
  }

  if (rawEpisode !== null && episode === null && !packedSignal) {
    strategies.push('broadcaster_episode_code')
    warnings.push('episode_compound_number_requires_review')
    sourceFields.add('numero_episodio')
  }

  if (season === null) {
    const inferredSeason = inferSeasonFromTitles(row)
    if (inferredSeason !== null && episode !== null) {
      season = inferredSeason
      strategies.push('season_from_program_title')
      sourceFields.add('titolo')
    }
  }

  if (episode === null) {
    const absolute = extractAbsoluteEpisode(searchableText)
    if (absolute !== null) {
      episode = absolute
      strategies.push('absolute_episode_number')
      addTextSourceFields(row, sourceFields)
    }
  }

  if (!episodeTitle) {
    const extractedTitle = extractEmbeddedEpisodeTitle(row)
    if (extractedTitle) {
      episodeTitle = extractedTitle.title
      strategies.push(extractedTitle.strategy)
      warnings.push('episode_title_embedded_detected')
      sourceFields.add(extractedTitle.sourceField)
    }
  }

  const confidence = resolveConfidence(season, episode, episodeTitle, warnings)
  return buildResult(season, episode, episodeTitle, confidence, strategies, warnings, sourceFields, original)
}

export function applyEpisodeNormalizationToPayload<T extends Record<string, unknown>>(payload: T): T & Record<string, unknown> {
  const result = normalizeEpisodeSignals(payload)
  const mutablePayload = payload as Record<string, unknown>
  if (result.confidence === 'high') {
    if (result.season !== null) mutablePayload.numero_stagione = result.season
    if (result.episode !== null) mutablePayload.numero_episodio = result.episode
    if (result.episodeTitle && !mutablePayload.titolo_episodio) mutablePayload.titolo_episodio = result.episodeTitle
  }

  if (result.confidence !== 'none') {
    mutablePayload.metadati_trasmissione = {
      ...(isRecord(mutablePayload.metadati_trasmissione) ? mutablePayload.metadati_trasmissione : {}),
      episode_normalization: result,
    }
  }

  return mutablePayload as T & Record<string, unknown>
}

function buildResult(
  season: number | null,
  episode: number | null,
  episodeTitle: string | null,
  confidence: EpisodeNormalizationConfidence,
  strategies: EpisodeNormalizationStrategy[],
  warnings: EpisodeNormalizationWarningCode[],
  sourceFields: Set<string>,
  original: Record<string, unknown>
): EpisodeNormalizationResult {
  return {
    season,
    episode,
    episodeTitle,
    confidence,
    strategies: [...new Set(strategies)],
    warnings: [...new Set(warnings)],
    sourceFields: [...sourceFields],
    original,
  }
}

function snapshotOriginal(row: Record<string, unknown>): Record<string, unknown> {
  return {
    numero_stagione: row.numero_stagione,
    numero_episodio: row.numero_episodio,
    titolo_episodio: row.titolo_episodio,
    titolo_episodio_originale: row.titolo_episodio_originale,
    titolo: row.titolo,
    titolo_originale: row.titolo_originale,
  }
}

function resolveConfidence(
  season: number | null,
  episode: number | null,
  episodeTitle: string | null,
  warnings: EpisodeNormalizationWarningCode[]
): EpisodeNormalizationConfidence {
  if (
    warnings.includes('episode_range_requires_review') ||
    warnings.includes('episode_season_mismatch') ||
    warnings.includes('episode_compound_number_requires_review')
  ) {
    return 'review_required'
  }
  if (season !== null && episode !== null) return 'high'
  if (episode !== null || episodeTitle) return 'medium'
  return 'none'
}

function extractPackedSeasonEpisode(value: unknown): { season: number; episode: number } | null {
  const numberValue = toPositiveInteger(value)
  if (numberValue === null || numberValue < 1001 || numberValue > 9999) return null
  const season = Math.floor(numberValue / 1000)
  const episode = numberValue % 1000
  if (season < 1 || season > MAX_SEASON || episode < 1 || episode > MAX_EPISODE) return null
  return { season, episode }
}

function isCanonicalEpisodeNumber(episode: number | null, season: number | null): boolean {
  if (episode === null) return false
  if (episode <= MAX_EPISODE) return true
  return season !== null && episode <= MAX_EPISODE
}

function extractTextualSeasonEpisode(text: string): { season: number; episode: number } | null {
  for (const pattern of SEASON_EPISODE_PATTERNS) {
    const match = text.match(pattern)
    if (!match) continue
    const season = toPositiveInteger(match[1])
    const episode = toPositiveInteger(match[2])
    if (isValidSeasonEpisode(season, episode)) return { season, episode: episode as number }
  }
  return null
}

function extractAbsoluteEpisode(text: string): number | null {
  const match = text.match(ABSOLUTE_EPISODE_RX)
  const episode = match ? toPositiveInteger(match[1]) : null
  return episode !== null && episode <= MAX_EPISODE ? episode : null
}

function inferSeasonFromTitles(row: Record<string, unknown>): number | null {
  const title = toText(row.titolo)
  if (!title) return null

  const explicitSeason = title.match(SEASON_IN_TITLE_RX)
  if (explicitSeason) return toPositiveInteger(explicitSeason[1])

  const original = toText(row.titolo_originale)
  if (!original) return null

  const suffixMatch = title.match(new RegExp(`^${escapeRegExp(original.trim())}\\s+(\\d{1,2})$`, 'i'))
  return suffixMatch ? toPositiveInteger(suffixMatch[1]) : null
}

function extractEmbeddedEpisodeTitle(row: Record<string, unknown>): {
  title: string
  strategy: EpisodeNormalizationStrategy
  sourceField: string
} | null {
  for (const field of ['titolo_episodio_originale', 'titolo_episodio'] as const) {
    const value = toText(row[field])
    if (!value) continue

    const quoted = [...value.matchAll(/["“”]([^"“”]+)["“”]/g)].at(-1)?.[1]
    const quotedTitle = normalizeEpisodeTitle(quoted)
    if (quotedTitle) return { title: quotedTitle, strategy: 'quoted_episode_title', sourceField: field }

    const colonPart = value.split(':').at(-1)
    const colonTitle = normalizeEpisodeTitle(colonPart)
    if (colonTitle && colonTitle !== normalizeEpisodeTitle(value) && !/^season\s+\d+$/i.test(colonTitle)) {
      return { title: colonTitle, strategy: 'colon_episode_title', sourceField: field }
    }
  }
  return null
}

function normalizeEpisodeTitle(value: unknown): string | null {
  const text = toText(value)
  if (!text) return null
  const normalized = toTitleCase(text.replace(/^["“”]+|["“”]+$/g, '').trim())
  return normalized ? capitalizeTitleAfterSeparators(normalized) : null
}

function buildSearchableText(row: Record<string, unknown>): string {
  return [
    row.titolo,
    row.titolo_originale,
    row.titolo_episodio,
    row.titolo_episodio_originale,
  ].map(toText).filter(Boolean).join(' ')
}

function addTextSourceFields(row: Record<string, unknown>, sourceFields: Set<string>) {
  for (const field of ['titolo', 'titolo_originale', 'titolo_episodio', 'titolo_episodio_originale']) {
    if (toText(row[field])) sourceFields.add(field)
  }
}

function shouldReplaceEpisodeWithCanonical(episode: number | null): boolean {
  return episode === null || episode >= 1001
}

function isValidSeasonEpisode(season: number | null, episode: number | null): season is number {
  return season !== null && episode !== null && season >= 1 && season <= MAX_SEASON && episode >= 1 && episode <= MAX_EPISODE
}

function toPositiveInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const numberValue = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isInteger(numberValue) || numberValue <= 0) return null
  return numberValue
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\xa0/g, ' ').trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toTitleCase(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(word => word.toLowerCase().replace(/(?:^|(?<=[-("'`]))\S/g, char => char.toUpperCase()))
    .join(' ')
}

function capitalizeTitleAfterSeparators(value: string): string {
  return value.replace(/([:?!]\s+)([a-z])/g, (_match, separator: string, letter: string) => {
    return `${separator}${letter.toUpperCase()}`
  })
}
