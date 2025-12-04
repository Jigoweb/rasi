import { fetchJson } from '@/shared/lib/http'

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
  else if (normalizedType === 'documentario') imdbType = 'TV_SPECIAL'
  
  // Only set type parameter if we have a valid mapping. 
  // Passing 'altro' or unknown types causes the API to return 0 results or unexpected behavior.
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
  const { ok, data } = await fetchJson<{ result: { cast: Array<{ id: string; name: string; character: string; }> } }>(`/api/imdb/title/${encodeURIComponent(id)}/credits`)
  return { ok, result: data?.result }
}

export function mapImdbToOpera(imdb: { title: string; originalTitle: string | null; year: number | null; type: string | null; id: string }) {
  return {
    titolo: imdb.title,
    titolo_originale: imdb.originalTitle || null,
    tipo: imdb.type || 'altro',
    anno_produzione: imdb.year ?? null,
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
