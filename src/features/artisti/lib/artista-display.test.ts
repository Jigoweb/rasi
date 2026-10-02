import {
  formatAmbitoLabel,
  formatDirittiCompact,
  parseDirittiAttivi,
  shouldShowFineMandato,
} from './artista-display'

describe('artista-display', () => {
  describe('formatAmbitoLabel', () => {
    it('maps known ambiti', () => {
      expect(formatAmbitoLabel('musica')).toBe('Musica')
      expect(formatAmbitoLabel('cinema')).toBe('Cinema')
      expect(formatAmbitoLabel('entrambi')).toBe('Entrambi')
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

  describe('shouldShowFineMandato', () => {
    it('is true for cessato and sospeso', () => {
      expect(shouldShowFineMandato('cessato')).toBe(true)
      expect(shouldShowFineMandato('sospeso')).toBe(true)
      expect(shouldShowFineMandato('attivo')).toBe(false)
      expect(shouldShowFineMandato(null)).toBe(false)
    })
  })
})
