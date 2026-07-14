import { NextResponse } from 'next/server'
import { omdbGet, isOmdbOk, buildSearchResults, buildSearchResultFromDetail, isTconst, pagesToFetch, mapTypeToOmdb, splitList, OmdbConfigError } from '@/features/opere/services/external/omdb'

const MAX_RESULTS = 30 // OMDb pages by 10; fetch up to 3 pages
const MAX_DIRECTOR_LOOKUPS = MAX_RESULTS // directors for all results (~1 detail call each)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = (searchParams.get('query') || '').trim()
    const year = (searchParams.get('year') || '').trim()
    const type = (searchParams.get('type') || '').trim()
    const includeDirectors = searchParams.get('includeDirectors') === 'true'

    if (!query) {
      return NextResponse.json({ error: 'query_required' }, { status: 400 })
    }

    // An IMDb id (tconst) can't be found via OMDb's title search (?s=); it needs
    // a by-id lookup (?i=). Detect it and return the single matching title.
    if (isTconst(query)) {
      const data = await omdbGet({ i: query.trim(), plot: 'short' })
      if (!isOmdbOk(data)) {
        return NextResponse.json({ results: [] }, { status: 200 })
      }
      const one = buildSearchResultFromDetail(data)
      return NextResponse.json({ results: one ? [one] : [] }, { status: 200 })
    }

    const params: Record<string, string> = { s: query }
    const omdbType = mapTypeToOmdb(type)
    if (omdbType) params.type = omdbType
    if (year) params.y = year

    // OMDb returns 10 results per page. Fetch page 1, then, based on
    // totalResults, fetch further pages in parallel up to MAX_RESULTS.
    const first = await omdbGet({ ...params, page: '1' })

    // OMDb signals "no matches" with Response:"False" (e.g. "Movie not found!").
    // That is an empty result set, not an error.
    if (!isOmdbOk(first)) {
      return NextResponse.json({ results: [] }, { status: 200 })
    }

    const rawResults: any[] = Array.isArray(first?.Search) ? [...first.Search] : []
    const pages = pagesToFetch(first?.totalResults, MAX_RESULTS)
    if (pages > 1) {
      const morePages = await Promise.all(
        Array.from({ length: pages - 1 }, (_, i) => i + 2).map(async (page) => {
          try {
            const d = await omdbGet({ ...params, page: String(page) })
            return isOmdbOk(d) && Array.isArray(d?.Search) ? d.Search : []
          } catch {
            return []
          }
        }),
      )
      for (const arr of morePages) rawResults.push(...arr)
    }

    // Dedupe by IMDb id (pages can occasionally overlap), then cap.
    const seen = new Set<string>()
    let normalized = buildSearchResults(rawResults)
      .filter((r) => (r.id && !seen.has(r.id) ? seen.add(r.id) && true : false))
      .slice(0, MAX_RESULTS)

    // Directors require a per-title detail lookup (OMDb search omits them).
    // Bound the fan-out to the first MAX_DIRECTOR_LOOKUPS to control quota.
    if (includeDirectors && normalized.length > 0) {
      const withDirectors = await Promise.all(
        normalized.slice(0, MAX_DIRECTOR_LOOKUPS).map(async (item) => {
          if (!item.id) return item
          try {
            const detail = await omdbGet({ i: item.id, plot: 'short' })
            if (isOmdbOk(detail)) {
              const directors = splitList(detail?.Director)
              if (directors.length) item.directors = directors.slice(0, 2).join(', ')
            }
          } catch {
            // Ignore individual detail failures; keep the base result.
          }
          return item
        }),
      )
      normalized = [...withDirectors, ...normalized.slice(MAX_DIRECTOR_LOOKUPS)]
    }

    return NextResponse.json({ results: normalized }, { status: 200 })
  } catch (e) {
    if (e instanceof OmdbConfigError) {
      return NextResponse.json({ error: 'config', message: e.message }, { status: 500 })
    }
    console.error('IMDb search API error:', e)
    return NextResponse.json({ error: 'unexpected', message: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
