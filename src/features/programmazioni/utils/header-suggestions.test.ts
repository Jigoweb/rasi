import { normalizeHeader, suggestFieldForHeader, suggestMappingFromHeaders } from './header-suggestions'

describe('normalizeHeader', () => {
  it('toglie parentesi, accenti e punteggiatura', () => {
    expect(normalizeHeader('Programme Title (Episode/Film name)')).toBe('programme title')
    expect(normalizeHeader('Duration (mins)')).toBe('duration')
    expect(normalizeHeader('TV/Film')).toBe('tv film')
    expect(normalizeHeader('Numero/Anno Stagione')).toBe('numero anno stagione')
    expect(normalizeHeader('  Città  ')).toBe('citta')
  })
})

describe('suggestFieldForHeader', () => {
  it('riconosce le intestazioni note e i nomi dei campi template', () => {
    expect(suggestFieldForHeader('Episode Name')).toBe('titolo_episodio')
    expect(suggestFieldForHeader('Season Number')).toBe('numero_stagione')
    expect(suggestFieldForHeader('Episode Number')).toBe('numero_episodio')
    expect(suggestFieldForHeader('numero_episodio')).toBe('numero_episodio')
    expect(suggestFieldForHeader('Unique Identifier')).toBeNull()
    expect(suggestFieldForHeader('Timestamp Month')).toBeNull()
  })
})

describe('suggestMappingFromHeaders', () => {
  const plex = [
    'Timestamp Month', 'Unique Identifier', 'TV/Film', 'Episode Name', 'Season Number',
    'Episode Number', 'Programme Title (Episode/Film name)', 'Duration (mins)',
    'Number of Streams', 'Release Year', 'DIRECTOR',
  ]

  it('propone il mapping del file PLEX', () => {
    expect(suggestMappingFromHeaders(plex)).toEqual({
      'TV/Film': 'tipo',
      'Episode Name': 'titolo_episodio',
      'Season Number': 'numero_stagione',
      'Episode Number': 'numero_episodio',
      'Programme Title (Episode/Film name)': 'titolo',
      'Duration (mins)': 'durata_minuti',
      'Number of Streams': 'views',
      'Release Year': 'anno',
      DIRECTOR: 'regia',
    })
  })

  it('propone il mapping del tracciato Sky', () => {
    const sky = suggestMappingFromHeaders([
      'Canale', 'Titolo trasmissione', 'Titolo originale trasmissione', 'Titolo episodio',
      'Titolo originale episodio', 'Tipologia', 'Regista', 'Numero Episodio', 'Numero/Anno Stagione',
    ])
    expect(sky).toMatchObject({
      Canale: 'canale',
      'Titolo trasmissione': 'titolo',
      'Titolo originale trasmissione': 'titolo_originale',
      'Titolo episodio': 'titolo_episodio',
      'Titolo originale episodio': 'titolo_episodio_originale',
      Tipologia: 'tipo',
      Regista: 'regia',
      'Numero Episodio': 'numero_episodio',
      'Numero/Anno Stagione': 'numero_stagione',
    })
  })

  it('non sovrascrive il mapping esistente e non riusa un campo già assegnato', () => {
    const suggested = suggestMappingFromHeaders(plex, {
      'TV/Film': 'tipo',
      'Unique Identifier': 'titolo',
    })
    expect(suggested['TV/Film']).toBeUndefined()
    expect(suggested['Programme Title (Episode/Film name)']).toBeUndefined()
    expect(suggested['Episode Name']).toBe('titolo_episodio')
  })

  it('assegna un campo a una sola colonna', () => {
    expect(suggestMappingFromHeaders(['Title', 'Titolo'])).toEqual({ Title: 'titolo' })
  })
})
