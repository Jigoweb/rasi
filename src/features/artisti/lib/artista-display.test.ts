import {
  codicePaeseTokenOr,
  deriveAmbitoFromDiritti,
  formatAmbitoLabel,
  formatDirittiCompact,
  parseDirittiAttivi,
  resolveAmbito,
  shouldShowFineMandato,
} from './artista-display'

describe('artista-display', () => {
  describe('formatAmbitoLabel', () => {
    it('maps known ambiti', () => {
      expect(formatAmbitoLabel('musica')).toBe('Musica')
      expect(formatAmbitoLabel('cinema')).toBe('Audiovisivo')
      expect(formatAmbitoLabel('entrambi')).toBe('Interdisciplinare')
    })

    it('returns dash for nullish', () => {
      expect(formatAmbitoLabel(null)).toBe('—')
      expect(formatAmbitoLabel(undefined)).toBe('—')
    })
  })

  describe('parseDirittiAttivi', () => {
    it('parses array of strings', () => {
      expect(parseDirittiAttivi(['Art. 84', 'Art. 73'])).toEqual(['Art. 84', 'Art. 73'])
    })

    it('parses object keys', () => {
      expect(parseDirittiAttivi({ ART_84: true, ART_73: false })).toEqual(['ART_84', 'ART_73'])
    })

    it('returns empty for null', () => {
      expect(parseDirittiAttivi(null)).toEqual([])
    })
  })

  describe('formatDirittiCompact', () => {
    it('truncates with remaining count', () => {
      expect(formatDirittiCompact(['a', 'b', 'c'], 2)).toEqual({
        labels: ['a', 'b'],
        remaining: 1,
        total: 3,
      })
    })
  })

  describe('deriveAmbitoFromDiritti', () => {
    it('maps AU-only rights to musica', () => {
      expect(deriveAmbitoFromDiritti(['Art. 73 - AU - BR BROADCASTING', 'Art. 15 - ALL - PP PUBLIC PERFORMANCE'])).toBe('musica')
    })

    it('maps AV-only rights to cinema (audiovisivo)', () => {
      expect(deriveAmbitoFromDiritti(['Art 84 comma 2 - AV - BR BROADCASTING'])).toBe('cinema')
    })

    it('maps both markers to interdisciplinare', () => {
      expect(deriveAmbitoFromDiritti([
        'Art. 73 - AU - BR BROADCASTING',
        'Art 84 comma 2 - AV - BR BROADCASTING',
      ])).toBe('entrambi')
    })

    it('does not treat AL or ALL as musica', () => {
      expect(deriveAmbitoFromDiritti([
        'Art. 72, comma 1, lett. c) Art. 80, comma 2, lett. f) - AL - LLE LENDING',
        'ALL (Tutti i diritti)',
      ])).toBeNull()
    })

    it('prefers a stored ambito over derived rights', () => {
      expect(resolveAmbito('musica', ['Art 84 comma 2 - AV - BR BROADCASTING'])).toBe('musica')
      expect(resolveAmbito(null, ['Art 84 comma 2 - AV - BR BROADCASTING'])).toBe('cinema')
    })
  })

  describe('codicePaeseTokenOr', () => {
    it('matches a code only as a slash-separated token', () => {
      expect(codicePaeseTokenOr('fra')).toBe(
        'codice_paese.eq.FRA,codice_paese.like.FRA/%,codice_paese.like.%/FRA,codice_paese.like.%/FRA/%',
      )
    })

    it('also matches the legacy 2-letter token for Spagna, Giappone and Romania', () => {
      expect(codicePaeseTokenOr('ESP')).toContain('codice_paese.eq.ES')
      expect(codicePaeseTokenOr('JPN')).toContain('codice_paese.like.%/JP/%')
      expect(codicePaeseTokenOr('ROU')).toContain('codice_paese.eq.RO')
    })

    it('rejects codes that could widen the like pattern', () => {
      expect(() => codicePaeseTokenOr('FR%')).toThrow('codice_paese_non_valido')
    })
  })

  describe('shouldShowFineMandato', () => {
    it('is true for cessato and sospeso', () => {
      expect(shouldShowFineMandato('cessato')).toBe(true)
      expect(shouldShowFineMandato('sospeso')).toBe(true)
      expect(shouldShowFineMandato('attivo')).toBe(false)
      expect(shouldShowFineMandato(null)).toBe(false)
    })
  })
})
