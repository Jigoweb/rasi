import {
  buildOperaHref,
  buildProgrammazioneHref,
  formatEpisodeCode,
  getEpisodeAlertActionHint,
  getEpisodeAlertTypeLabel,
} from './episode-alerts'

describe('episode-alerts utils', () => {
  it('labels alert types for operators', () => {
    expect(getEpisodeAlertTypeLabel('catalog_episode_not_censito')).toBe('Episodio non censito')
    expect(getEpisodeAlertTypeLabel('programmazione_episode_data_invalid')).toBe('Dati episodio invalidi')
    expect(getEpisodeAlertActionHint('catalog_episode_not_censito')).toMatch(/catalogo/i)
  })

  it('formats episode codes and deep links', () => {
    expect(formatEpisodeCode(1, 4)).toBe('S1E4')
    expect(formatEpisodeCode(null, 2)).toBe('S?E2')
    expect(formatEpisodeCode(null, null)).toBeNull()
    expect(buildOperaHref('opera-1')).toBe('/dashboard/opere/opera-1')
    expect(buildOperaHref(null)).toBeNull()
    expect(buildProgrammazioneHref('camp-1', 'MOZART IN THE JUNGLE')).toBe(
      '/dashboard/programmazioni/camp-1?q=MOZART%20IN%20THE%20JUNGLE'
    )
  })
})
