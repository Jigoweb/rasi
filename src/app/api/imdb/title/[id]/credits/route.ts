import { NextResponse } from 'next/server'

const API_URL = process.env.IMDB_API_URL || 'https://api.imdbapi.dev'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = (params?.id || '').trim()
    if (!id) {
      return NextResponse.json({ error: 'id_required' }, { status: 400 })
    }

    // Fetch credits and title info (for stars) in parallel
    const [creditsRes, titleRes] = await Promise.all([
      fetch(`${API_URL}/titles/${encodeURIComponent(id)}/credits`),
      fetch(`${API_URL}/titles/${encodeURIComponent(id)}`)
    ])

    if (!creditsRes.ok) {
      return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
    }

    const creditsData = await creditsRes.json()
    const titleData = titleRes.ok ? await titleRes.json() : null
    
    // Get stars (main actors) IDs for marking primary cast
    const starsIds = new Set(
      (titleData?.stars || []).map((s: any) => s?.id || s?.name?.id || '')
    )
    
    // Map category to Italian labels
    const categoryLabels: Record<string, string> = {
      'actor': 'Attore',
      'actress': 'Attrice',
      'director': 'Regista',
      'writer': 'Sceneggiatore',
      'producer': 'Produttore',
      'composer': 'Compositore',
      'cinematographer': 'Direttore fotografia',
      'editor': 'Montatore',
    }
    
    // Category groups for organizing
    const categoryGroups: Record<string, string> = {
      'actor': 'cast',
      'actress': 'cast',
      'director': 'direction',
      'writer': 'writing',
      'producer': 'production',
      'composer': 'music',
      'cinematographer': 'cinematography',
      'editor': 'editing',
    }
    
    const allCredits = creditsData?.credits?.map((c: any) => {
      const personId = c?.name?.id || ''
      const isStar = starsIds.has(personId)
      const category = c?.category || ''
      const isActor = category === 'actor' || category === 'actress'
      
      return {
        id: personId,
        name: c?.name?.displayName || '',
        character: Array.isArray(c?.characters) ? c.characters.join(', ') : '',
        category,
        categoryLabel: categoryLabels[category] || category || '',
        categoryGroup: categoryGroups[category] || 'other',
        isStar,
        // For actors: Primario if star, Comprimario otherwise
        castRole: isActor ? (isStar ? 'Primario' : 'Comprimario') : null,
      }
    }) || []
    
    // Group credits by category
    const grouped = {
      direction: allCredits.filter((c: any) => c.categoryGroup === 'direction'),
      writing: allCredits.filter((c: any) => c.categoryGroup === 'writing'),
      castPrimary: allCredits.filter((c: any) => c.categoryGroup === 'cast' && c.isStar),
      castSecondary: allCredits.filter((c: any) => c.categoryGroup === 'cast' && !c.isStar),
      production: allCredits.filter((c: any) => c.categoryGroup === 'production'),
      music: allCredits.filter((c: any) => c.categoryGroup === 'music'),
      cinematography: allCredits.filter((c: any) => c.categoryGroup === 'cinematography'),
      editing: allCredits.filter((c: any) => c.categoryGroup === 'editing'),
      other: allCredits.filter((c: any) => c.categoryGroup === 'other'),
    }
    
    return NextResponse.json({ 
      result: {
        cast: allCredits,
        grouped,
        starsCount: starsIds.size,
      }
    }, { status: 200 })
  } catch (e) {
    console.error('Error fetching credits:', e)
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}
