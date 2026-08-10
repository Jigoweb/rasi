import {
  formatIndividuazioniForExport,
  buildIndividuazioneExportFileName,
  uniqueZipEntryName,
} from './individuazioni-export.service'

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

describe('buildIndividuazioneExportFileName', () => {
  it('sanitizes campaign name for filesystem-safe export names', () => {
    expect(buildIndividuazioneExportFileName('Mozart / Sky UNO', 'abc')).toMatch(
      /^individuazioni_Mozart___Sky_UNO_\d{4}-\d{2}-\d{2}$/
    )
  })
})

describe('uniqueZipEntryName', () => {
  it('keeps the first name and suffixes duplicates', () => {
    const used = new Set<string>()
    expect(uniqueZipEntryName('campagna_a', used)).toBe('campagna_a.xlsx')
    expect(uniqueZipEntryName('campagna_a.xlsx', used)).toBe('campagna_a_2.xlsx')
    expect(uniqueZipEntryName('campagna_a', used)).toBe('campagna_a_3.xlsx')
  })
})
