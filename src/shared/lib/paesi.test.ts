import paesiJson from '../../../public/codici-paesi-iso3166-alpha3.json'
import {
  ALPHA2_TO_ALPHA3,
  CONTINENTI,
  getCodiciContinente,
  getContinente,
  normalizeCodiciPaese,
  parseCodicePaeseColumn,
} from './paesi'

describe('paesi', () => {
  it('converte alpha-2 in alpha-3 e rimuove i doppioni', () => {
    expect(parseCodicePaeseColumn('ROU/HUN/JP/JPN')).toEqual(['ROU', 'HUN', 'JPN'])
    expect(parseCodicePaeseColumn('EU/JP')).toEqual(['EU', 'JPN'])
    expect(normalizeCodiciPaese([' es', 'ESP', 'ro'])).toEqual(['ESP', 'ROU'])
    expect(parseCodicePaeseColumn(null)).toEqual([])
  })

  it('ogni paese della lista ufficiale ha un continente', () => {
    const codici = paesiJson.paesi.map(p => p.codice)
    const senzaContinente = codici.filter(codice => !getContinente(codice))
    expect(senzaContinente).toEqual([])
    const totale = CONTINENTI.reduce((sum, c) => sum + getCodiciContinente(c).length, 0)
    expect(totale).toBe(codici.length)
  })

  it('la mappa alpha-2 punta solo a codici della lista ufficiale', () => {
    const codici = new Set(paesiJson.paesi.map(p => p.codice))
    expect(Object.values(ALPHA2_TO_ALPHA3).filter(c => !codici.has(c))).toEqual([])
  })
})
