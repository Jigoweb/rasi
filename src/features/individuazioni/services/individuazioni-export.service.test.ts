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
      opere: { codice_opera: 'OP-1', titolo: 'Film Catalogo', titolo_originale: 'Catalogue Film' },
      ruoli_tipologie: { nome: 'Attore' },
      punteggio_matching: 0.91,
      stato: 'validato',
    }])).toMatchObject([{
      titolo: 'Film',
      artista: 'Mario Rossi',
      opera_matchata: 'Film Catalogo',
      opera_titolo_originale: 'Catalogue Film',
      codice_opera: 'OP-1',
      ruolo: 'Attore',
      tasso_matching: '91%',
      stato: 'validato',
    }])
  })

  it('rounds percent-scale match scores like the platform UI (not *100 again)', () => {
    expect(formatIndividuazioniForExport([{
      titolo: 'Serie',
      artisti: null,
      opere: { codice_opera: 'OP-2', titolo: 'Serie Matchata', titolo_originale: null },
      ruoli_tipologie: null,
      punteggio_matching: 26.765,
      stato: 'dubbioso',
    }])).toMatchObject([{
      opera_matchata: 'Serie Matchata',
      codice_opera: 'OP-2',
      tasso_matching: '27%',
    }])
  })

  it('exports empty opera fields when no matched work is linked', () => {
    expect(formatIndividuazioniForExport([{
      titolo: 'Sconosciuto',
      opere: null,
      punteggio_matching: null,
    }])).toMatchObject([{
      opera_matchata: '',
      opera_titolo_originale: '',
      codice_opera: '',
      tasso_matching: '',
    }])
  })

  it('exports SI/NO columns for problematic matching signals', () => {
    expect(formatIndividuazioniForExport([{
      titolo: 'Film',
      numero_episodio: 1,
      numero_stagione: 1,
      dettagli_matching: {
        titolo: { score: 40 },
        regia: { penalita: true },
        episodio_mancante: true,
      },
    }])).toMatchObject([{
      'Titolo debole': 'SI',
      'Titolo originale debole': 'NO',
      'Anno con scostamento': 'NO',
      'Anno fuori tolleranza': 'NO',
      'Regia incoerente': 'SI',
      'Episodio mancante': 'SI',
      'Episodio da verificare': 'NO',
    }])
  })

  it('exports all NO signal columns when dettagli_matching is missing', () => {
    expect(formatIndividuazioniForExport([{ titolo: 'Film' }])).toMatchObject([{
      'Titolo debole': 'NO',
      'Regia incoerente': 'NO',
      'Episodio mancante': 'NO',
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
