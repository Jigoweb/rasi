import {
  annotateCatalogHealthMetric,
  countMetricsByImpact,
  resolveCatalogHealthPolicy,
  sortCatalogHealthMetrics,
} from './catalog-health-impact'

describe('catalog health impact', () => {
  it('marks opera titolo and anno as critical matching fields', () => {
    expect(resolveCatalogHealthPolicy({ label: 'Titolo' })?.impact).toBe('critical')
    expect(resolveCatalogHealthPolicy({ label: 'Anno produzione' })?.impact).toBe('critical')
    expect(resolveCatalogHealthPolicy({ key: 'imdb_tconst' })?.impact).toBe('matching')
  })

  it('marks artist identity vs admin fields for individuazione clarity', () => {
    expect(resolveCatalogHealthPolicy({ label: 'Nome' })?.impact).toBe('identity')
    expect(resolveCatalogHealthPolicy({ label: 'Cognome' })?.impact).toBe('identity')
    expect(resolveCatalogHealthPolicy({ label: 'Codice IPN' })?.impact).toBe('admin')
    expect(resolveCatalogHealthPolicy({ label: 'Codice fiscale' })?.impact).toBe('admin')
  })

  it('annotates metrics with impact labels and hints', () => {
    const annotated = annotateCatalogHealthMetric({
      label: 'Titolo',
      missing: 3,
      total: 20,
    })

    expect(annotated).toMatchObject({
      key: 'titolo',
      impact: 'critical',
      impactLabel: 'Critico matching',
    })
    expect(annotated.impactHint).toMatch(/obbligatorio/i)
  })

  it('sorts critical matching gaps before anagrafica', () => {
    const sorted = sortCatalogHealthMetrics([
      annotateCatalogHealthMetric({ label: 'Codice IPN', missing: 9, total: 10 }),
      annotateCatalogHealthMetric({ label: 'Titolo', missing: 2, total: 20 }),
      annotateCatalogHealthMetric({ label: 'Nome', missing: 5, total: 10 }),
    ])

    expect(sorted.map(m => m.label)).toEqual(['Titolo', 'Nome', 'Codice IPN'])
  })

  it('counts fields with critical/matching gaps', () => {
    const metrics = [
      annotateCatalogHealthMetric({ label: 'Titolo', missing: 2, total: 20 }),
      annotateCatalogHealthMetric({ label: 'Tipo', missing: 0, total: 20 }),
      annotateCatalogHealthMetric({ label: 'IMDB tconst', missing: 7, total: 20 }),
      annotateCatalogHealthMetric({ label: 'Codice IPN', missing: 9, total: 10 }),
    ]

    expect(countMetricsByImpact(metrics, ['critical', 'matching'])).toEqual({
      fieldsWithGaps: 2,
      maxMissing: 7,
    })
  })
})
