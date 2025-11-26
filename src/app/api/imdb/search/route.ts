import { NextResponse } from 'next/server'

const API_URL = process.env.IMDB_API_URL || 'https://imdbapi.dev'
const API_KEY = process.env.IMDB_API_KEY

export async function GET(req: Request) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: 'missing_api_key' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const query = (searchParams.get('query') || '').trim()
    const year = (searchParams.get('year') || '').trim()
    const type = (searchParams.get('type') || '').trim()

    if (!query) {
      return NextResponse.json({ error: 'query_required' }, { status: 400 })
    }

    const params = new URLSearchParams()
    params.set('q', query)
    if (year) params.set('y', year)
    if (type) params.set('type', type)

    const url = `${API_URL}/search?${params.toString()}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`
      }
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
    }

    const data = await res.json()
    const results = Array.isArray(data?.results) ? data.results : []
    const normalized = results.map((r: any) => ({
      title: r?.title || '',
      year: r?.year ?? null,
      type: r?.type || null,
      id: r?.id || r?.tconst || null,
    }))

    return NextResponse.json({ results: normalized }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}
