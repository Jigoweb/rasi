import {
  codicePaeseTokenOr,
  deriveAmbitoFromDiritti,
  formatAmbitoLabel,
  formatDirittiCompact,
  formatPaeseOption,
  paesiOptionsInUso,
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

  describe('paesiOptionsInUso', () => {
    const catalogo = [
      { codice: 'FRA', nome: 'Francia' },
      { codice: 'DEU', nome: 'Germania' },
      { codice: 'ESP', nome: 'Spagna' },
      { codice: 'EU', nome: 'Europa (EU)' },
      { codice: 'EUROPA', nome: 'Europa' },
    ]

    it('keeps only tokens stored in codice_paese, including those in the middle of a list', () => {
      expect(paesiOptionsInUso(['ROU/FRA/ES', '  eu/jp ', null, ''], catalogo).map((p) => p.codice))
        .toEqual(['ES', 'EU', 'FRA', 'JP', 'ROU'])
    })

    it('uses the catalog label and still lists codes the catalog does not know', () => {
      const options = paesiOptionsInUso(['FRA/ES', 'EUROPA'], catalogo)
      expect(options).toEqual([
        { codice: 'ES', nome: 'ES' },
        { codice: 'EUROPA', nome: 'Europa' },
        { codice: 'FRA', nome: 'Francia' },
      ])
      expect(formatPaeseOption(options[0])).toBe('ES')
      expect(formatPaeseOption(options[1])).toBe('Europa (EUROPA)')
      expect(formatPaeseOption(options[2])).toBe('Francia (FRA)')
      expect(options.map((p) => p.codice)).not.toContain('DEU')
    })
  })

  describe('shouldShowFineMandato', () => {
    it('is true for cessato and sospeso', () => {
      expect(shouldShowFineMandato('cessato')).toBe(true)
      expect(shouldShowFineMandato('sospeso')).toBe(true)
      expect(shouldShowFineMandato('deceduto')).toBe(true)
      expect(shouldShowFineMandato('minorenne')).toBe(false)
      expect(shouldShowFineMandato('attivo')).toBe(false)
      expect(shouldShowFineMandato(null)).toBe(false)
    })
  })
})
