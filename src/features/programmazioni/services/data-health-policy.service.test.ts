import {
  getDataHealthPolicyFromConfig,
  getFieldsForHealthCounts,
  getMissingFieldFilter,
  getProgrammazioniTableColumns,
  inferDataHealthPreset,
  resolveDataHealthPolicy,
} from './data-health-policy.service'

describe('data health policy', () => {
  it('infers linear preset for broadcast emitters', () => {
    expect(inferDataHealthPreset('tv_generalista', 'RAI')).toBe('lineare')
    expect(inferDataHealthPreset('tv_tematica', 'RAI Storia')).toBe('lineare')
    expect(inferDataHealthPreset('pay_tv', 'Sky')).toBe('lineare')
  })

  it('infers streaming presets from type and explicit name hints', () => {
    expect(inferDataHealthPreset('streaming', 'Netflix')).toBe('svod')
    expect(inferDataHealthPreset('streaming', 'Rakuten TVOD')).toBe('tvod')
  })

  it('resolves preset defaults and per-field overrides', () => {
    const summary = resolveDataHealthPolicy({
      preset: 'svod',
      fields: {
        views: 'required',
        durata_minuti: 'not_applicable',
      },
    })

    const byKey = new Map(summary.fields.map(field => [field.key, field.status]))
    expect(byKey.get('titolo')).toBe('required')
    expect(byKey.get('data_trasmissione')).toBe('not_applicable')
    expect(byKey.get('views')).toBe('required')
    expect(byKey.get('durata_minuti')).toBe('not_applicable')
  })

  it('sanitizes unknown config values and falls back to inferred preset', () => {
    const policy = getDataHealthPolicyFromConfig(
      {
        data_health: {
          preset: 'bogus',
          fields: {
            titolo: 'recommended',
            nope: 'required',
            durata_minuti: 'bogus',
          },
        },
      },
      'streaming',
      'Netflix'
    )

    expect(policy.preset).toBe('svod')
    expect(policy.fields).toEqual({ titolo: 'recommended' })
  })

  it('counts only required and recommended fields', () => {
    const fields = getFieldsForHealthCounts({
      preset: 'lineare',
      fields: {
        titolo: 'optional',
        data_trasmissione: 'not_applicable',
        canale: 'required',
      },
    })

    expect(fields.map(field => field.key)).toContain('canale')
    expect(fields.map(field => field.key)).not.toContain('titolo')
    expect(fields.map(field => field.key)).not.toContain('data_trasmissione')
  })

  it('tracks episodic fields for SVOD coverage without provider-specific transforms', () => {
    const fields = getFieldsForHealthCounts({ preset: 'svod' }).map(field => field.key)
    expect(fields).toContain('titolo_episodio_originale')
    expect(fields).toContain('numero_episodio')
    expect(fields).not.toContain('numero_stagione')
  })

  it('uses blank-aware missing filter for text fields', () => {
    const [titleField] = resolveDataHealthPolicy({ preset: 'lineare' }).fields
      .filter(field => field.key === 'titolo')
    expect(getMissingFieldFilter(titleField)).toBe('titolo.is.null,titolo.eq.')
  })

  it('derives compact table columns from the resolved health preset', () => {
    expect(getProgrammazioniTableColumns({ preset: 'lineare' }).map(column => column.key)).toEqual([
      'processato',
      'data_trasmissione',
      'ora_inizio',
      'canale',
      'titolo',
      'titolo_originale',
      'tipo',
      'durata_minuti',
      'titolo_episodio',
      'titolo_episodio_originale',
      'numero_stagione',
      'numero_episodio',
      'anno',
      'regia',
    ])

    expect(getProgrammazioniTableColumns({ preset: 'tvod' }).map(column => column.key)).toEqual([
      'processato',
      'titolo',
      'titolo_originale',
      'tipo',
      'titolo_episodio',
      'titolo_episodio_originale',
      'numero_stagione',
      'numero_episodio',
      'anno',
      'regia',
      'sales_month',
      'views',
      'retail_price',
      'total_revenue',
    ])

    expect(getProgrammazioniTableColumns({ preset: 'svod' }).map(column => column.key)).toEqual([
      'processato',
      'titolo',
      'titolo_originale',
      'tipo',
      'durata_minuti',
      'titolo_episodio',
      'titolo_episodio_originale',
      'numero_stagione',
      'numero_episodio',
      'anno',
      'regia',
      'views',
      'total_net_ad_revenue',
    ])
  })

  it('always includes matching signal columns in the profile view', () => {
    const columns = getProgrammazioniTableColumns({ preset: 'lineare' }).map(column => column.key)
    expect(columns).toEqual(expect.arrayContaining([
      'titolo',
      'titolo_originale',
      'anno',
      'regia',
      'titolo_episodio',
      'titolo_episodio_originale',
      'numero_stagione',
      'numero_episodio',
    ]))
  })

  it('can expose all supported table columns for troubleshooting', () => {
    const columns = getProgrammazioniTableColumns({ preset: 'svod' }, { showAll: true }).map(column => column.key)
    expect(columns).toContain('data_trasmissione')
    expect(columns).toContain('ora_inizio')
    expect(columns).toContain('total_net_ad_revenue')
    expect(columns).toContain('titolo_episodio_originale')
    expect(columns).toContain('numero_episodio')
    expect(columns).toContain('titolo_originale')
    expect(columns).toContain('regia')
  })
})
