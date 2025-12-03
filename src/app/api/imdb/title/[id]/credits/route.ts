import { NextResponse } from 'next/server'

const API_URL = process.env.IMDB_API_URL || 'https://api.imdbapi.dev'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = (params?.id || '').trim()
    if (!id) {
      return NextResponse.json({ error: 'id_required' }, { status: 400 })
    }

    const url = `${API_URL}/titles/${encodeURIComponent(id)}/credits`
    const res = await fetch(url)

    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
    }

    const data = await res.json()
    // Normalize to match service expectation (result.cast)
    // The API returns { credits: [...] }
    const normalized = {
      cast: data?.credits?.map((c: any) => ({
        id: c?.name?.id || '',
        name: c?.name?.displayName || '',
        character: Array.isArray(c?.characters) ? c.characters.join(', ') : ''
      })) || []
    }
    
    return NextResponse.json({ result: normalized }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}
