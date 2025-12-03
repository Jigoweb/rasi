import { NextResponse } from 'next/server'

const API_URL = process.env.IMDB_API_URL || 'https://api.imdbapi.dev'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = (searchParams.get('query') || '').trim()
    const year = (searchParams.get('year') || '').trim()
    const type = (searchParams.get('type') || '').trim()

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
    const normalized = results.map((r: any) => ({
      title: r?.primaryTitle || r?.title || '',
      year: r?.startYear ?? r?.year ?? null,
      type: r?.type || null,
      id: r?.id || r?.tconst || null,
    }))

    return NextResponse.json({ results: normalized }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}
