import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/shared/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/campagne-individuazione/init
 * 
 * Inizializza una campagna_individuazione per il batch processing.
 * Crea il record campagna_individuazione e ritorna l'ID + lista programmazioni.
 * 
 * LOCK SYSTEM: Acquisisce un lock server-side per prevenire elaborazioni concorrenti
 * della stessa campagna da parte di utenti diversi.
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

    // Get user ID from authorization header
    const authHeader = req.headers.get('authorization')
    let userId: string | null = null
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      // Create a temporary client to verify the token
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const tempClient = createClient(supabaseUrl, supabaseAnonKey)
      const { data: { user } } = await tempClient.auth.getUser(token)
      userId = user?.id || null
    }

    // If we have a user, try to acquire the lock first
    if (userId) {
      const { data: lockResult, error: lockError } = await (supabaseServer as any)
        .rpc('acquire_campagna_processing_lock', {
          p_campagna_id: campagne_programmazione_id,
          p_user_id: userId,
          p_timeout_hours: 2
        })

      console.log('Lock result:', JSON.stringify(lockResult, null, 2))

      if (lockError) {
        console.error('Errore acquisizione lock:', lockError)
        return NextResponse.json(
          { success: false, error: lockError.message },
          { status: 500 }
        )
      }

      if (!lockResult?.success) {
        // Campaign is locked by another user
        if (lockResult?.error_code === 'LOCKED_BY_OTHER') {
          return NextResponse.json({
            success: false,
            error: 'Campagna già in elaborazione',
            error_code: 'LOCKED_BY_OTHER',
            locked_by: lockResult.locked_by,
            locked_since: lockResult.locked_since,
            message: 'Un altro utente sta già elaborando questa campagna. Attendi il completamento o riprova più tardi.'
          }, { status: 409 }) // 409 Conflict
        }
        
        return NextResponse.json(
          { success: false, error: lockResult?.error || 'Errore acquisizione lock' },
          { status: 400 }
        )
      }
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
      // Release the lock on failure
      if (userId) {
        await (supabaseServer as any).rpc('release_campagna_processing_lock', {
          p_campagna_id: campagne_programmazione_id,
          p_user_id: userId,
          p_new_stato: 'in_review' // Revert to previous state
        })
      }
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
    // Note: We can't easily release the lock here as we may not have all the context
    // The lock will automatically expire after the timeout
    return NextResponse.json(
      { success: false, error: error.message || 'Errore inatteso' },
      { status: 500 }
    )
  }
}
