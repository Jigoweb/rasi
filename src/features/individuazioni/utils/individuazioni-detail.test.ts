import {
  getMatchScoreBand,
  getStatusDisplay,
  normalizeIndividuazioneDetailStats,
  normalizeIndividuazioneStatus,
  normalizeMatchScore,
} from './individuazioni-detail'

describe('individuazioni detail utils', () => {
  it('normalizes legacy UI statuses to database statuses', () => {
    expect(normalizeIndividuazioneStatus('in_revisione')).toBe('dubbioso')
    expect(normalizeIndividuazioneStatus('rifiutato')).toBe('respinto')
    expect(getStatusDisplay('dubbioso')).toEqual({ label: 'In revisione', tone: 'yellow' })
    expect(getStatusDisplay('respinto')).toEqual({ label: 'Respinto', tone: 'red' })
  })

  it('normalizes score scales and assigns quality bands', () => {
    expect(normalizeMatchScore(0.92)).toBe(92)
    expect(normalizeMatchScore(82)).toBe(82)
    expect(getMatchScoreBand(95)).toBe('high')
    expect(getMatchScoreBand(75)).toBe('medium')
    expect(getMatchScoreBand(0.52)).toBe('low')
  })

  it('normalizes rpc payload keys and defaults missing metrics', () => {
    const stats = normalizeIndividuazioneDetailStats({
      coverage: {
        programmazioni_totali: 10,
        programmazioni_con_match: 7,
        copertura_percentuale: 70,
      },
      outcomes: {
        totale: 12,
        dubbiosi: 3,
      },
      catalog: {
        artisti_distinti: 4,
        ruolo_principale: { nome: 'Attore', count: 8 },
      },
    })

    expect(stats.coverage.programmazioniTotali).toBe(10)
    expect(stats.coverage.programmazioniConMatch).toBe(7)
    expect(stats.outcomes.dubbiosi).toBe(3)
    expect(stats.quality.matchBassi).toBe(0)
    expect(stats.catalog.ruoloPrincipale).toEqual({ nome: 'Attore', count: 8 })
  })
})
