import {
  validateParserConfig,
  migrateLegacyMapping,
  type ParserConfigV2,
} from './parser-config'

describe('validateParserConfig', () => {
  it('accepts valid v2 config', () => {
    const cfg: ParserConfigV2 = {
      version: 2,
      file_type: 'csv',
      delimiter: ',',
      encoding: 'utf-8',
      header_row: 0,
      data_start_row: 1,
      colonne_rilevate: ['titolo', 'durata'],
      fields: { titolo: 'titolo', durata: 'durata_minuti' },
      transforms: { durata: 'seconds_to_minutes' },
    }
    expect(validateParserConfig(cfg)).toEqual({ valid: true, errors: [] })
  })

  it('rejects unknown transform', () => {
    const cfg: any = {
      version: 2,
      file_type: 'csv',
      header_row: 0,
      data_start_row: 1,
      colonne_rilevate: [],
      fields: { durata: 'durata_minuti' },
      transforms: { durata: 'never_heard_of_this' },
    }
    const r = validateParserConfig(cfg)
    expect(r.valid).toBe(false)
    expect(r.errors.join(' ')).toMatch(/unknown transform/i)
  })

  it('rejects missing required fields', () => {
    const r = validateParserConfig({ version: 2 } as any)
    expect(r.valid).toBe(false)
    expect(r.errors.length).toBeGreaterThan(0)
  })
})

describe('migrateLegacyMapping', () => {
  it('converts legacy mapping_import to parser_config v2', () => {
    const legacy = {
      version: 1,
      colonne_rilevate: ['titolo', 'durata'],
      ultimo_upload: '2024-01-01',
      mapping: { titolo: 'titolo', durata: 'durata_minuti' },
    }
    const v2 = migrateLegacyMapping(legacy)
    expect(v2!.version).toBe(2)
    expect(v2!.fields).toEqual({ titolo: 'titolo', durata: 'durata_minuti' })
    expect(v2!.transforms).toEqual({})
    expect(v2!.file_type).toBe('auto')
  })

  it('returns null for null/undefined input', () => {
    expect(migrateLegacyMapping(null)).toBeNull()
    expect(migrateLegacyMapping(undefined)).toBeNull()
  })
})
