import { validateTime, validateDate, coerce } from './coercion'

describe('validateTime', () => {
  it('normalizza HH:MM e HH:MM:SS', () => {
    expect(validateTime('9:05')).toBe('09:05:00')
    expect(validateTime('21:10:30')).toBe('21:10:30')
  })

  it('converte frazioni Excel', () => {
    expect(validateTime(0.25)).toBe('06:00:00')
    expect(validateTime(0.004502314814814815)).toBe('00:06:29')
  })

  it('rifiuta stringhe invalide tipo SheetJS 1/0/00 (non le inoltra al DB)', () => {
    expect(validateTime('1/0/00')).toBeUndefined()
    expect(validateTime('not-a-time')).toBeUndefined()
  })

  it('restituisce undefined per vuoti', () => {
    expect(validateTime(null)).toBeUndefined()
    expect(validateTime('')).toBeUndefined()
  })
})

describe('coerce ora_inizio', () => {
  it('produce HH:MM:SS validi', () => {
    expect(coerce('ora_inizio', '1:44:10')).toBe('01:44:10')
    expect(coerce('ora_inizio', 0.07233796296296297)).toBe('01:44:10')
  })

  it('non passa 1/0/00', () => {
    expect(coerce('ora_inizio', '1/0/00')).toBeUndefined()
  })
})

describe('validateDate', () => {
  it('normalizza ISO e slash', () => {
    expect(validateDate('2015-06-01')).toBe('2015-06-01')
    expect(validateDate('6/1/15')).toBe('2015-01-06')
  })
})
