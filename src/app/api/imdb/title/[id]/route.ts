import { NextResponse } from 'next/server'

const API_URL = process.env.IMDB_API_URL || 'https://api.imdbapi.dev'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = (params?.id || '').trim()
    if (!id) {
      return NextResponse.json({ error: 'id_required' }, { status: 400 })
    }

    const url = `${API_URL}/titles/${encodeURIComponent(id)}`
    const res = await fetch(url)

    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
    }

    const data = await res.json()
    
    // Extract directors names
    let directorsFormatted: string | null = null
    if (data?.directors) {
      if (Array.isArray(data.directors)) {
        directorsFormatted = data.directors
          .map((d: any) => typeof d === 'string' ? d : d?.displayName || d?.name || d?.primaryName || '')
          .filter(Boolean)
          .join(', ')
      } else if (typeof data.directors === 'string') {
        directorsFormatted = data.directors
      }
    }
    
    // Extract runtime in minutes
    let runtimeMinutes: number | null = null
    if (data?.runtime?.seconds) {
      runtimeMinutes = Math.round(data.runtime.seconds / 60)
    } else if (data?.runtimeMinutes) {
      runtimeMinutes = data.runtimeMinutes
    } else if (data?.runtime && typeof data.runtime === 'number') {
      runtimeMinutes = data.runtime
    }
    
    // Extract genres
    let genres: string[] = []
    if (Array.isArray(data?.genres)) {
      genres = data.genres.map((g: any) => typeof g === 'string' ? g : g?.name || g?.text || '').filter(Boolean)
    }
    
    // Extract plot/description
    const plot = data?.plot?.text || data?.plot || data?.description || null

    const normalized = {
      title: data?.primaryTitle || data?.title || '',
      originalTitle: data?.originalTitle || null,
      year: data?.startYear ?? data?.year ?? null,
      endYear: data?.endYear || null,
      type: data?.type || null,
      id: data?.id || data?.tconst || id,
      directors: data?.directors || null,
      directorsFormatted,
      runtimeMinutes,
      genres,
      plot,
      // Raw data for debugging
      _raw: data,
    }

    return NextResponse.json({ result: normalized }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}
