import { NextResponse, NextRequest } from 'next/server'
import { omdbGet, isOmdbOk, buildEpisodesForSeason, ImdbEpisode, OmdbConfigError } from '@/features/opere/services/external/omdb'

export type { ImdbEpisode }

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

    // OMDb has no "all episodes" endpoint: fetch the series to learn the season
    // count, then fetch each season's listing (?Season=N) in parallel.
    const detail = await omdbGet({ i: id })
    if (!isOmdbOk(detail)) {
      return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
    }

    const totalSeasons = parseInt(detail?.totalSeasons, 10)
    const emptyPayload = { episodes: [] as ImdbEpisode[], bySeason: {} as Record<number, ImdbEpisode[]>, totalEpisodes: 0, seasons: [] as number[] }

    if (!Number.isInteger(totalSeasons) || totalSeasons <= 0) {
      return NextResponse.json(emptyPayload, { status: 200 })
    }

    const seasonNumbers = Array.from({ length: totalSeasons }, (_, i) => i + 1)
    const perSeason = await Promise.all(
      seasonNumbers.map(async (season) => {
        try {
          const data = await omdbGet({ i: id, Season: String(season) })
          if (!isOmdbOk(data)) return [] as ImdbEpisode[]
          return buildEpisodesForSeason(data?.Episodes, season)
        } catch {
          return [] as ImdbEpisode[]
        }
      }),
    )

    const normalized = perSeason.flat()

    const bySeason: Record<number, ImdbEpisode[]> = {}
    for (const ep of normalized) {
      ;(bySeason[ep.season] ||= []).push(ep)
    }
    for (const season in bySeason) {
      bySeason[season].sort((a, b) => a.episodeNumber - b.episodeNumber)
    }
    const seasons = Object.keys(bySeason).map(Number).sort((a, b) => a - b)

    return NextResponse.json({
      episodes: normalized,
      bySeason,
      totalEpisodes: normalized.length,
      seasons,
    }, { status: 200 })
  } catch (e) {
    if (e instanceof OmdbConfigError) {
      return NextResponse.json({ error: 'config', message: e.message }, { status: 500 })
    }
    console.error('Error fetching episodes:', e)
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}
