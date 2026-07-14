import {
  mapTypeToOmdb,
  mapTypeFromOmdb,
  parseYear,
  parseEndYear,
  parseRuntimeMinutes,
  parseRating,
  parseReleased,
  splitList,
  buildSearchResults,
  buildTitleDetail,
  buildCredits,
  buildEpisodesForSeason,
} from './omdb'

describe('OMDb type mapping', () => {
  it('maps client types to OMDb type param', () => {
    expect(mapTypeToOmdb('MOVIE')).toBe('movie')
    expect(mapTypeToOmdb('TV_SERIES')).toBe('series')
    expect(mapTypeToOmdb('film')).toBe('movie')
    expect(mapTypeToOmdb('serie_tv')).toBe('series')
    expect(mapTypeToOmdb('episode')).toBe('episode')
    expect(mapTypeToOmdb('')).toBe('')
    expect(mapTypeToOmdb(undefined)).toBe('')
  })

  it('maps OMDb type back to imdbapi.dev vocabulary the frontend expects', () => {
    expect(mapTypeFromOmdb('movie')).toBe('movie')
    expect(mapTypeFromOmdb('series')).toBe('tvSeries')
    expect(mapTypeFromOmdb('episode')).toBe('tvEpisode')
    expect(mapTypeFromOmdb('N/A')).toBe('N/A')
    expect(mapTypeFromOmdb(undefined)).toBeNull()
  })
})

describe('OMDb scalar parsers', () => {
  it('parseYear takes leading 4 digits', () => {
    expect(parseYear('2014')).toBe(2014)
    expect(parseYear('2008–2013')).toBe(2008)
    expect(parseYear('2008–')).toBe(2008)
    expect(parseYear('N/A')).toBeNull()
    expect(parseYear(undefined)).toBeNull()
  })

  it('parseEndYear only for a closed range', () => {
    expect(parseEndYear('2008–2013')).toBe(2013) // en-dash
    expect(parseEndYear('2008-2013')).toBe(2013) // hyphen
    expect(parseEndYear('2008–')).toBeNull()
    expect(parseEndYear('2014')).toBeNull()
  })

  it('parseRuntimeMinutes strips " min"', () => {
    expect(parseRuntimeMinutes('129 min')).toBe(129)
    expect(parseRuntimeMinutes('N/A')).toBeNull()
  })

  it('parseRating parses floats', () => {
    expect(parseRating('9.0')).toBe(9)
    expect(parseRating('8.6')).toBeCloseTo(8.6)
    expect(parseRating('N/A')).toBeNull()
  })

  it('parseReleased parses ISO dates', () => {
    expect(parseReleased('2008-01-20')).toEqual({ year: 2008, month: 1, day: 20 })
    expect(parseReleased('N/A')).toBeNull()
    expect(parseReleased(undefined)).toBeNull()
  })

  it('splitList cleans people/genre strings and strips annotations', () => {
    expect(splitList('Action, Adventure, Comedy')).toEqual(['Action', 'Adventure', 'Comedy'])
    expect(splitList('Jane Goldman (screenplay), Mark Millar (comic)')).toEqual(['Jane Goldman', 'Mark Millar'])
    expect(splitList('N/A')).toEqual([])
    expect(splitList(undefined)).toEqual([])
  })
})

describe('buildSearchResults', () => {
  it('normalizes OMDb Search entries and drops invalid ones', () => {
    const out = buildSearchResults([
      { Title: 'Non-Stop', Year: '2014', imdbID: 'tt2024469', Type: 'movie' },
      { Title: 'Breaking Bad', Year: '2008–2013', imdbID: 'tt0903747', Type: 'series' },
      { Title: 'No Id', Year: '2000', Type: 'movie' }, // dropped: no id
    ])
    expect(out).toEqual([
      { title: 'Non-Stop', year: 2014, type: 'movie', id: 'tt2024469', directors: null },
      { title: 'Breaking Bad', year: 2008, type: 'tvSeries', id: 'tt0903747', directors: null },
    ])
  })

  it('tolerates non-array input', () => {
    expect(buildSearchResults(undefined as any)).toEqual([])
  })
})

describe('buildTitleDetail', () => {
  it('normalizes an OMDb movie detail', () => {
    const d = buildTitleDetail(
      {
        Title: 'Kingsman: The Secret Service',
        Year: '2015',
        Type: 'movie',
        imdbID: 'tt2802144',
        Director: 'Matthew Vaughn',
        Runtime: '129 min',
        Genre: 'Action, Adventure, Comedy',
        Plot: 'A spy organisation...',
      },
      'tt2802144',
    )
    expect(d.title).toBe('Kingsman: The Secret Service')
    expect(d.year).toBe(2015)
    expect(d.endYear).toBeNull()
    expect(d.type).toBe('movie')
    expect(d.directorsFormatted).toBe('Matthew Vaughn')
    expect(d.runtimeMinutes).toBe(129)
    expect(d.genres).toEqual(['Action', 'Adventure', 'Comedy'])
  })

  it('extracts endYear for a series range and maps type to tvSeries', () => {
    const d = buildTitleDetail({ Title: 'Breaking Bad', Year: '2008–2013', Type: 'series', imdbID: 'tt0903747' }, 'tt0903747')
    expect(d.type).toBe('tvSeries')
    expect(d.year).toBe(2008)
    expect(d.endYear).toBe(2013)
  })

  it('falls back to the passed id and nulls blank fields', () => {
    const d = buildTitleDetail({ Title: 'X', Year: 'N/A', Plot: 'N/A', Director: 'N/A' }, 'tt123')
    expect(d.id).toBe('tt123')
    expect(d.year).toBeNull()
    expect(d.plot).toBeNull()
    expect(d.directorsFormatted).toBeNull()
  })
})

describe('buildCredits', () => {
  it('synthesizes cast/crew from OMDb strings', () => {
    const { cast, grouped, starsCount } = buildCredits({
      Director: 'Matthew Vaughn',
      Writer: 'Jane Goldman (screenplay), Mark Millar',
      Actors: 'Colin Firth, Taron Egerton, Samuel L. Jackson',
    })
    expect(starsCount).toBe(3)
    expect(grouped.direction.map((c) => c.name)).toEqual(['Matthew Vaughn'])
    expect(grouped.writing.map((c) => c.name)).toEqual(['Jane Goldman', 'Mark Millar'])
    expect(grouped.castPrimary.map((c) => c.name)).toEqual(['Colin Firth', 'Taron Egerton', 'Samuel L. Jackson'])
    expect(grouped.castSecondary).toEqual([])
    // shape parity with the old route
    const actor = grouped.castPrimary[0]
    expect(actor).toMatchObject({ category: 'actor', categoryLabel: 'Attore', categoryGroup: 'cast', isStar: true, castRole: 'Primario' })
    expect(cast).toHaveLength(6)
  })

  it('handles missing fields', () => {
    const { cast, starsCount } = buildCredits({ Director: 'N/A', Actors: 'N/A' })
    expect(cast).toEqual([])
    expect(starsCount).toBe(0)
  })
})

describe('buildEpisodesForSeason', () => {
  it('normalizes an OMDb season listing', () => {
    const out = buildEpisodesForSeason(
      [
        { Title: 'Pilot', Released: '2008-01-20', Episode: '1', imdbRating: '9.0', imdbID: 'tt0959621' },
        { Title: "Cat's in the Bag...", Released: '2008-01-27', Episode: '2', imdbRating: '8.6', imdbID: 'tt1054724' },
        { Title: 'Bad', Released: 'N/A', Episode: '0', imdbID: 'tt0' }, // dropped: episode 0
      ],
      1,
    )
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({
      id: 'tt0959621',
      title: 'Pilot',
      season: 1,
      episodeNumber: 1,
      runtimeMinutes: null,
      plot: null,
      releaseDate: { year: 2008, month: 1, day: 20 },
      rating: 9,
    })
  })

  it('drops everything for an invalid season number', () => {
    expect(buildEpisodesForSeason([{ Title: 'x', Episode: '1' }], 0)).toEqual([])
  })
})
