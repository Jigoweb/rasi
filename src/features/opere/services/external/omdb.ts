// Server-side OMDb (omdbapi.com) client + pure mappers.
//
// The app was built against the now-defunct api.imdbapi.dev. OMDb replaces it as
// the data source, but every /api/imdb/* route keeps emitting imdbapi.dev-shaped
// responses so no frontend/service code needs to change. All the shape
// translation lives here.
//
// OMDb limitations vs imdbapi.dev (intentional, documented):
//  - No structured cast: only Director/Writer/Actors as comma strings, top-billed
//    actors only, no character names, no person ids.
//  - No per-episode runtime/plot in the season listing.

const OMDB_URL = process.env.OMDB_API_URL || 'https://www.omdbapi.com'

export class OmdbConfigError extends Error {
  constructor() {
    super('OMDB_API_KEY is not configured')
    this.name = 'OmdbConfigError'
  }
}

/** Low-level GET against OMDb. Injects the api key. OMDb answers 200 with
 *  { Response: "False", Error } for "not found" and 401 for a bad key, always
 *  with a JSON body — callers inspect `Response`. Throws on network failure or
 *  a missing key. */
export async function omdbGet(params: Record<string, string>): Promise<any> {
  const key = process.env.OMDB_API_KEY
  if (!key) throw new OmdbConfigError()

  const search = new URLSearchParams({ apikey: key, r: 'json', ...params })
  const res = await fetch(`${OMDB_URL}/?${search.toString()}`)

  // OMDb returns a JSON body even on 401 (Invalid API key). Try to parse it so
  // the caller can surface a meaningful Error; only throw if the body is junk.
  const data = await res.json().catch(() => null)
  if (data === null) {
    throw new Error(`omdb_bad_response_${res.status}`)
  }
  return data
}

export function isOmdbOk(data: any): boolean {
  return data?.Response === 'True'
}

// --- pure mappers (unit-tested) --------------------------------------------

const NA = new Set(['', 'n/a', 'na', 'none', 'null', 'undefined'])

export function isBlank(v?: string | null): boolean {
  return v == null || NA.has(String(v).trim().toLowerCase())
}

/** DB/client type (MOVIE, TV_SERIES) -> OMDb `type` param. '' means unset. */
export function mapTypeToOmdb(type?: string | null): '' | 'movie' | 'series' | 'episode' {
  const t = (type || '').toLowerCase()
  if (!t) return ''
  if (t.includes('episode')) return 'episode'
  if (t.includes('series') || t === 'tv_series' || t === 'serie_tv' || t === 'serietv') return 'series'
  if (t.includes('movie') || t === 'film') return 'movie'
  return ''
}

/** OMDb `Type` -> imdbapi.dev-style type string the frontend expects. The
 *  detail page keys episode handling off `tvSeries`/`tvMiniSeries`. */
export function mapTypeFromOmdb(type?: string | null): string | null {
  const t = (type || '').toLowerCase()
  if (t === 'movie') return 'movie'
  if (t === 'series') return 'tvSeries'
  if (t === 'episode') return 'tvEpisode'
  return type || null
}

/** "2014" | "2008–2013" | "2008–" -> 2008 (leading 4 digits), else null. */
export function parseYear(year?: string | null): number | null {
  if (isBlank(year)) return null
  const m = String(year).match(/(\d{4})/)
  return m ? parseInt(m[1], 10) : null
}

/** "2008–2013" -> 2013; "2014" | "2008–" -> null. Handles -, – and — separators. */
export function parseEndYear(year?: string | null): number | null {
  if (isBlank(year)) return null
  const m = String(year).match(/^\s*\d{4}\s*[-–—]\s*(\d{4})/)
  return m ? parseInt(m[1], 10) : null
}

/** "129 min" -> 129; "N/A" -> null. */
export function parseRuntimeMinutes(runtime?: string | null): number | null {
  if (isBlank(runtime)) return null
  const m = String(runtime).match(/(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

/** "9.0" -> 9; "N/A" -> null. */
export function parseRating(rating?: string | null): number | null {
  if (isBlank(rating)) return null
  const n = parseFloat(String(rating))
  return Number.isFinite(n) ? n : null
}

/** ISO "2008-01-20" -> { year, month, day }; blank -> null. */
export function parseReleased(released?: string | null): { year: number | null; month: number | null; day: number | null } | null {
  if (isBlank(released)) return null
  const m = String(released).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return { year: +m[1], month: +m[2], day: +m[3] }
  const y = parseYear(released)
  return y ? { year: y, month: null, day: null } : null
}

/** Comma-separated OMDb people/genre string -> clean array. Strips trailing
 *  "(screenplay)"-style annotations OMDb puts on writers. */
export function splitList(value?: string | null): string[] {
  if (isBlank(value)) return []
  return String(value)
    .split(',')
    .map((s) => s.replace(/\s*\([^)]*\)\s*$/, '').trim())
    .filter((s) => !isBlank(s))
}

export interface SearchResult {
  title: string
  year: number | null
  type: string | null
  id: string | null
  directors: string | null
}

/** True when the query is an IMDb id (tconst, e.g. "tt0471509"). Such queries
 *  must go to OMDb's by-id lookup (?i=), not the title search (?s=). */
export function isTconst(query?: string | null): boolean {
  return /^tt\d{6,}$/i.test((query || '').trim())
}

/** OMDb detail object -> a single search result (used for by-id lookups). The
 *  detail already carries Director, so directors is filled here. */
export function buildSearchResultFromDetail(data: any): SearchResult | null {
  const id = data?.imdbID || null
  const title = data?.Title || ''
  if (!id || !title) return null
  const directors = splitList(data?.Director)
  return {
    title,
    year: parseYear(data?.Year),
    type: mapTypeFromOmdb(data?.Type),
    id,
    directors: directors.length ? directors.join(', ') : null,
  }
}

export const OMDB_PAGE_SIZE = 10 // OMDb returns 10 results per ?s= page

/** How many ?s= pages to fetch to reach `maxResults`, bounded by what OMDb
 *  actually has (`totalResults`). Always at least 1. */
export function pagesToFetch(totalResults: number | string | undefined | null, maxResults: number, pageSize = OMDB_PAGE_SIZE): number {
  const total = typeof totalResults === 'string' ? parseInt(totalResults, 10) : (totalResults || 0)
  if (!Number.isFinite(total) || total <= 0) return 1
  return Math.min(Math.ceil(maxResults / pageSize), Math.ceil(total / pageSize))
}

/** OMDb `Search` array -> imdbapi.dev-style search results (directors filled
 *  in separately by the route when includeDirectors is set). */
export function buildSearchResults(searchArray: any[]): SearchResult[] {
  return (Array.isArray(searchArray) ? searchArray : [])
    .map((r) => ({
      title: r?.Title || '',
      year: parseYear(r?.Year),
      type: mapTypeFromOmdb(r?.Type),
      id: r?.imdbID || null,
      directors: null as string | null,
    }))
    .filter((r) => r.title && r.id)
}

/** OMDb detail object -> imdbapi.dev-style title detail. */
export function buildTitleDetail(data: any, fallbackId: string) {
  const directors = splitList(data?.Director)
  const directorsFormatted = directors.length ? directors.join(', ') : null
  return {
    title: data?.Title || '',
    originalTitle: null as string | null, // OMDb has no original-title field
    year: parseYear(data?.Year),
    endYear: parseEndYear(data?.Year),
    type: mapTypeFromOmdb(data?.Type),
    id: data?.imdbID || fallbackId,
    directors: directorsFormatted, // string form; consumer handles string|array
    directorsFormatted,
    runtimeMinutes: parseRuntimeMinutes(data?.Runtime),
    genres: splitList(data?.Genre),
    plot: isBlank(data?.Plot) ? null : data.Plot,
    _raw: data,
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  actor: 'Attore',
  director: 'Regista',
  writer: 'Sceneggiatore',
}
const CATEGORY_GROUPS: Record<string, string> = {
  actor: 'cast',
  director: 'direction',
  writer: 'writing',
}

interface CreditEntry {
  id: string
  name: string
  character: string
  category: string
  categoryLabel: string
  categoryGroup: string
  isStar: boolean
  castRole: string | null
}

function creditEntry(name: string, category: 'actor' | 'director' | 'writer'): CreditEntry {
  const isActor = category === 'actor'
  return {
    id: '', // OMDb provides no person ids
    name,
    character: '', // OMDb provides no character names
    category,
    categoryLabel: CATEGORY_LABELS[category],
    categoryGroup: CATEGORY_GROUPS[category],
    isStar: isActor, // OMDb only returns top-billed actors -> treat as primary
    castRole: isActor ? 'Primario' : null,
  }
}

/** OMDb detail object -> imdbapi.dev-style credits payload. Only director,
 *  writer and top-billed actors are available. */
export function buildCredits(data: any) {
  const directors = splitList(data?.Director).map((n) => creditEntry(n, 'director'))
  const writers = splitList(data?.Writer).map((n) => creditEntry(n, 'writer'))
  const actors = splitList(data?.Actors).map((n) => creditEntry(n, 'actor'))

  const cast = [...directors, ...writers, ...actors]
  const grouped = {
    direction: directors,
    writing: writers,
    castPrimary: actors,
    castSecondary: [] as CreditEntry[],
    production: [] as CreditEntry[],
    music: [] as CreditEntry[],
    cinematography: [] as CreditEntry[],
    editing: [] as CreditEntry[],
    other: [] as CreditEntry[],
  }
  return { cast, grouped, starsCount: actors.length }
}

export interface ImdbEpisode {
  id: string | null
  title: string
  season: number
  episodeNumber: number
  runtimeMinutes: number | null
  plot: string | null
  releaseDate: { year: number | null; month: number | null; day: number | null } | null
  rating: number | null
}

/** OMDb season `Episodes` array -> imdbapi.dev-style episodes for one season. */
export function buildEpisodesForSeason(episodes: any[], season: number): ImdbEpisode[] {
  return (Array.isArray(episodes) ? episodes : [])
    .map((ep): ImdbEpisode | null => {
      const episodeNumber = parseInt(ep?.Episode, 10)
      if (!Number.isInteger(season) || season <= 0 || !Number.isInteger(episodeNumber) || episodeNumber <= 0) {
        return null
      }
      return {
        id: ep?.imdbID || null,
        title: ep?.Title || '',
        season,
        episodeNumber,
        runtimeMinutes: null, // not present in OMDb season listing
        plot: null, // not present in OMDb season listing
        releaseDate: parseReleased(ep?.Released),
        rating: parseRating(ep?.imdbRating),
      }
    })
    .filter((ep): ep is ImdbEpisode => ep !== null)
}
