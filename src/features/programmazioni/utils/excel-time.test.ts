import { excelFractionToHHMMSS } from './excel-time'

describe('excelFractionToHHMMSS', () => {
  it('converte frazioni di giorno in HH:MM:SS', () => {
    expect(excelFractionToHHMMSS(0.25)).toBe('06:00:00')
    expect(excelFractionToHHMMSS(0)).toBe('00:00:00')
    expect(excelFractionToHHMMSS(0.004502314814814815)).toBe('00:06:29')
    expect(excelFractionToHHMMSS(0.07233796296296297)).toBe('01:44:10')
  })

  it('usa solo la parte frazionaria di un seriale datetime', () => {
    expect(excelFractionToHHMMSS(42156.25)).toBe('06:00:00')
  })

  it('restituisce null per input non finiti', () => {
    expect(excelFractionToHHMMSS(Number.NaN)).toBeNull()
    expect(excelFractionToHHMMSS(Number.POSITIVE_INFINITY)).toBeNull()
  })
})
