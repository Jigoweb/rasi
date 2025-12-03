import { fetchJson } from '@/shared/lib/http'

export async function searchTitles(term: string, year?: number | string, type?: string) {
  const params = new URLSearchParams()
  params.set('query', term)
  if (year) params.set('year', String(year))
  
  // Map DB types to IMDb API types
  let imdbType = ''
  const normalizedType = (type || '').toLowerCase()
  
  if (normalizedType === 'film') imdbType = 'MOVIE'
  else if (normalizedType === 'serie_tv' || normalizedType === 'serietv') imdbType = 'TV_SERIES'
  else if (normalizedType === 'documentario') imdbType = 'TV_SPECIAL'
  
  // Only set type parameter if we have a valid mapping. 
  // Passing 'altro' or unknown types causes the API to return 0 results or unexpected behavior.
  if (imdbType) params.set('type', imdbType)
  
  const { ok, data } = await fetchJson<{ results: Array<{ title: string; year: number | null; type: string | null; id: string | null }> }>(`/api/imdb/search?${params.toString()}`)
  return { ok, results: data?.results ?? [] }
}

export async function getTitleById(id: string) {
  const { ok, data } = await fetchJson<{ result: { title: string; originalTitle: string | null; year: number | null; type: string | null; id: string; directors: any } }>(`/api/imdb/title/${encodeURIComponent(id)}`)
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
