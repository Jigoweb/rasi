import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/shared/lib/supabase-server'
import { requireCampagnaProgrammazioneOwner, requireCampagneIndividuazioneAuth } from '../auth'

/**
 * POST /api/campagne-individuazione/get-batch-ids
 * 
 * Ottiene un batch di programmazione_ids per il processing paginato.
 * Usa cursor-based pagination per performance ottimale su grandi dataset.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireCampagneIndividuazioneAuth(req)
    if (!auth.authenticated) return auth.response

    const body = await req.json()
    const {
      campagne_programmazione_id,
      campagne_individuazione_id = null,
      last_id = null,  // Cursor: ultimo ID processato
      limit = 500,
      only_unprocessed = false  // Resume: salta le programmazioni già processate
    } = body

    if (!campagne_programmazione_id) {
      return NextResponse.json(
        { success: false, error: 'campagne_programmazione_id è obbligatorio' },
        { status: 400 }
      )
    }

    const campaignAuthorization = await requireCampagnaProgrammazioneOwner(
      campagne_programmazione_id,
      auth.userId
    )
    if (!campaignAuthorization.authorized) return campaignAuthorization.response

    // Cursor-based pagination: molto più veloce di OFFSET per grandi dataset
    // Invece di "OFFSET 19000" che deve saltare 19000 righe,
    // usiamo "WHERE id > last_id" che usa l'indice direttamente
    if (only_unprocessed) {
      const { data, error } = await (supabaseServer as any)
        .rpc('get_campagna_unprocessed_programmazione_ids', {
          p_campagne_programmazione_id: campagne_programmazione_id,
          p_campagne_individuazione_id: campagne_individuazione_id,
          p_limit: limit,
        })

      if (error) {
        console.error('Errore caricamento batch:', error)
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }

      const programmazioneIds = data?.map((p: { id: string }) => p.id) || []
      const newLastId = programmazioneIds.length > 0
        ? programmazioneIds[programmazioneIds.length - 1]
        : null

      return NextResponse.json({
        success: true,
        data: {
          programmazione_ids: programmazioneIds,
          count: programmazioneIds.length,
          last_id: newLastId,
          has_more: programmazioneIds.length === limit
        }
      })
    }

    let query = supabaseServer
      .from('programmazioni')
      .select('id')
      .eq('campagna_programmazione_id', campagne_programmazione_id)
      .limit(limit)

    // Primo passaggio classico: cursor su id crescente.
    query = query.order('id', { ascending: true })
    if (last_id) {
      query = query.gt('id', last_id)
    }

    const { data: programmazioni, error: progError } = await query

    if (progError) {
      console.error('Errore caricamento batch:', progError)
      return NextResponse.json(
        { success: false, error: progError.message },
        { status: 500 }
      )
    }

    const programmazioneIds = programmazioni?.map(p => p.id) || []
    const newLastId = programmazioneIds.length > 0 
      ? programmazioneIds[programmazioneIds.length - 1] 
      : null

    return NextResponse.json({
      success: true,
      data: {
        programmazione_ids: programmazioneIds,
        count: programmazioneIds.length,
        last_id: newLastId,  // Cursor per il prossimo batch
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


