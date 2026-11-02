import {
  getRipartizioneStatusLabel,
  isStatoRipartizione,
  RIPARTIZIONE_STATUS_LABELS,
  RIPARTIZIONE_STATUSES,
} from './dashboard-status-vocabulary'

describe('ripartizione status vocabulary', () => {
  it('matches the database enum and its Italian labels', () => {
    expect(RIPARTIZIONE_STATUSES).toEqual([
      'pianificata',
      'calcolata',
      'approvata',
      'distribuita',
    ])
    expect(RIPARTIZIONE_STATUS_LABELS).toEqual({
      pianificata: 'Pianificata',
      calcolata: 'Calcolata',
      approvata: 'Approvata',
      distribuita: 'Distribuita',
    })
  })

  it('labels the four allowed statuses', () => {
    expect(getRipartizioneStatusLabel('pianificata')).toBe('Pianificata')
    expect(getRipartizioneStatusLabel('calcolata')).toBe('Calcolata')
    expect(getRipartizioneStatusLabel('approvata')).toBe('Approvata')
    expect(getRipartizioneStatusLabel('distribuita')).toBe('Distribuita')
    expect(isStatoRipartizione('approvata')).toBe(true)
  })

  it('renders unknown or empty statuses without throwing', () => {
    expect(getRipartizioneStatusLabel('in_corso')).toBe('in_corso')
    expect(getRipartizioneStatusLabel('completata')).toBe('completata')
    expect(getRipartizioneStatusLabel('sospesa')).toBe('sospesa')
    expect(getRipartizioneStatusLabel('annullata')).toBe('annullata')
    expect(getRipartizioneStatusLabel('<script>alert(1)</script>')).toBe(
      '<script>alert(1)</script>',
    )
    expect(getRipartizioneStatusLabel(null)).toBe('Sconosciuto')
    expect(getRipartizioneStatusLabel(undefined)).toBe('Sconosciuto')
    expect(getRipartizioneStatusLabel('   ')).toBe('Sconosciuto')
    expect(isStatoRipartizione('in_corso')).toBe(false)
  })
})
