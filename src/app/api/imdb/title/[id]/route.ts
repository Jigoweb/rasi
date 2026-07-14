import { NextResponse, NextRequest } from 'next/server'
import { omdbGet, isOmdbOk, buildTitleDetail, OmdbConfigError } from '@/features/opere/services/external/omdb'

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

    const data = await omdbGet({ i: id, plot: 'full' })
    if (!isOmdbOk(data)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    return NextResponse.json({ result: buildTitleDetail(data, id) }, { status: 200 })
  } catch (e) {
    if (e instanceof OmdbConfigError) {
      return NextResponse.json({ error: 'config', message: e.message }, { status: 500 })
    }
    console.error('Error fetching title:', e)
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}
