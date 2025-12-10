import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/shared/lib/supabase-server'

/**
 * POST /api/campagne-individuazione/finalize
 * 
 * Finalizza una campagna_individuazione dopo il batch processing.
 * Calcola statistiche finali e aggiorna lo stato.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      campagne_individuazione_id,
      campagne_programmazione_id
    } = body

    if (!campagne_individuazione_id || !campagne_programmazione_id) {
      return NextResponse.json(
        { success: false, error: 'campagne_individuazione_id e campagne_programmazione_id sono obbligatori' },
        { status: 400 }
      )
    }

    // Finalizza la campagna
    const { data: result, error: finalizeError } = await (supabaseServer as any)
      .rpc(
        'finalize_campagna_individuazione',
        {
          p_campagne_individuazione_id: campagne_individuazione_id,
          p_campagne_programmazione_id: campagne_programmazione_id,
        }
      )

    if (finalizeError) {
      console.error('Errore finalizzazione:', finalizeError)
      return NextResponse.json(
        { success: false, error: finalizeError.message },
        { status: 500 }
      )
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Errore durante la finalizzazione' },
        { status: 500 }
      )
    }

    // Carica la campagna_individuazione completa
    const { data: campagna } = await (supabaseServer as any)
      .from('campagne_individuazione')
      .select('*')
      .eq('id', campagne_individuazione_id)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        statistiche: result.statistiche,
        campagna
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
