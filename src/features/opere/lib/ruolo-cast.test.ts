import {
  etichettaRuoloCast,
  idRuoloCastPredefinito,
  opzioniModificaRuoloCast,
  opzioniRuoloCast,
  primarietaDiRuolo,
  ruoloCastDaTipologia,
  ruoloDaPrimarieta,
} from './ruolo-cast'

describe('ruolo cast', () => {
  const catalogo = [
    { id: '1', codice: 'RUO_2', nome: 'Comprimario' },
    { id: '2', codice: 'RUO_5', nome: 'Direzione doppiaggio' },
    { id: '3', codice: 'RUO_1', nome: 'Primario' },
    { id: '4', codice: 'RUO_4', nome: 'Doppiatore comprimario' },
    { id: '5', codice: 'RUO_3', nome: 'Doppiatore primario' },
  ]

  it('riconosce i quattro ruoli di produzione e ignora gli altri', () => {
    expect(ruoloCastDaTipologia({ codice: 'RUO_1', nome: 'Primario' })).toBe('attore_primario')
    expect(ruoloCastDaTipologia({ codice: 'RUO_2', nome: 'Comprimario' })).toBe('attore_comprimario')
    expect(ruoloCastDaTipologia({ nome: 'Doppiatore primario' })).toBe('doppiatore_primario')
    expect(ruoloCastDaTipologia({ codice: 'RUO_5', nome: 'Direzione doppiaggio' })).toBeNull()
  })

  it('mostra le etichette richieste in scheda', () => {
    expect(etichettaRuoloCast({ codice: 'RUO_1', nome: 'Primario' })).toBe('Attore primario')
    expect(etichettaRuoloCast({ nome: 'Direzione doppiaggio' })).toBe('Direzione doppiaggio')
  })

  it('ordina solo i quattro ruoli di cast', () => {
    expect(opzioniRuoloCast(catalogo).map((ruolo) => ruolo.label)).toEqual([
      'Attore primario',
      'Attore comprimario',
      'Doppiatore primario',
      'Doppiatore comprimario',
    ])
  })

  it('tiene primario e comprimario allineati al ruolo', () => {
    expect(primarietaDiRuolo('doppiatore_primario')).toBe('primario')
    expect(primarietaDiRuolo('attore_comprimario')).toBe('comprimario')
    expect(ruoloDaPrimarieta('primario')).toBe('attore_primario')
  })

  it('riconosce i codici del seed locale', () => {
    expect(ruoloCastDaTipologia({ codice: 'PROT_PRIM', nome: 'Protagonista Primario' })).toBe('attore_primario')
    expect(ruoloCastDaTipologia({ codice: 'COMP_PRIM', nome: 'Comprimario Primario' })).toBe('attore_comprimario')
    expect(ruoloCastDaTipologia({ codice: 'DOPP_PRIM', nome: 'Doppiatore Primario' })).toBe('doppiatore_primario')
  })

  it('in modifica conserva un ruolo già assegnato fuori dai quattro', () => {
    const opzioni = opzioniModificaRuoloCast(catalogo, '2')
    expect(opzioni.map((ruolo) => ruolo.label)).toEqual([
      'Attore primario',
      'Attore comprimario',
      'Doppiatore primario',
      'Doppiatore comprimario',
      'Direzione doppiaggio',
    ])
    expect(idRuoloCastPredefinito(catalogo)).toBe('3')
  })
})