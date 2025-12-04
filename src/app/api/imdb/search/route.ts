import { NextResponse } from 'next/server'

const API_URL = process.env.IMDB_API_URL || 'https://api.imdbapi.dev'

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

    const params = new URLSearchParams()
    params.set('query', query)
    if (year) params.set('year', year)
    if (type) params.set('type', type)

    const url = `${API_URL}/search/titles?${params.toString()}`
    const res = await fetch(url)

    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
    }

    const data = await res.json()
    const results = Array.isArray(data?.titles) ? data.titles : (Array.isArray(data?.results) ? data.results : [])
    
    let normalized = results.map((r: any) => ({
      title: r?.primaryTitle || r?.title || '',
      year: r?.startYear ?? r?.year ?? null,
      type: r?.type || null,
      id: r?.id || r?.tconst || null,
      directors: null as string | null,
    }))

    // Fetch directors for each result (limit to first 10 to avoid too many requests)
    if (includeDirectors && normalized.length > 0) {
      const detailsPromises = normalized.slice(0, 10).map(async (item: any) => {
        if (!item.id) return item
        try {
          const detailRes = await fetch(`${API_URL}/titles/${item.id}`)
          if (detailRes.ok) {
            const detailData = await detailRes.json()
            // Try multiple possible fields for directors
            const directors = detailData?.directors || detailData?.director || detailData?.crew?.directors
            
            if (directors) {
              if (Array.isArray(directors)) {
                item.directors = directors
                  .slice(0, 2)
                  .map((d: any) => {
                    if (typeof d === 'string') return d
                    return d?.displayName || d?.name || d?.primaryName || d?.fullName || ''
                  })
                  .filter(Boolean)
                  .join(', ')
              } else if (typeof directors === 'object' && directors !== null) {
                // Single director object
                item.directors = directors?.displayName || directors?.name || directors?.primaryName || directors?.fullName || null
              } else if (typeof directors === 'string') {
                item.directors = directors
              }
            }
          }
        } catch {
          // Ignore errors for individual title fetches
        }
        return item
      })
      
      const resultsWithDetails = await Promise.all(detailsPromises)
      // Merge back with any results beyond the first 10
      normalized = [...resultsWithDetails, ...normalized.slice(10)]
    }

    return NextResponse.json({ results: normalized }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}
