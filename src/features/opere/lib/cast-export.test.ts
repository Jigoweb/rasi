import { buildCastExportRows, castExportFileName } from './cast-export'

describe('buildCastExportRows', () => {
  it('merges RASI and external cast, ordered by episode, RASI first', () => {
    const rows = buildCastExportRows(
      [
        {
          personaggio: 'Il medico',
          note: 'nota',
          artisti: { nome: 'Mario', cognome: 'Rossi', nome_arte: null, codice_ipn: 'IPN1' },
          ruoli_tipologie: { nome: 'Protagonista' },
          episodi: { numero_stagione: 1, numero_episodio: 2, titolo_episodio: 'Due' },
        },
      ],
      [
        { nome: 'Anna Verdi', personaggio: null, primarieta: 'comprimario', ruolo: 'doppiatore', episodio_id: 'e2' },
        { nome: 'Luca Neri', personaggio: 'Il capo', primarieta: 'primario', episodio_id: null },
      ],
      [{ id: 'e2', numero_stagione: 1, numero_episodio: 2, titolo_episodio: 'Due' }],
    )

    expect(rows.map((row) => [row.Tipo, row.Nome, row.Stagione, row.Episodio])).toEqual([
      ['Esterno', 'Luca Neri', '', ''],
      ['RASI', 'Mario Rossi', 1, 2],
      ['Esterno', 'Anna Verdi', 1, 2],
    ])
    expect(rows[0].Ruolo).toBe('Attore primario')
    const withTipologia = buildCastExportRows(
      [],
      [{ nome: 'Giulia Bianchi', personaggio: null, primarieta: 'comprimario', ruolo: 'attore', ruoloNome: 'Protagonista Primario', episodio_id: null }],
    )
    expect(withTipologia[0].Ruolo).toBe('Protagonista Primario')
    expect(rows[2].Ruolo).toBe('Doppiatore comprimario')
    expect(rows[1]).toEqual(expect.objectContaining({ 'Codice IPN': 'IPN1', Ruolo: 'Protagonista', Note: 'nota' }))
  })
})

describe('castExportFileName', () => {
  it('builds a safe file name', () => {
    expect(castExportFileName('La città è mia!', new Date('2026-10-13T10:00:00Z'))).toBe('cast_La_citta_e_mia_2026-10-13.xlsx')
  })
})
