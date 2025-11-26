import { fetchJson } from '@/shared/lib/http'

export async function searchTitles(term: string, year?: number | string, type?: string) {
  const params = new URLSearchParams()
  params.set('query', term)
  if (year) params.set('year', String(year))
  if (type && type !== 'all') params.set('type', type)
  const { ok, data } = await fetchJson<{ results: Array<{ title: string; year: number | null; type: string | null; id: string | null }> }>(`/api/imdb/search?${params.toString()}`)
  return { ok, results: data?.results ?? [] }
}

export async function getTitleById(id: string) {
  const { ok, data } = await fetchJson<{ result: { title: string; originalTitle: string | null; year: number | null; type: string | null; id: string; directors: any } }>(`/api/imdb/title/${encodeURIComponent(id)}`)
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
