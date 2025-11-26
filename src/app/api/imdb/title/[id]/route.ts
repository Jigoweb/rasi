import { NextResponse } from 'next/server'

const API_URL = process.env.IMDB_API_URL || 'https://imdbapi.dev'
const API_KEY = process.env.IMDB_API_KEY

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: 'missing_api_key' }, { status: 500 })
    }

    const id = (params?.id || '').trim()
    if (!id) {
      return NextResponse.json({ error: 'id_required' }, { status: 400 })
    }

    const url = `${API_URL}/title/${encodeURIComponent(id)}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`
      }
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
    }

    const data = await res.json()
    const normalized = {
      title: data?.title || '',
      originalTitle: data?.originalTitle || null,
      year: data?.year ?? null,
      type: data?.type || null,
      id: data?.id || data?.tconst || id,
      directors: data?.directors || null,
    }

    return NextResponse.json({ result: normalized }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}
