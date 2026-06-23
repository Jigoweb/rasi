import { formatIndividuazioniForExport } from './individuazioni-export.service'

describe('formatIndividuazioniForExport', () => {
  it('formats artist and matching fields for spreadsheet export', () => {
    expect(formatIndividuazioniForExport([{
      titolo: 'Film',
      artisti: { nome: 'Mario', cognome: 'Rossi', nome_arte: '' },
      ruoli_tipologie: { nome: 'Attore' },
      punteggio_matching: 0.91,
      stato: 'validato',
    }])).toMatchObject([{
      titolo: 'Film',
      artista: 'Mario Rossi',
      ruolo: 'Attore',
      tasso_matching: '91%',
      stato: 'validato',
    }])
  })
})
