import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/shared/lib/supabase-server'

/**
 * POST /api/campagne-individuazione/process
 * 
 * Processa una campagna_programmazione e crea tutte le individuazioni
 * attraverso matching automatico con partecipazioni.
 * 
 * Request Body:
 * {
 *   "campagne_programmazione_id": "uuid",
 *   "nome_campagna_individuazione": "string (opzionale)",
 *   "descrizione": "string (opzionale)"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "campagne_individuazione_id": "uuid",
 *     "statistiche": { ... }
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      campagne_programmazione_id,
      nome_campagna_individuazione,
      descrizione 
    } = body

    // Validazione input
    if (!campagne_programmazione_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'campagne_programmazione_id è obbligatorio' 
        },
        { status: 400 }
      )
    }

    // Verifica che la campagna_programmazione esista
    const { data: campagna, error: campagnaError } = await supabaseServer
      .from('campagne_programmazione')
      .select('id, nome')
      .eq('id', campagne_programmazione_id)
      .single()

    if (campagnaError || !campagna) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Campagna programmazione non trovata' 
        },
        { status: 404 }
      )
    }

    // Chiama la funzione SQL per processare la campagna
    const { data: result, error: processError } = await supabaseServer
      .rpc('process_campagna_individuazione', {
        p_campagne_programmazione_id: campagne_programmazione_id,
        p_nome_campagna_individuazione: nome_campagna_individuazione || null,
        p_descrizione: descrizione || null
      })

    if (processError) {
      console.error('Errore processamento campagna:', processError)
      return NextResponse.json(
        { 
          success: false, 
          error: processError.message || 'Errore durante il processamento',
          details: processError.details || null
        },
        { status: 500 }
      )
    }

    // La funzione ritorna un JSONB, quindi result è già l'oggetto
    if (!result || result.success === false) {
      return NextResponse.json(
        { 
          success: false, 
          error: result?.errore || 'Errore sconosciuto durante il processamento'
        },
        { status: 500 }
      )
    }

    // Carica la campagna_individuazione creata per ritornarla completa
    const { data: campagnaIndividuazione } = await supabaseServer
      .from('campagne_individuazione')
      .select('*')
      .eq('id', result.campagne_individuazione_id)
      .single()

    return NextResponse.json(
      {
        success: true,
        data: {
          ...result,
          campagna: campagnaIndividuazione
        }
      },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('Errore inatteso:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Errore inatteso durante il processamento' 
      },
      { status: 500 }
    )
  }
}

