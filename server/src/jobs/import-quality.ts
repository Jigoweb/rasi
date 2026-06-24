import {
  normalizeEpisodeSignals,
  type EpisodeNormalizationWarningCode,
} from './episode-normalization.js'

export const IMPORT_QUALITY_REPORT_VERSION = 1

export type ImportQualityWarningCode =
  | 'year_out_of_range'
  | 'duration_placeholder'
  | 'duration_out_of_scale'
  | 'mojibake_suspected'
  | 'type_non_canonical'
  | 'non_work_row_suspected'
  | EpisodeNormalizationWarningCode

export interface ImportQualityWarning {
  code: ImportQualityWarningCode
  field: string
  message: string
}

export interface ImportQualityAssessment {
  warnings: ImportQualityWarning[]
}

export interface ImportQualitySummary {
  [key: string]: unknown
  version: typeof IMPORT_QUALITY_REPORT_VERSION
  totalRows: number
  rowsWithWarnings: number
  warningCounts: Partial<Record<ImportQualityWarningCode, number>>
}

const MIN_YEAR = 1888
const MAX_FUTURE_YEARS = 2
const DURATION_PLACEHOLDERS = new Set([0, 1])
const MAX_REASONABLE_DURATION_MINUTES = 1000
const MOJIBAKE_RX = /Ã|â€/
const CANONICAL_TYPE_ALIASES = new Set([
  'film',
  'movie',
  'feature',
  'serie',
  'serie tv',
  'serie_tv',
  'series',
  'episode',
  'tv',
])
const ADMINISTRATIVE_TITLE_RX = /\banica\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b/i
const PRODUCTION_COMPANY_RX = /\b(entertainment|productions?|studios?|pictures|media|films?)\b/i

export function assessProgrammazioneImportQuality(
  row: Record<string, unknown>
): ImportQualityAssessment {
  const warnings: ImportQualityWarning[] = []

  const anno = toFiniteNumber(row.anno)
  const maxYear = new Date().getFullYear() + MAX_FUTURE_YEARS
  if (anno !== null && (anno < MIN_YEAR || anno > maxYear)) {
    warnings.push({
      code: 'year_out_of_range',
      field: 'anno',
      message: `Anno fuori range plausibile (${MIN_YEAR}-${maxYear})`,
    })
  }

  const durata = toFiniteNumber(row.durata_minuti)
  if (durata !== null && DURATION_PLACEHOLDERS.has(durata)) {
    warnings.push({
      code: 'duration_placeholder',
      field: 'durata_minuti',
      message: 'Durata placeholder o non informativa',
    })
  } else if (durata !== null && durata > MAX_REASONABLE_DURATION_MINUTES) {
    warnings.push({
      code: 'duration_out_of_scale',
      field: 'durata_minuti',
      message: 'Durata fuori scala: possibile valore in secondi o millisecondi',
    })
  }

  const mojibakeField = findFirstMojibakeField(row)
  if (mojibakeField) {
    warnings.push({
      code: 'mojibake_suspected',
      field: mojibakeField,
      message: 'Possibile mojibake cp1252/utf-8 non riparato',
    })
  }

  const tipo = normalizeText(row.tipo)
  if (tipo && !CANONICAL_TYPE_ALIASES.has(tipo)) {
    warnings.push({
      code: 'type_non_canonical',
      field: 'tipo',
      message: 'Tipo contenuto non canonico per il matching',
    })
  }

  if (isLikelyNonWorkTitle(row.titolo)) {
    warnings.push({
      code: 'non_work_row_suspected',
      field: 'titolo',
      message: 'Titolo compatibile con riga amministrativa o non-opera',
    })
  }

  const episodeAssessment = normalizeEpisodeSignals(row)
  for (const code of episodeAssessment.warnings) {
    warnings.push({
      code,
      field: getEpisodeWarningField(code, episodeAssessment.sourceFields),
      message: getEpisodeWarningMessage(code),
    })
  }

  return { warnings }
}

export function summarizeImportQuality(rows: Record<string, unknown>[]): ImportQualitySummary {
  const warningCounts: Partial<Record<ImportQualityWarningCode, number>> = {}
  let rowsWithWarnings = 0

  for (const row of rows) {
    const assessment = assessProgrammazioneImportQuality(row)
    if (assessment.warnings.length > 0) rowsWithWarnings += 1
    for (const warning of assessment.warnings) {
      warningCounts[warning.code] = (warningCounts[warning.code] ?? 0) + 1
    }
  }

  return {
    version: IMPORT_QUALITY_REPORT_VERSION,
    totalRows: rows.length,
    rowsWithWarnings,
    warningCounts,
  }
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const numberValue = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  return Number.isFinite(numberValue) ? numberValue : null
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim().toLowerCase()
}

function findFirstMojibakeField(row: Record<string, unknown>): string | null {
  for (const field of ['titolo', 'titolo_originale', 'regia', 'titolo_episodio', 'titolo_episodio_originale']) {
    const value = row[field]
    if (typeof value === 'string' && MOJIBAKE_RX.test(value)) return field
  }
  return null
}

function isLikelyNonWorkTitle(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const title = value.trim()
  if (!title) return false
  if (ADMINISTRATIVE_TITLE_RX.test(title)) return true

  const words = title.split(/\s+/)
  const productionCompanyHits = words.filter(word => PRODUCTION_COMPANY_RX.test(word)).length
  return title.length > 40 && productionCompanyHits >= 2
}

function getEpisodeWarningField(code: EpisodeNormalizationWarningCode, sourceFields: string[]): string {
  if (code === 'episode_packed_number_detected') return 'numero_episodio'
  if (code === 'episode_range_requires_review') return sourceFields[0] ?? 'titolo_episodio_originale'
  if (code === 'episode_season_mismatch') return 'numero_stagione'
  return sourceFields[0] ?? 'titolo_episodio_originale'
}

function getEpisodeWarningMessage(code: EpisodeNormalizationWarningCode): string {
  const messages: Record<EpisodeNormalizationWarningCode, string> = {
    episode_packed_number_detected: 'Numero episodio compatto rilevato e normalizzabile',
    episode_title_embedded_detected: 'Titolo episodio incorporato in un campo testuale',
    episode_range_requires_review: 'Range o multiplo episodio da revisionare manualmente',
    episode_season_mismatch: 'Stagione inferita da titolo e numero episodio non coerenti',
  }
  return messages[code]
}
