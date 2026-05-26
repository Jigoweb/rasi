import { TRANSFORMS, type TransformName } from './transforms'

export type FileType = 'csv' | 'tsv' | 'xlsx' | 'xls' | 'txt_fixed' | 'auto'
export type ParserDelimiter = ',' | ';' | '\t' | '|' | 'auto'
export type ParserEncoding =
  | 'utf-8'
  | 'utf-8-sig'
  | 'latin-1'
  | 'cp1252'
  | 'Windows-1252'
  | 'ISO-8859-1'
  | 'ascii'
  | 'auto'

export interface FixedWidthColumn {
  /** Logical column name (matches keys in `fields`). */
  name: string
  /** 0-indexed inclusive byte offset. */
  start: number
  /** 0-indexed exclusive byte offset (end > start). */
  end: number
}

export interface ParserConfigV2 {
  version: 2
  file_type: FileType
  encoding?: ParserEncoding
  delimiter?: ParserDelimiter
  sheet_name?: string
  header_row: number
  data_start_row: number
  skip_rows?: number[]
  colonne_rilevate: string[]
  ultimo_upload?: string | null
  /** sourceColumn → templateField */
  fields: Record<string, string>
  /** sourceColumn → transform name */
  transforms: Record<string, TransformName>
  /** Source column whose value drives opera matching (overrides default of mapped `titolo`). */
  match_title_column?: string
  /** Fixed-width column spec for txt_fixed files. Mutually exclusive with delimiter. */
  fixed_width?: FixedWidthColumn[]
}

export interface LegacyMapping {
  version: 1
  colonne_rilevate: string[]
  ultimo_upload?: string | null
  mapping: Record<string, string>
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

const VALID_FILE_TYPES: readonly FileType[] = [
  'csv',
  'tsv',
  'xlsx',
  'xls',
  'txt_fixed',
  'auto',
]
const VALID_DELIMITERS: readonly ParserDelimiter[] = [',', ';', '\t', '|', 'auto']
const VALID_ENCODINGS: readonly ParserEncoding[] = [
  'utf-8',
  'utf-8-sig',
  'latin-1',
  'cp1252',
  'Windows-1252',
  'ISO-8859-1',
  'ascii',
  'auto',
]

export function validateParserConfig(cfg: any): ValidationResult {
  const errors: string[] = []
  if (!cfg || typeof cfg !== 'object') {
    return { valid: false, errors: ['parser_config must be an object'] }
  }
  if (cfg.version !== 2) errors.push('version must be 2')

  if (typeof cfg.file_type !== 'string') {
    errors.push('file_type required')
  } else if (!VALID_FILE_TYPES.includes(cfg.file_type)) {
    errors.push(`unknown file_type '${cfg.file_type}'`)
  }

  if (
    typeof cfg.header_row !== 'number' ||
    !Number.isInteger(cfg.header_row) ||
    cfg.header_row < 0
  ) {
    errors.push('header_row must be non-negative integer')
  }
  if (
    typeof cfg.data_start_row !== 'number' ||
    !Number.isInteger(cfg.data_start_row) ||
    cfg.data_start_row < 0
  ) {
    errors.push('data_start_row must be non-negative integer')
  }
  if (
    typeof cfg.header_row === 'number' &&
    typeof cfg.data_start_row === 'number' &&
    cfg.data_start_row <= cfg.header_row &&
    // Fixed-width files commonly have no header row; allow data_start_row === header_row.
    cfg.file_type !== 'txt_fixed'
  ) {
    errors.push('data_start_row must be greater than header_row')
  }

  if (cfg.delimiter !== undefined && !VALID_DELIMITERS.includes(cfg.delimiter)) {
    errors.push(`unknown delimiter '${cfg.delimiter}'`)
  }
  if (cfg.encoding !== undefined && !VALID_ENCODINGS.includes(cfg.encoding)) {
    errors.push(`unknown encoding '${cfg.encoding}'`)
  }

  if (cfg.match_title_column !== undefined && typeof cfg.match_title_column !== 'string') {
    errors.push('match_title_column must be a string')
  }

  if (cfg.fixed_width !== undefined) {
    if (!Array.isArray(cfg.fixed_width)) {
      errors.push('fixed_width must be an array')
    } else {
      const cols = cfg.fixed_width as any[]
      for (const c of cols) {
        if (
          !c ||
          typeof c !== 'object' ||
          typeof c.name !== 'string' ||
          typeof c.start !== 'number' ||
          typeof c.end !== 'number' ||
          !Number.isInteger(c.start) ||
          !Number.isInteger(c.end) ||
          c.start < 0 ||
          c.end <= c.start
        ) {
          errors.push(`fixed_width column invalid: ${JSON.stringify(c)}`)
        }
      }
      const sorted = [...cols]
        .filter(
          (c) =>
            c &&
            typeof c.start === 'number' &&
            typeof c.end === 'number' &&
            c.end > c.start,
        )
        .sort((a, b) => a.start - b.start)
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].start < sorted[i - 1].end) {
          errors.push(
            `fixed_width columns overlap: ${sorted[i - 1].name} and ${sorted[i].name}`,
          )
        }
      }
      if (cfg.delimiter !== undefined) {
        errors.push('fixed_width and delimiter are mutually exclusive')
      }
    }
  }

  if (!Array.isArray(cfg.colonne_rilevate)) errors.push('colonne_rilevate must be array')
  if (typeof cfg.fields !== 'object' || cfg.fields === null) errors.push('fields must be object')
  if (typeof cfg.transforms !== 'object' || cfg.transforms === null) {
    errors.push('transforms must be object')
  }

  if (cfg.transforms && typeof cfg.transforms === 'object') {
    for (const [col, t] of Object.entries(cfg.transforms)) {
      if (!((t as string) in TRANSFORMS)) {
        errors.push(`unknown transform '${t}' for column '${col}'`)
      }
    }
  }
  return { valid: errors.length === 0, errors }
}

export function migrateLegacyMapping(legacy: any): ParserConfigV2 | null {
  if (!legacy || typeof legacy !== 'object') return null
  return {
    version: 2,
    file_type: 'auto',
    header_row: 0,
    data_start_row: 1,
    colonne_rilevate: Array.isArray(legacy.colonne_rilevate) ? legacy.colonne_rilevate : [],
    ultimo_upload: legacy.ultimo_upload ?? null,
    fields: typeof legacy.mapping === 'object' && legacy.mapping ? legacy.mapping : {},
    transforms: {},
  }
}
