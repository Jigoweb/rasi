import {
  getDataHealthPolicyFromConfig,
  getFieldsForHealthCounts,
  getMissingFieldFilter,
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

  it('uses blank-aware missing filter for text fields', () => {
    const [titleField] = resolveDataHealthPolicy({ preset: 'lineare' }).fields
      .filter(field => field.key === 'titolo')
    expect(getMissingFieldFilter(titleField)).toBe('titolo.is.null,titolo.eq.')
  })
})
