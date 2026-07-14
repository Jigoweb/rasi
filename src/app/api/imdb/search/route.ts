import { NextResponse } from 'next/server'
import { omdbGet, isOmdbOk, buildSearchResults, mapTypeToOmdb, splitList, OmdbConfigError } from '@/features/opere/services/external/omdb'

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

    const params: Record<string, string> = { s: query }
    const omdbType = mapTypeToOmdb(type)
    if (omdbType) params.type = omdbType
    if (year) params.y = year

    const data = await omdbGet(params)

    // OMDb signals "no matches" with Response:"False" (e.g. "Movie not found!").
    // That is an empty result set, not an error.
    if (!isOmdbOk(data)) {
      return NextResponse.json({ results: [] }, { status: 200 })
    }

    let normalized = buildSearchResults(data?.Search)

    // Directors require a per-title detail lookup (OMDb search omits them).
    // Limit to the first 10 to bound the request fan-out, as the old route did.
    if (includeDirectors && normalized.length > 0) {
      const withDirectors = await Promise.all(
        normalized.slice(0, 10).map(async (item) => {
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
      normalized = [...withDirectors, ...normalized.slice(10)]
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
