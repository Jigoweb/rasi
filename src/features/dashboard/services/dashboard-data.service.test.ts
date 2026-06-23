import {
  normalizeDashboardRpcPayload,
  loadDashboardHealthData,
  loadDashboardPrimaryData,
  loadDashboardSecondaryData,
  type DashboardDataDeps,
} from './dashboard-data.service'

const deps = (overrides: Partial<DashboardDataDeps> = {}): DashboardDataDeps => ({
  countActiveArtisti: jest.fn().mockResolvedValue(10),
  countOpere: jest.fn().mockResolvedValue(20),
  countEpisodi: jest.fn().mockResolvedValue(5),
  countFilm: jest.fn().mockResolvedValue(12),
  countSerieTv: jest.fn().mockResolvedValue(8),
  countProgrammazioniInRange: jest.fn().mockResolvedValue(30),
  countCampagneIndividuazioneInCorso: jest.fn().mockResolvedValue(2),
  sumImportoDistribuito: jest.fn().mockResolvedValue(1000),
  countIndividuazioni: jest.fn().mockResolvedValue(200),
  countIndividuazioniValide: jest.fn().mockResolvedValue(180),
  loadRecentActivities: jest.fn().mockResolvedValue([]),
  countPartecipazioni: jest.fn().mockResolvedValue(40),
  countCampagneRipartizione: jest.fn().mockResolvedValue(3),
  loadUltimoDatoCaricato: jest.fn().mockResolvedValue('2026-06-23T10:00:00.000Z'),
  countArtistiIncompleti: jest.fn().mockResolvedValue(4),
  countOpereIncomplete: jest.fn().mockResolvedValue(6),
  countMissingArtistiFields: jest.fn().mockResolvedValue([1, 2, 3, 4, 5, 6, 7]),
  countMissingOpereFields: jest.fn().mockResolvedValue([1, 2, 3, 4, 5]),
  ...overrides,
})

describe('dashboard data service', () => {
  it('loads primary dashboard data without waiting for secondary or health queries', async () => {
    const mockedDeps = deps()

    const primary = await loadDashboardPrimaryData(mockedDeps, {
      firstDay: '2026-06-01',
      lastDay: '2026-06-30',
    })

    expect(primary.stats).toMatchObject({
      artisti_attivi: 10,
      opere_totali: 20,
      episodi_totali: 5,
      programmazioni_mese: 30,
      campagne_attive: 2,
      importo_distribuito: 1000,
      tasso_matching: 90,
    })
    expect(primary.totalArtisti).toBe(10)
    expect(primary.totalOpere).toBe(20)
    expect(primary.individuazioniTotal).toBe(200)
    expect(mockedDeps.loadRecentActivities).not.toHaveBeenCalled()
    expect(mockedDeps.countArtistiIncompleti).not.toHaveBeenCalled()
  })

  it('reuses primary individuazioni count for secondary stats', async () => {
    const mockedDeps = deps()

    const secondary = await loadDashboardSecondaryData(mockedDeps, {
      individuazioniTotal: 200,
    })

    expect(secondary.statsAggiuntive.individuazioni).toBe(200)
    expect(mockedDeps.countIndividuazioni).not.toHaveBeenCalled()
  })

  it('builds health metrics from grouped missing-field counts', async () => {
    const health = await loadDashboardHealthData(deps(), {
      totalArtisti: 10,
      totalOpere: 20,
    })

    expect(health.artistiMetrics).toHaveLength(7)
    expect(health.opereMetrics).toHaveLength(5)
    expect(health.artistiMetrics[0]).toEqual({ label: 'Codice IPN', missing: 1, total: 10 })
    expect(health.opereMetrics[0]).toEqual({ label: 'Titolo', missing: 1, total: 20 })
  })

  it('normalizes the dashboard RPC payload into page data groups', () => {
    const payload = normalizeDashboardRpcPayload({
      stats: {
        artisti_attivi: 10,
        opere_totali: 20,
        episodi_totali: 5,
        opere_film: 12,
        opere_serie_tv: 8,
        programmazioni_mese: 30,
        campagne_attive: 2,
        importo_distribuito: 1000,
        tasso_matching: 90,
      },
      totalArtisti: 10,
      totalOpere: 20,
      individuazioniTotal: 200,
      secondary: {
        attivitaRecenti: [],
        statsAggiuntive: {
          individuazioni: 200,
          partecipazioni: 40,
          campagneRipartizione: 3,
          ultimoDato: '2026-06-23T10:00:00.000Z',
        },
      },
      health: {
        artistiIncompleti: 4,
        opereIncomplete: 6,
        artistiMetrics: [{ label: 'Codice IPN', missing: 1, total: 10 }],
        opereMetrics: [{ label: 'Titolo', missing: 1, total: 20 }],
      },
    })

    expect(payload.primary.individuazioniTotal).toBe(200)
    expect(payload.secondary.statsAggiuntive.partecipazioni).toBe(40)
    expect(payload.health.artistiMetrics[0].label).toBe('Codice IPN')
  })
})
