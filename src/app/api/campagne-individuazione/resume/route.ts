import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/shared/lib/supabase-server'
import { requireCampagnaProgrammazioneOwner, requireCampagneIndividuazioneAuth } from '../auth'

/**
 * POST /api/campagne-individuazione/resume
 *
 * Riprende una campagna_individuazione rimasta "in_corso" (es. processo
 * interrotto perché l'utente ha chiuso il sistema). A differenza di /init:
 *  - NON crea né elimina la campagna_individuazione: riusa quella esistente
 *  - NON azzera il flag `processato`: il processing continua da dove era fermo
 *    (get-batch-ids con only_unprocessed=true salta le righe già fatte)
 *
 * Acquisisce/rinnova il lock server-side (stesso utente → rinnovo).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireCampagneIndividuazioneAuth(req)
    if (!auth.authenticated) return auth.response
    const userId = auth.userId

    const body = await req.json()
    const { campagne_programmazione_id } = body

    if (!campagne_programmazione_id) {
      return NextResponse.json(
        { success: false, error: 'campagne_programmazione_id è obbligatorio' },
        { status: 400 }
      )
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(campagne_programmazione_id)) {
      return NextResponse.json(
        { success: false, error: `ID non valido: ${campagne_programmazione_id}` },
        { status: 400 }
      )
    }

    const campaignAuthorization = await requireCampagnaProgrammazioneOwner(
      campagne_programmazione_id,
      userId
    )
    if (!campaignAuthorization.authorized) return campaignAuthorization.response

    // Acquisisci/rinnova il lock (stesso utente → rinnovo, altro utente entro
    // il timeout → LOCKED_BY_OTHER)
    const { data: lockResult, error: lockError } = await (supabaseServer as any)
      .rpc('acquire_campagna_processing_lock', {
        p_campagna_id: campagne_programmazione_id,
        p_user_id: userId,
        p_timeout_hours: 2
      })

    if (lockError) {
      return NextResponse.json({ success: false, error: lockError.message }, { status: 500 })
    }

    if (!lockResult?.success) {
      if (lockResult?.error_code === 'LOCKED_BY_OTHER') {
        return NextResponse.json({
          success: false,
          error: 'Campagna già in elaborazione',
          error_code: 'LOCKED_BY_OTHER',
          locked_by: lockResult.locked_by,
          locked_since: lockResult.locked_since,
          message: 'Un altro utente sta già elaborando questa campagna. Attendi il completamento o riprova più tardi.'
        }, { status: 409 })
      }
      return NextResponse.json(
        { success: false, error: lockResult?.error || 'Errore acquisizione lock' },
        { status: 400 }
      )
    }

    // Trova la campagna_individuazione esistente da riprendere
    const { data: ci, error: ciError } = await (supabaseServer as any)
      .from('campagne_individuazione')
      .select('id')
      .eq('campagne_programmazione_id', campagne_programmazione_id)
      .limit(1)
      .maybeSingle()

    if (ciError) {
      return NextResponse.json({ success: false, error: ciError.message }, { status: 500 })
    }

    if (!ci?.id) {
      // Niente da riprendere: nessuna individuazione esistente. Rilascia il lock.
      await (supabaseServer as any).rpc('release_campagna_processing_lock', {
        p_campagna_id: campagne_programmazione_id,
        p_user_id: userId,
        p_new_stato: 'in_review'
      })
      return NextResponse.json(
        { success: false, error: 'Nessuna individuazione da riprendere. Avvia un nuovo processo.', error_code: 'NOTHING_TO_RESUME' },
        { status: 400 }
      )
    }

    // Conta programmazioni totali (per la stima di progresso)
    const { count: programmazioniTotali, error: countError } = await (supabaseServer as any)
      .from('programmazioni')
      .select('id', { count: 'exact', head: true })
      .eq('campagna_programmazione_id', campagne_programmazione_id)

    if (countError) {
      return NextResponse.json({ success: false, error: countError.message }, { status: 500 })
    }

    // Assicura stato 'in_corso' sulla campagna_individuazione (acquire ha già
    // messo in_corso la campagna_programmazione)
    await (supabaseServer as any)
      .from('campagne_individuazione')
      .update({ stato: 'in_corso', updated_at: new Date().toISOString() })
      .eq('id', ci.id)

    return NextResponse.json({
      success: true,
      data: {
        campagne_individuazione_id: ci.id,
        programmazioni_totali: programmazioniTotali ?? 0,
        campagne_programmazione_id
      }
    })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Errore inatteso' },
      { status: 500 }
    )
  }
}
