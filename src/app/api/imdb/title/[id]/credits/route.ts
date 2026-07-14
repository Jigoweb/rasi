import { NextResponse, NextRequest } from 'next/server'
import { omdbGet, isOmdbOk, buildCredits, OmdbConfigError } from '@/features/opere/services/external/omdb'

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

    // OMDb has no structured cast endpoint: director, writer and the top-billed
    // actors come from the title detail (as comma strings). buildCredits shapes
    // them into the imdbapi.dev-style payload the frontend expects.
    const data = await omdbGet({ i: id, plot: 'short' })
    if (!isOmdbOk(data)) {
      return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
    }

    return NextResponse.json({ result: buildCredits(data) }, { status: 200 })
  } catch (e) {
    if (e instanceof OmdbConfigError) {
      return NextResponse.json({ error: 'config', message: e.message }, { status: 500 })
    }
    console.error('Error fetching credits:', e)
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}
