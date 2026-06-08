// Jest globals — project uses Jest, not Vitest as plan suggested
import { normalizeTitle, normalizeTitleStrict, buildMatchKey, buildMatchKeyStrict, toTitleCase } from './title-normalize'

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

describe('idempotency', () => {
  it('normalizeTitle is idempotent', () => {
    for (const x of ['8 1/2 [ED. 2]', 'MIO FRATELLO', "L'ordine del tempo", 'Beautiful XXXIII (R)']) {
      expect(normalizeTitle(normalizeTitle(x))).toBe(normalizeTitle(x))
    }
  })
  it('toTitleCase is idempotent', () => {
    for (const x of ['MIO FRATELLO', 'Mio Fratello', 'a tale of two cities']) {
      expect(toTitleCase(toTitleCase(x))).toBe(toTitleCase(x))
    }
  })
})

describe('buildMatchKeyStrict', () => {
  it('preserves trailing Roman numerals', () => {
    expect(buildMatchKeyStrict('SAW VI', 2009)).toBe('saw vi::2009')
    expect(buildMatchKeyStrict('Lupin III', null)).toBe('lupin iii')
  })
  it('preserves trailing plain digits', () => {
    expect(buildMatchKeyStrict('IP MAN 2', 2010)).toBe('ip man 2::2010')
    expect(buildMatchKeyStrict('Makari 2', 2022)).toBe('makari 2::2022')
  })
  it('preserves PARTE N trail', () => {
    expect(buildMatchKeyStrict('Il Padrino - Parte 2', 1974)).toBe('padrino - parte 2::1974')
  })
  it('still strips edition/replica/season markers', () => {
    expect(buildMatchKeyStrict('Beautiful XXXIII (R)', 2022)).toBe('beautiful xxxiii::2022')
    expect(buildMatchKeyStrict('House Of The Dragon S.02', 2024)).toBe('house of the dragon::2024')
  })
})

describe('buildMatchKey (loose) — extended', () => {
  it('strips trailing plain digit (2+)', () => {
    expect(buildMatchKey('MAKARI 2', 2022)).toBe('makari::2022')
    expect(buildMatchKey('Ip Man 2', 2010)).toBe('ip man::2010')
    expect(buildMatchKey('8 1/2', 1963)).toBe('8 1/2::1963')
  })
  it('strips trailing PARTE N', () => {
    expect(buildMatchKey('Il Padrino - Parte 2', 1974)).toBe('padrino::1974')
  })
})

describe('normalizeTitle — audit patterns', () => {
  it('strips ST.NN like S.NN', () => {
    expect(normalizeTitle('EDEN - Un pianeta da salvare ST.1')).toBe('Eden - Un Pianeta Da Salvare')
  })
  it('strips suffix tags', () => {
    expect(normalizeTitle('Gomorra - La Serie')).toBe('Gomorra')
    expect(normalizeTitle('ER (E.R. - MEDICI IN PRIMA LINEA) - PILOTA')).toBe('Er (E.r. - Medici in Prima Linea)')
    expect(normalizeTitle('Magnifica Italia - Pillole')).toBe('Magnifica Italia')
    expect(normalizeTitle('Music Line - Speciale')).toBe('Music Line')
    expect(normalizeTitle('Gomorra - Stagione Finale')).toBe('Gomorra')
  })
  it('strips puntata trail "- p.NN"', () => {
    // Loose normalize strips both the " - p.1" puntata and the trailing " 4",
    // so the result is just "La Squadra". Strict normalize would preserve "4".
    expect(normalizeTitle('La Squadra 4 - p.1')).toBe('La Squadra')
    expect(normalizeTitleStrict('La Squadra 4 - p.1')).toBe('La Squadra 4')
  })
  it('strips special parens', () => {
    expect(normalizeTitle('Enough (Movie)')).toBe('Enough')
    expect(normalizeTitle('I Corti (Repeat Version)')).toBe('I Corti')
    expect(normalizeTitle('Rebecca Zahau (Season 1R)')).toBe('Rebecca Zahau')
    expect(normalizeTitle('Murdoch Mysteries (Christmas Special)')).toBe('Murdoch Mysteries')
  })
  it('strips FILM/DOCUMENTARIO prefix', () => {
    expect(normalizeTitle('FILM LA SACRA FAMIGLIA')).toBe('La Sacra Famiglia')
    expect(normalizeTitle('DOCUMENTARIO VITA MORTE E MIRACOLI')).toBe('Vita Morte E Miracoli')
  })
  it('strips channel-prefix parens', () => {
    expect(normalizeTitle('(Tv8) Anica Luglio 2024')).toBe('Anica Luglio 2024')
  })
  it('moves trailing article-in-parens to front', () => {
    expect(normalizeTitle('MADAMA (LA)')).toBe('La Madama')
    expect(normalizeTitle('DIVORZIO (IL)')).toBe('Il Divorzio')
    expect(normalizeTitle('SACCO BELLO (UN)')).toBe('Un Sacco Bello')
  })
  it('normalizes NBSP to space', () => {
    expect(normalizeTitle('THE REAL INGLOURIOUS BASTARDS\xa0\xa0')).toBe('The Real Inglourious Bastards')
  })
})

describe('normalizeTitle — Netflix structural suffixes', () => {
  // Real Netflix VOD export forms. The bare ": Season"/": Part" (no number) are the
  // already-mangled rows produced when loose DIGIT_TRAIL stripped only the number,
  // leaving an orphan word that wrecked trigram similarity (e.g. "The Ranch: Part"
  // scored 0.667 vs catalog "THE RANCH", just under the 0.70 live threshold).
  it('strips ": Season N" onto the base title', () => {
    expect(normalizeTitle('Spongebob Squarepants: Season 9')).toBe('Spongebob Squarepants')
    expect(normalizeTitle('Mighty Morphin Power Rangers: Season 1 (Reversioned)'))
      .toBe('Mighty Morphin Power Rangers')
  })
  it('strips ": Part N"', () => {
    expect(normalizeTitle('The Ranch: Part 8')).toBe('The Ranch')
  })
  it('strips dangling ": Season"/": Part" (number already lost)', () => {
    expect(normalizeTitleStrict('The Ranch: Part')).toBe('The Ranch')
    expect(normalizeTitleStrict('Spongebob Squarepants: Season')).toBe('Spongebob Squarepants')
  })
  it('strips ": Limited Series", ": Volume N", ": Chapter N", ": Collection"', () => {
    expect(normalizeTitle('Love Is Blind: Limited Series')).toBe('Love Is Blind')
    expect(normalizeTitle('Stranger Things: Volume 1')).toBe('Stranger Things')
    expect(normalizeTitle('John Wick: Chapter 2')).toBe('John Wick')
    expect(normalizeTitle('Black Mirror: Collection')).toBe('Black Mirror')
  })
  it('strips only at the structural colon, preserving earlier colons in the title', () => {
    expect(normalizeTitle('Miraculous: Tales of Ladybug & Cat Noir: Season 2: Part'))
      .toBe('Miraculous: Tales of Ladybug & Cat Noir')
  })
  it('does not eat a non-structural subtitle after the colon', () => {
    // No structural keyword after the colon → left intact.
    expect(normalizeTitle('Mission: Impossible')).toBe('Mission: Impossible')
  })
})

it('normalizeTitle idempotent on new patterns', () => {
  for (const x of [
    'FILM LA SACRA FAMIGLIA PARTE 2',
    'GOMORRA - LA SERIE',
    'House Of The Dragon ST.02',
    'MAKARI 2',
    'IL PARADISO DELLE SIGNORE DAILY 6',
    'MADAMA (LA)',
    'EARTH’S TROPICAL ISLANDS (R)',
    'La Squadra 4 - p.1                              ',
    '(Tv8) Anica Luglio 2024',
    'ER (E.R. - MEDICI IN PRIMA LINEA) - PILOTA',
    'Spongebob Squarepants: Season 9',
    'The Ranch: Part 8',
    'Love Is Blind: Limited Series',
    'Miraculous: Tales of Ladybug & Cat Noir: Season 2: Part',
  ]) {
    expect(normalizeTitle(normalizeTitle(x))).toBe(normalizeTitle(x))
  }
})
