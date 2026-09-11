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
  countMissingOpereFields: jest.fn().mockResolvedValue([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
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
    })

    expect(health.artistiMetrics).toHaveLength(7)
    expect(health.opereMetrics).toHaveLength(10)
    expect(health.artistiMetrics.find(m => m.label === 'Codice IPN')).toMatchObject({
      key: 'codice_ipn',
      missing: 1,
      total: 10,
      impact: 'admin',
      impactLabel: 'Anagrafica',
    })
    expect(health.opereMetrics.find(m => m.label === 'Titolo')).toMatchObject({
      key: 'titolo',
      missing: 1,
      total: 20,
      impact: 'critical',
      impactLabel: 'Critico matching',
    })
    expect(health.opereMetrics.find(m => m.label === 'Regia')).toMatchObject({
      key: 'regista',
      missing: 6,
      total: 20,
      impact: 'matching',
      impactLabel: 'Utile matching',
    })
    expect(health.opereMetrics.find(m => m.label === 'Alias titoli')).toMatchObject({
      key: 'alias_titoli',
      missing: 7,
      total: 20,
    })
    expect(health.opereMetrics.find(m => m.label === 'Codice ISAN')).toMatchObject({
      key: 'codice_isan',
      missing: 8,
      total: 20,
    })
    expect(health.opereMetrics.find(m => m.label === 'Anno produzione fine')).toMatchObject({
      key: 'anno_produzione_fine',
      missing: 9,
      total: 8,
    })
    expect(health.opereMetrics.find(m => m.label === 'Episodi (serie TV)')).toMatchObject({
      key: 'episodi',
      missing: 10,
      total: 8,
      impact: 'matching',
    })
    expect(health.opereMetrics[0].impact).toBe('critical')
    expect(health.artistiMetrics.every(m => m.impact === 'identity' || m.impact === 'admin')).toBe(true)
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
    expect(payload.health.artistiMetrics[0]).toMatchObject({
      label: 'Codice IPN',
      impact: 'admin',
      impactLabel: 'Anagrafica',
    })
    expect(payload.health.opereMetrics[0]).toMatchObject({
      label: 'Titolo',
      impact: 'critical',
      impactLabel: 'Critico matching',
    })
  })

  it('annotates RPC opera matching fields including regia and episodes', () => {
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
      health: {
        artistiMetrics: [],
        opereMetrics: [
          { key: 'regista', label: 'Regia', missing: 4, total: 20 },
          { key: 'alias_titoli', label: 'Alias titoli', missing: 11, total: 20 },
          { key: 'codice_isan', label: 'Codice ISAN', missing: 9, total: 20 },
          { key: 'anno_produzione_fine', label: 'Anno produzione fine', missing: 3, total: 8 },
          { key: 'episodi', label: 'Episodi (serie TV)', missing: 2, total: 8 },
        ],
      },
    })

    expect(payload.health.opereMetrics.find(m => m.key === 'regista')).toMatchObject({
      impact: 'matching',
      impactLabel: 'Utile matching',
    })
    expect(payload.health.opereMetrics.find(m => m.key === 'episodi')).toMatchObject({
      missing: 2,
      total: 8,
      impact: 'matching',
    })
    expect(payload.health.opereMetrics[0].impact).toBe('matching')
  })
})
