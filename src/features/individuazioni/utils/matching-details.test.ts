import { buildMatchingReviewContext } from './matching-details'

describe('matching-details', () => {
  it('builds a readable review context with alerts, facts and signals', () => {
    const context = buildMatchingReviewContext({
      stato: 'dubbioso',
      punteggioMatching: 66,
      metodo: 'automatico',
      snapshotTitolo: 'Stranger Things',
      snapshotAnno: 2017,
      snapshotStagione: 2,
      snapshotEpisodio: 8,
      snapshotTitoloEpisodio: 'Chapter Eight',
      snapshotDataTrasmissione: '2026-06-23',
      snapshotOraInizio: '21:10:00',
      snapshotOraFine: '22:40:00',
      artistaDisplay: 'Mario Rossi',
      ruoloDisplay: 'Attore',
      operaTitolo: 'Stranger Things',
      operaAnno: 2016,
      episodioStagione: 2,
      episodioNumero: 8,
      episodioTitolo: 'Chapter Eight: The Mind Flayer',
      dettagliMatching: {
        titolo: {
          score: 45,
          match_source: 'titolo',
          match_programmazione: 'Stranger Things',
          match_opera: 'Stranger Things',
        },
        anno: {
          score: 10.5,
          programmazione: 2017,
          riferimento: 2016,
          differenza: 1,
          fonte: 'opera',
        },
        totale: {
          score: 66,
          soglia_applicata: 25,
          is_serie: true,
          has_episode_data: true,
          episodio_applicato: true,
        },
      },
    })

    expect(context.alerts.some(alert => alert.title === 'In coda di revisione')).toBe(true)
    expect(context.transmission.find(fact => fact.label === 'Titolo')?.value).toBe('Stranger Things')
    expect(context.catalog.find(fact => fact.label === 'Artista')?.value).toBe('Mario Rossi')
    expect(context.signals.some(signal => signal.label === 'Titolo')).toBe(true)
    expect(context.scoreSummary).toEqual({
      total: '66%',
      threshold: '25%',
      method: 'automatico',
    })
  })

  it('surfaces episode-missing alerts in plain language', () => {
    const context = buildMatchingReviewContext({
      stato: 'dubbioso',
      snapshotTitolo: 'Serie X',
      operaTitolo: 'Serie X',
      dettagliMatching: {
        episodio_mancante: true,
        totale: {
          score: 58,
          soglia_applicata: 25,
          episodio_mancante: true,
        },
      },
    })

    expect(context.alerts.some(alert => alert.title === 'Episodio non trovato in catalogo')).toBe(true)
    expect(context.signals.some(signal => signal.summary.includes('Episodio non risolto'))).toBe(true)
  })
})
