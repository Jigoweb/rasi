import { formatOraAttivita, tempoRelativo } from './dashboard-home.types'

describe('dashboard activity time helpers', () => {
  it('formats absolute Italian datetime', () => {
    const formatted = formatOraAttivita('2026-10-07T14:05:00.000Z')
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    expect(formatted).toMatch(/\d{2}:\d{2}/)
  })

  it('returns relative labels for recent timestamps', () => {
    const now = Date.now()
    expect(tempoRelativo(new Date(now - 30_000).toISOString())).toBe('adesso')
    expect(tempoRelativo(new Date(now - 5 * 60_000).toISOString())).toBe('5 min fa')
  })
})
