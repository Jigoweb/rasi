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

describe('validateParserConfig — extended encoding/delimiter/file_type', () => {
  const base = {
    version: 2,
    file_type: 'csv',
    header_row: 0,
    data_start_row: 1,
    colonne_rilevate: [],
    fields: {},
    transforms: {},
  }

  it('accepts Windows-1252 encoding', () => {
    const r = validateParserConfig({ ...base, encoding: 'Windows-1252' })
    expect(r.valid).toBe(true)
  })
  it('accepts ISO-8859-1 encoding', () => {
    expect(validateParserConfig({ ...base, encoding: 'ISO-8859-1' }).valid).toBe(true)
  })
  it('rejects unknown encoding', () => {
    const r = validateParserConfig({ ...base, encoding: 'utf-16' })
    expect(r.valid).toBe(false)
    expect(r.errors.join('|')).toMatch(/encoding/i)
  })
  it('rejects unknown file_type', () => {
    const r = validateParserConfig({ ...base, file_type: 'parquet' })
    expect(r.valid).toBe(false)
    expect(r.errors.join('|')).toMatch(/file_type/i)
  })
  it('accepts tab delimiter', () => {
    expect(validateParserConfig({ ...base, delimiter: '\t' }).valid).toBe(true)
  })
  it('rejects unknown delimiter', () => {
    const r = validateParserConfig({ ...base, delimiter: '/' })
    expect(r.valid).toBe(false)
    expect(r.errors.join('|')).toMatch(/delimiter/i)
  })
  it('rejects header_row >= data_start_row', () => {
    const r = validateParserConfig({ ...base, header_row: 5, data_start_row: 5 })
    expect(r.valid).toBe(false)
    expect(r.errors.join('|')).toMatch(/data_start_row/i)
  })
  it('rejects negative header_row', () => {
    const r = validateParserConfig({ ...base, header_row: -1, data_start_row: 0 })
    expect(r.valid).toBe(false)
  })
})

describe('validateParserConfig — match_title_column', () => {
  const base = {
    version: 2, file_type: 'xlsx', header_row: 0, data_start_row: 1,
    colonne_rilevate: ['TITOLO', 'NOME_SERIE'],
    fields: { TITOLO: 'titolo' }, transforms: {},
  }
  it('accepts string match_title_column', () => {
    expect(validateParserConfig({ ...base, match_title_column: 'NOME_SERIE' }).valid).toBe(true)
  })
  it('rejects non-string match_title_column', () => {
    expect(validateParserConfig({ ...base, match_title_column: 123 } as any).valid).toBe(false)
  })
})

describe('validateParserConfig — fixed_width', () => {
  const base = {
    version: 2, file_type: 'txt_fixed', header_row: 0, data_start_row: 0,
    colonne_rilevate: ['canale', 'titolo'],
    fields: { canale: 'canale', titolo: 'titolo' }, transforms: {},
  }
  it('accepts valid fixed_width spec', () => {
    expect(validateParserConfig({
      ...base,
      fixed_width: [
        { name: 'canale', start: 5, end: 7 },
        { name: 'titolo', start: 60, end: 120 },
      ],
    }).valid).toBe(true)
  })
  it('rejects overlapping fixed_width columns', () => {
    const r = validateParserConfig({
      ...base,
      fixed_width: [
        { name: 'a', start: 0, end: 10 },
        { name: 'b', start: 5, end: 15 },
      ],
    })
    expect(r.valid).toBe(false)
    expect(r.errors.join('|')).toMatch(/overlap/i)
  })
  it('rejects end <= start', () => {
    const r = validateParserConfig({
      ...base,
      fixed_width: [{ name: 'a', start: 10, end: 10 }],
    })
    expect(r.valid).toBe(false)
  })
  it('rejects fixed_width AND delimiter set together', () => {
    const r = validateParserConfig({
      ...base,
      delimiter: ',',
      fixed_width: [{ name: 'a', start: 0, end: 5 }],
    })
    expect(r.valid).toBe(false)
    expect(r.errors.join('|')).toMatch(/fixed_width.*delimiter|delimiter.*fixed_width/i)
  })
})
