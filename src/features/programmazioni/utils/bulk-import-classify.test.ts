import { classifyBulkColumnDiff, BULK_SAFE_ABSENT_TARGETS } from './bulk-import-classify'
import type { ImportMappingConfig, UploadDecision } from '../services/import-mapping.service'

const mapping: ImportMappingConfig = {
  version: 1,
  colonne_rilevate: ['Serie Programma Sistema', 'Numero Episodio', 'Numero/Anno Stagione', 'Regista'],
  ultimo_upload: null,
  mapping: {
    'Serie Programma Sistema': 'titolo',
    'Numero Episodio': 'numero_episodio',
    'Numero/Anno Stagione': 'numero_stagione',
    Regista: 'regia',
  },
}

describe('classifyBulkColumnDiff', () => {
  it('returns ok for apply_existing and legacy_template', () => {
    expect(classifyBulkColumnDiff({ kind: 'apply_existing', mapping })).toBe('ok')
    expect(classifyBulkColumnDiff({ kind: 'legacy_template', reason: 'no_config_but_template_headers' })).toBe('ok')
  })

  it('returns error for need_wizard', () => {
    expect(classifyBulkColumnDiff({ kind: 'need_wizard', reason: 'no_config' })).toBe('error')
  })

  it('returns warning_safe when only allowlisted targets are missing', () => {
    const decision: UploadDecision = {
      kind: 'warn_format_changed',
      mapping,
      diff: {
        added: [],
        removed: ['Numero Episodio', 'Numero/Anno Stagione'],
        unchanged: ['Serie Programma Sistema', 'Regista'],
      },
      mappedRemoved: ['Numero Episodio', 'Numero/Anno Stagione'],
    }
    expect(classifyBulkColumnDiff(decision, mapping)).toBe('warning_safe')
    expect(BULK_SAFE_ABSENT_TARGETS.has('numero_episodio')).toBe(true)
  })

  it('returns error when a non-allowlisted mapped column is missing', () => {
    const decision: UploadDecision = {
      kind: 'warn_format_changed',
      mapping,
      diff: {
        added: [],
        removed: ['Regista', 'Numero Episodio'],
        unchanged: ['Serie Programma Sistema'],
      },
      mappedRemoved: ['Regista', 'Numero Episodio'],
    }
    expect(classifyBulkColumnDiff(decision, mapping)).toBe('error')
  })

  it('returns error if titolo mapping column is among mappedRemoved', () => {
    const decision: UploadDecision = {
      kind: 'warn_format_changed',
      mapping,
      diff: {
        added: [],
        removed: ['Serie Programma Sistema'],
        unchanged: [],
      },
      mappedRemoved: ['Serie Programma Sistema'],
    }
    expect(classifyBulkColumnDiff(decision, mapping)).toBe('error')
  })
})
