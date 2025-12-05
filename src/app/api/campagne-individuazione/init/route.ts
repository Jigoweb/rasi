import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/shared/lib/supabase-server'

/**
 * POST /api/campagne-individuazione/init
 * 
 * Inizializza una campagna_individuazione per il batch processing.
 * Crea il record campagna_individuazione e ritorna l'ID + lista programmazioni.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      campagne_programmazione_id,
      nome_campagna_individuazione,
      descrizione 
    } = body

    console.log('Received request body:', JSON.stringify(body, null, 2))

    if (!campagne_programmazione_id) {
      return NextResponse.json(
        { success: false, error: 'campagne_programmazione_id è obbligatorio' },
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(campagne_programmazione_id)) {
      return NextResponse.json(
        { success: false, error: `ID non valido: ${campagne_programmazione_id}` },
        { status: 400 }
      )
    }

    // Note: RLS policies may block direct queries, but RPC functions bypass RLS

    // Inizializza la campagna_individuazione
    const { data: initResult, error: initError } = await (supabaseServer as any)
      .rpc('init_campagna_individuazione', {
        p_campagne_programmazione_id: campagne_programmazione_id,
        p_nome_campagna_individuazione: nome_campagna_individuazione || null,
        p_descrizione: descrizione || null
      })

    console.log('Init result:', JSON.stringify(initResult, null, 2))
    console.log('Init error:', initError)

    if (initError) {
      console.error('Errore init campagna:', initError)
      return NextResponse.json(
        { success: false, error: initError.message },
        { status: 500 }
      )
    }

    // Handle both possible response formats (direct object or nested)
    const result = initResult as any
    if (!result || result.success === false) {
      return NextResponse.json(
        { success: false, error: result?.error || 'Errore sconosciuto' },
        { status: 400 }
      )
    }

    // Non carichiamo tutti gli ID qui - useremo paginazione nel processo
    return NextResponse.json({
      success: true,
      data: {
        campagne_individuazione_id: result.campagne_individuazione_id,
        programmazioni_totali: result.programmazioni_totali,
        campagne_programmazione_id: campagne_programmazione_id
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
