import { NextResponse, NextRequest } from 'next/server'

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    const id = (rawId || '').trim()
    if (!id) {
      return NextResponse.json({ error: 'id_required' }, { status: 400 })
    }

    const url = `${API_URL}/titles/${encodeURIComponent(id)}/episodes`
    const res = await fetch(url)

    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
    }

    const data = await res.json()
    
    // Handle different response formats from IMDb API
    let episodes: any[] = []
    if (Array.isArray(data?.episodes)) {
      episodes = data.episodes
    } else if (Array.isArray(data?.results)) {
      episodes = data.results
    } else if (data?.data && Array.isArray(data.data)) {
      episodes = data.data
    } else if (Array.isArray(data)) {
      episodes = data
    }
    
    // Normalize episodes data and filter out invalid entries
    const normalized: ImdbEpisode[] = episodes
      .map((ep: any) => {
        const season = parseInt(ep?.season || ep?.seasonNumber || '0')
        const episodeNumber = parseInt(ep?.episodeNumber || ep?.episode || ep?.number || '0')
        
        // Skip episodes with invalid season/episode numbers
        if (isNaN(season) || season <= 0 || isNaN(episodeNumber) || episodeNumber <= 0) {
          return null
        }
        
        return {
          id: ep?.id || ep?.tconst || ep?.imdbId || null,
          title: ep?.title || ep?.primaryTitle || ep?.name || '',
          season: season,
          episodeNumber: episodeNumber,
          runtimeMinutes: ep?.runtimeMinutes || (ep?.runtimeSeconds ? Math.round(ep.runtimeSeconds / 60) : null),
          plot: ep?.plot || ep?.description || null,
          releaseDate: ep?.releaseDate ? {
            year: ep.releaseDate.year || null,
            month: ep.releaseDate.month || null,
            day: ep.releaseDate.day || null,
          } : (ep?.year ? {
            year: ep.year,
            month: ep.month || null,
            day: ep.day || null,
          } : null),
          rating: ep?.rating?.aggregateRating || ep?.rating || ep?.averageRating || null,
        }
      })
      .filter((ep): ep is ImdbEpisode => ep !== null) // Remove null entries

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

    // Get sorted list of seasons
    const seasons = Object.keys(bySeason)
      .map(Number)
      .sort((a, b) => a - b)

    // Log for debugging (remove in production if needed)
    console.log(`[IMDb Episodes] Fetched ${normalized.length} episodes across ${seasons.length} seasons for title ${id}`)
    if (seasons.length > 0) {
      console.log(`[IMDb Episodes] Seasons found: ${seasons.join(', ')}`)
    }

    return NextResponse.json({ 
      episodes: normalized,
      bySeason,
      totalEpisodes: normalized.length,
      seasons: seasons,
    }, { status: 200 })
  } catch (e) {
    console.error('Error fetching episodes:', e)
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}
