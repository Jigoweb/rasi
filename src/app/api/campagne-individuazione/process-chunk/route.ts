import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/shared/lib/supabase-server'

/**
 * POST /api/campagne-individuazione/process-chunk
 * 
 * Processa un chunk di programmazioni per creare individuazioni.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      campagne_individuazione_id,
      programmazione_ids,
      soglia_titolo = 0.7
    } = body

    if (!campagne_individuazione_id) {
      return NextResponse.json(
        { success: false, error: 'campagne_individuazione_id è obbligatorio' },
        { status: 400 }
      )
    }

    if (!programmazione_ids || !Array.isArray(programmazione_ids) || programmazione_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'programmazione_ids deve essere un array non vuoto' },
        { status: 400 }
      )
    }

    // Processa il chunk
    const { data: result, error: processError } = await supabaseServer
      .rpc('process_programmazioni_chunk', {
        p_campagne_individuazione_id: campagne_individuazione_id,
        p_programmazione_ids: programmazione_ids,
        p_soglia_titolo: soglia_titolo
      })

    if (processError) {
      console.error('Errore processamento chunk:', processError)
      return NextResponse.json(
        { success: false, error: processError.message },
        { status: 500 }
      )
    }

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          partial: {
            programmazioni_processate: result.programmazioni_processate,
            individuazioni_create: result.individuazioni_create
          }
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        programmazioni_processate: result.programmazioni_processate,
        programmazioni_con_match: result.programmazioni_con_match,
        individuazioni_create: result.individuazioni_create,
        match_trovati: result.match_trovati
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


