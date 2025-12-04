import { NextResponse } from 'next/server'

const API_URL = process.env.IMDB_API_URL || 'https://api.imdbapi.dev'

export interface ImdbEpisode {
  id: string
  title: string
  season: number
  episodeNumber: number
  runtimeMinutes: number | null
  plot: string | null
  releaseDate: {
    year: number | null
    month: number | null
    day: number | null
  } | null
  rating: number | null
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = (params?.id || '').trim()
    if (!id) {
      return NextResponse.json({ error: 'id_required' }, { status: 400 })
    }

    const url = `${API_URL}/titles/${encodeURIComponent(id)}/episodes`
    const res = await fetch(url)

    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
    }

    const data = await res.json()
    const episodes = Array.isArray(data?.episodes) ? data.episodes : []
    
    // Normalize episodes data
    const normalized: ImdbEpisode[] = episodes.map((ep: any) => ({
      id: ep?.id || null,
      title: ep?.title || ep?.primaryTitle || '',
      season: parseInt(ep?.season) || 0,
      episodeNumber: ep?.episodeNumber || 0,
      runtimeMinutes: ep?.runtimeSeconds ? Math.round(ep.runtimeSeconds / 60) : null,
      plot: ep?.plot || null,
      releaseDate: ep?.releaseDate ? {
        year: ep.releaseDate.year || null,
        month: ep.releaseDate.month || null,
        day: ep.releaseDate.day || null,
      } : null,
      rating: ep?.rating?.aggregateRating || null,
    }))

    // Group by season for easier display
    const bySeason: Record<number, ImdbEpisode[]> = {}
    for (const ep of normalized) {
      if (!bySeason[ep.season]) {
        bySeason[ep.season] = []
      }
      bySeason[ep.season].push(ep)
    }
    
    // Sort episodes within each season
    for (const season in bySeason) {
      bySeason[season].sort((a, b) => a.episodeNumber - b.episodeNumber)
    }

    return NextResponse.json({ 
      episodes: normalized,
      bySeason,
      totalEpisodes: normalized.length,
      seasons: Object.keys(bySeason).map(Number).sort((a, b) => a - b),
    }, { status: 200 })
  } catch (e) {
    console.error('Error fetching episodes:', e)
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}

