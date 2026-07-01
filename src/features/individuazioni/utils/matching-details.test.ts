import {
  buildMatchingBreakdown,
  buildMatchingComparison,
} from './matching-details'

describe('matching-details', () => {
  it('builds side-by-side comparison rows from snapshot and catalog data', () => {
    const rows = buildMatchingComparison({
      snapshotTitolo: 'Stranger Things',
      snapshotTitoloOriginale: 'Stranger Things',
      snapshotAnno: 2017,
      snapshotRegia: 'Duffer Brothers',
      snapshotStagione: 2,
      snapshotEpisodio: 8,
      snapshotTitoloEpisodio: 'Chapter Eight',
      snapshotDataTrasmissione: '2026-06-23',
      snapshotOraInizio: '21:10:00',
      snapshotOraFine: '22:40:00',
      operaTitolo: 'Stranger Things',
      operaTitoloOriginale: 'Stranger Things',
      operaAnno: 2016,
      operaRegisti: ['Matt Duffer', 'Ross Duffer'],
      episodioStagione: 2,
      episodioNumero: 8,
      episodioTitolo: 'Chapter Eight: The Mind Flayer',
      dettagliMatching: {
        episodio_mancante: false,
      },
    })

    expect(rows.find(row => row.label === 'Titolo')).toEqual({
      label: 'Titolo',
      programmazione: 'Stranger Things',
      catalogo: 'Stranger Things',
      highlight: true,
    })
    expect(rows.find(row => row.label === 'Episodio')?.catalogo).toBe('S2E8 — Chapter Eight: The Mind Flayer')
    expect(rows.find(row => row.label === 'Trasmissione')?.programmazione).toContain('21:10')
  })

  it('builds technical breakdown sections from dettagli_matching', () => {
    const breakdown = buildMatchingBreakdown({
      titolo: {
        score: 45,
        match_source: 'titolo',
        programmazione: 'Film A',
        opera: 'Film A',
      },
      totale: {
        score: 78.5,
        soglia_applicata: 25,
        episodio_mancante: false,
      },
    })

    expect(breakdown).toHaveLength(2)
    expect(breakdown[0]).toMatchObject({
      key: 'titolo',
      label: 'Titolo',
      score: '45',
    })
    expect(breakdown[1]?.details.some(item => item.label === 'Soglia Applicata')).toBe(true)
  })
})
