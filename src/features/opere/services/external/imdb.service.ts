import { fetchJson } from '@/shared/lib/http'
import { formatReleaseDateForDb } from '@/features/opere/lib/release-date'

export { formatReleaseDateForDb }

export async function searchTitles(term: string, year?: number | string, type?: string, includeDirectors = false) {
  const params = new URLSearchParams()
  params.set('query', term)
  if (year) params.set('year', String(year))
  if (includeDirectors) params.set('includeDirectors', 'true')
  
  // Map DB types to IMDb API types
  let imdbType = ''
  const normalizedType = (type || '').toLowerCase()
  
  if (normalizedType === 'film') imdbType = 'MOVIE'
  else if (normalizedType === 'serie_tv' || normalizedType === 'serietv') imdbType = 'TV_SERIES'
  else if (normalizedType === 'animazione') imdbType = 'MOVIE' // animazione può essere film o serie, usiamo MOVIE come default
  
  // Only set type parameter if we have a valid mapping.
  if (imdbType) params.set('type', imdbType)
  
  const { ok, data } = await fetchJson<{ results: Array<{ title: string; year: number | null; type: string | null; id: string | null; directors: string | null }> }>(`/api/imdb/search?${params.toString()}`)
  return { ok, results: data?.results ?? [] }
}

export interface ImdbTitleDetails {
  title: string
  originalTitle: string | null
  year: number | null
  endYear: number | null
  type: string | null
  id: string
  directors: any
  directorsFormatted: string | null
  runtimeMinutes: number | null
  genres: string[]
  plot: string | null
}

export async function getTitleById(id: string) {
  const { ok, data } = await fetchJson<{ result: ImdbTitleDetails }>(`/api/imdb/title/${encodeURIComponent(id)}`)
  return { ok, result: data?.result }
}

export async function getTitleCredits(id: string) {
  const { ok, status, data } = await fetchJson<{ 
    error?: string
    message?: string
    result: { 
      cast: Array<{ 
        id: string; 
        name: string; 
        character: string; 
        category?: string;
        categoryLabel?: string;
        categoryGroup?: string;
        isStar?: boolean;
        castRole?: string | null;
      }>;
      grouped?: any;
    } 
  }>(`/api/imdb/title/${encodeURIComponent(id)}/credits`)
  return { ok, status, error: data?.error, message: data?.message, result: data?.result }
}

export type OperaTipoFromImdb = 'film' | 'serie_tv' | 'animazione'

/** Map OMDb/imdbapi type strings to DB `opere.tipo`. Unknown / episode → null (do not invent). */
export function mapImdbTypeToOperaTipo(type?: string | null): OperaTipoFromImdb | null {
  const t = (type || '').trim().toLowerCase()
  if (!t || t === 'n/a') return null
  if (t.includes('episode')) return null
  if (t.includes('movie') || t === 'film') return 'film'
  if (t === 'tvseries' || t === 'tvminiseries' || t === 'serie_tv' || t === 'serietv' || t === 'series') return 'serie_tv'
  if (t.includes('series')) return 'serie_tv'
  if (t.includes('animation') || t.includes('cartoon') || t.includes('documentary')) return 'animazione'
  return null
}

export function mapImdbToOpera(imdb: {
  title: string
  originalTitle: string | null
  year: number | null
  endYear?: number | null
  type: string | null
  id: string
}) {
  return {
    titolo: imdb.title,
    titolo_originale: imdb.originalTitle || null,
    tipo: mapImdbTypeToOperaTipo(imdb.type),
    anno_produzione: imdb.year ?? null,
    anno_produzione_fine: imdb.endYear ?? null,
    imdb_tconst: imdb.id,
    codici_esterni: { imdb: imdb.id },
  }
}

// Episodes types
export interface ImdbEpisode {
  id: string
  title: string
  season: number
  episodeNumber: number
  runtimeMinutes: number | null
  plot: string | null
  releaseDate: {
    year: number | null
    month: number | null
    day: number | null
  } | null
  rating: number | null
}

export interface ImdbEpisodesResponse {
  episodes: ImdbEpisode[]
  bySeason: Record<number, ImdbEpisode[]>
  totalEpisodes: number
  seasons: number[]
}

export async function getEpisodesByTitleId(id: string) {
  const { ok, data } = await fetchJson<ImdbEpisodesResponse>(`/api/imdb/title/${encodeURIComponent(id)}/episodes`)
  return { ok, data }
}
