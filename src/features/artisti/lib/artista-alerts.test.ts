import { addYears, computeArtistaAlerts, etaAnni } from './artista-alerts'

describe('addYears', () => {
  it('handles leap day like Postgres intervals', () => {
    expect(addYears('2008-02-29', 18)).toBe('2026-02-28')
    expect(addYears('2008-03-10', 18)).toBe('2026-03-10')
  })
})

describe('etaAnni', () => {
  it('counts completed years only', () => {
    expect(etaAnni('1946-10-13', '2026-10-12')).toBe(79)
    expect(etaAnni('1946-10-12', '2026-10-12')).toBe(80)
  })
})

describe('computeArtistaAlerts', () => {
  const oggi = '2026-10-12'
  const tipi = (input: Parameters<typeof computeArtistaAlerts>[0]) =>
    computeArtistaAlerts(input, oggi).map((alert) => alert.tipo)

  it('flags expired and expiring documents within 60 days', () => {
    expect(tipi({ documento_data_scadenza: '2026-10-11' })).toEqual(['documento_scaduto'])
    expect(tipi({ documento_data_scadenza: '2026-12-11' })).toEqual(['documento_in_scadenza'])
    expect(tipi({ documento_data_scadenza: '2026-12-12' })).toEqual([])
  })

  it('warns one month before the 18th birthday', () => {
    expect(tipi({ data_nascita: '2008-11-12' })).toEqual(['maggiore_eta'])
    expect(tipi({ data_nascita: '2008-11-13' })).toEqual([])
    expect(tipi({ data_nascita: '2008-10-12' })).toEqual(['maggiore_eta'])
  })

  it('asks to update the stato of an adult still marked minorenne', () => {
    expect(tipi({ data_nascita: '2008-01-01', stato: 'minorenne' })).toEqual(['minorenne_da_aggiornare'])
    expect(tipi({ data_nascita: '2008-01-01', stato: 'attivo' })).toEqual([])
  })

  it('flags artists aged 80 or more', () => {
    const alerts = computeArtistaAlerts({ data_nascita: '1940-05-01' }, oggi)
    expect(alerts).toEqual([expect.objectContaining({ tipo: 'over_80', label: '86 anni' })])
    expect(tipi({ data_nascita: '1946-10-13' })).toEqual([])
  })

  it('skips deceased and ceased artists', () => {
    expect(tipi({ data_nascita: '1940-05-01', stato: 'deceduto', documento_data_scadenza: '2020-01-01' })).toEqual([])
    expect(tipi({ data_nascita: '1940-05-01', stato: 'cessato' })).toEqual([])
  })
})
