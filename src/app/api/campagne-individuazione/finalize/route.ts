import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/shared/lib/supabase-server'
import { requireCampagnaIndividuazioneAccess, requireCampagneIndividuazioneAuth } from '../auth'

/**
 * POST /api/campagne-individuazione/finalize
 * 
 * Finalizza una campagna_individuazione dopo il batch processing.
 * Calcola statistiche finali, aggiorna lo stato e RILASCIA IL LOCK.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireCampagneIndividuazioneAuth(req)
    if (!auth.authenticated) return auth.response
    const userId = auth.userId

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

    const campaignAuthorization = await requireCampagnaIndividuazioneAccess(
      campagne_individuazione_id,
      userId,
      auth.userRole,
      campagne_programmazione_id
    )
    if (!campaignAuthorization.authorized) return campaignAuthorization.response

    // Finalizza la campagna
    const { data: result, error: finalizeError } = await (supabaseServer as any)
      .rpc(
        'finalize_campagna_individuazione',
        {
          p_campagne_individuazione_id: campagne_individuazione_id,
          p_campagne_programmazione_id: campagne_programmazione_id,
        }
      )

    // Release the lock (regardless of success/failure - process is done)
    const newStato = (finalizeError || !result?.success) ? 'in_review' : 'individuata'
    await (supabaseServer as any).rpc('release_campagna_processing_lock', {
      p_campagna_id: campagne_programmazione_id,
      p_user_id: userId,
      p_new_stato: newStato
    })
    console.log('Lock released for campagna:', campagne_programmazione_id)

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
    // Note: Lock will automatically expire after timeout in case of crash
    return NextResponse.json(
      { success: false, error: error.message || 'Errore inatteso' },
      { status: 500 }
    )
  }
}
