import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/shared/lib/supabase-server'

/**
 * POST /api/campagne-individuazione/get-batch-ids
 * 
 * Ottiene un batch di programmazione_ids per il processing paginato.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      campagne_programmazione_id,
      offset = 0,
      limit = 500
    } = body

    if (!campagne_programmazione_id) {
      return NextResponse.json(
        { success: false, error: 'campagne_programmazione_id è obbligatorio' },
        { status: 400 }
      )
    }

    // Ottieni un batch di ID con paginazione
    const { data: programmazioni, error: progError } = await supabaseServer
      .from('programmazioni')
      .select('id')
      .eq('campagna_programmazione_id', campagne_programmazione_id)
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1)

    if (progError) {
      console.error('Errore caricamento batch:', progError)
      return NextResponse.json(
        { success: false, error: progError.message },
        { status: 500 }
      )
    }

    const programmazioneIds = programmazioni?.map(p => p.id) || []

    return NextResponse.json({
      success: true,
      data: {
        programmazione_ids: programmazioneIds,
        count: programmazioneIds.length,
        offset,
        has_more: programmazioneIds.length === limit
      }
    })

  } catch (error: any) {
    console.error('Errore inatteso:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Errore inatteso' },
      { status: 500 }
    )
  }
}


