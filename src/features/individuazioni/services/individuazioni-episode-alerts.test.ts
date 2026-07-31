import {
  normalizeEpisodeAlerts,
  normalizeEpisodeAlertSummary,
} from './individuazioni.service'

describe('episode alert normalizers', () => {
  it('normalizes summary payload', () => {
    const summary = normalizeEpisodeAlertSummary({
      totale: 2,
      catalog_episode_not_censito: 2,
      programmazione_episode_data_invalid: 0,
      programmazioni_coinvolte: 2,
      opere_coinvolte: 1,
      topOpere: [{ titolo: 'MOZART', tipo_alert: 'catalog_episode_not_censito', count: 2 }],
    })

    expect(summary.catalogEpisodeNotCensito).toBe(2)
    expect(summary.topOpere[0]).toEqual({
      titolo: 'MOZART',
      tipoAlert: 'catalog_episode_not_censito',
      count: 2,
    })
  })

  it('normalizes alert list payload', () => {
    const alerts = normalizeEpisodeAlerts([
      {
        id: 'a1',
        tipoAlert: 'programmazione_episode_data_invalid',
        programmazioneId: 'p1',
        operaId: null,
        campagneProgrammazioneId: 'c1',
        numeroStagione: 2,
        numeroEpisodio: null,
        titolo: 'Serie X',
      },
      { titolo: 'missing-id' },
    ])

    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({
      id: 'a1',
      tipoAlert: 'programmazione_episode_data_invalid',
      numeroStagione: 2,
      numeroEpisodio: null,
      titolo: 'Serie X',
    })
  })
})
