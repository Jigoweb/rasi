import { normalizeTitle, buildMatchKey, toTitleCase } from './title-normalize'

describe('toTitleCase', () => {
  it('converts ALL CAPS to Title Case', () => {
    expect(toTitleCase('MIO FRATELLO RINCORRE I DINOSAURI'))
      .toBe('Mio Fratello Rincorre I Dinosauri')
  })
  it('preserves already-cased strings', () => {
    expect(toTitleCase('Mio Fratello')).toBe('Mio Fratello')
  })
  it('returns empty string for null/undefined', () => {
    expect(toTitleCase(null as any)).toBe('')
    expect(toTitleCase(undefined as any)).toBe('')
  })
})

describe('normalizeTitle', () => {
  it('strips edition suffix [ED. 2]', () => {
    expect(normalizeTitle('8 1/2 [ED. 2]')).toBe('8 1/2')
  })
  it('strips edition suffix (ED.3)', () => {
    expect(normalizeTitle('Film X (ED.3)')).toBe('Film X')
  })
  it('strips replica marker (R)', () => {
    expect(normalizeTitle('Beautiful XXXIII (R)')).toBe('Beautiful')
  })
  it("strips replica marker (R 240')", () => {
    expect(normalizeTitle("Big Pacific (R 240')")).toBe('Big Pacific')
  })
  it('strips trailing season marker S.02', () => {
    expect(normalizeTitle('House of the Dragon S.02')).toBe('House of the Dragon')
  })
  it('strips (SEASON 4) paren marker', () => {
    expect(normalizeTitle('Astrid et Raphaelle (SEASON 4)'))
      .toBe('Astrid Et Raphaelle')
  })
  it('strips trailing roman numerals', () => {
    expect(normalizeTitle('Beautiful XXXIII')).toBe('Beautiful')
  })
  it('strips trailing Ep.NN', () => {
    expect(normalizeTitle('Gomorra Ep.01')).toBe('Gomorra')
  })
  it('normalizes typographic quotes', () => {
    expect(normalizeTitle("L'ordine del tempo")).toBe("L'ordine Del Tempo")
  })
  it('collapses whitespace', () => {
    expect(normalizeTitle('Foo    Bar   Baz')).toBe('Foo Bar Baz')
  })
  it('returns empty string for null/undefined/empty', () => {
    expect(normalizeTitle(null)).toBe('')
    expect(normalizeTitle(undefined)).toBe('')
    expect(normalizeTitle('')).toBe('')
  })
})

describe('buildMatchKey', () => {
  it('lowercases and strips articles', () => {
    expect(buildMatchKey('The Snoopy Show', 2022)).toBe('snoopy show::2022')
  })
  it('strips italian articles', () => {
    expect(buildMatchKey("La Storia Della Salvezza", 2018))
      .toBe('storia della salvezza::2018')
  })
  it('produces no year suffix when year is null', () => {
    expect(buildMatchKey('The Plane', null)).toBe('plane')
  })
  it('treats undefined year same as null', () => {
    expect(buildMatchKey('Some Title')).toBe('some title')
  })
})
