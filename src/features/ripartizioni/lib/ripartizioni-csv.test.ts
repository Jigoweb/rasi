import { buildRipartizioniCsv, escapeCsvField } from './ripartizioni-csv'

describe('ripartizioni CSV export', () => {
  it('escapes commas, quotes and line breaks in names and descriptions', () => {
    const csv = buildRipartizioniCsv([
      {
        nome: 'Rossi, "Mario"',
        stato: 'calcolata',
        periodoInizio: '01/01/2026',
        periodoFine: '31/03/2026',
        importoDisponibile: 1000.5,
        descrizione: 'Nota, con "virgolette"\ne seconda riga',
      },
    ])

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv.slice(1)).toBe([
      'Nome,Stato,Periodo Inizio,Periodo Fine,Importo Disponibile,Descrizione',
      '"Rossi, ""Mario""",calcolata,01/01/2026,31/03/2026,1000.5,"Nota, con ""virgolette""\ne seconda riga"',
    ].join('\n'))
  })

  it('keeps plain values unquoted and empty optional fields blank', () => {
    const csv = buildRipartizioniCsv([
      {
        nome: 'Campagna A',
        stato: null,
        periodoInizio: '',
        periodoFine: '',
        importoDisponibile: 0,
        descrizione: null,
      },
    ])

    expect(csv.slice(1).split('\n')[1]).toBe('Campagna A,,,,0,')
    expect(escapeCsvField(null)).toBe('')
    expect(escapeCsvField('semplice')).toBe('semplice')
  })
})
