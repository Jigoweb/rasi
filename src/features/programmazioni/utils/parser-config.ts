import { TRANSFORMS, type TransformName } from './transforms'

export type FileType = 'csv' | 'tsv' | 'xlsx' | 'xls' | 'txt_fixed' | 'auto'

export interface ParserConfigV2 {
  version: 2
  file_type: FileType
  encoding?: 'utf-8' | 'utf-8-sig' | 'latin-1' | 'cp1252'
  delimiter?: string
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

export function validateParserConfig(cfg: any): ValidationResult {
  const errors: string[] = []
  if (!cfg || typeof cfg !== 'object') {
    return { valid: false, errors: ['parser_config must be an object'] }
  }
  if (cfg.version !== 2) errors.push('version must be 2')
  if (typeof cfg.file_type !== 'string') errors.push('file_type required')
  if (typeof cfg.header_row !== 'number') errors.push('header_row required')
  if (typeof cfg.data_start_row !== 'number') errors.push('data_start_row required')
  if (!Array.isArray(cfg.colonne_rilevate)) errors.push('colonne_rilevate must be array')
  if (typeof cfg.fields !== 'object' || cfg.fields === null) errors.push('fields must be object')
  if (typeof cfg.transforms !== 'object' || cfg.transforms === null) errors.push('transforms must be object')

  if (cfg.transforms && typeof cfg.transforms === 'object') {
    for (const [col, t] of Object.entries(cfg.transforms)) {
      if (!(t as string in TRANSFORMS)) {
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
