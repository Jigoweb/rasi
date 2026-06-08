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
      soglia_titolo = 0.7,
      artista_ids = null,           // Filtro artisti opzionale
      tolleranza_anno_soft = 3,     // ±N anni senza penalità
      tolleranza_anno_hard = 5,     // Oltre N anni: scarto duro
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

    // Retry logic con backoff esponenziale per gestire errori 502/incomplete response
    const maxRetries = 3
    const baseDelayMs = 1000
    let finalResult: any
    let finalError: any
    let lastAttemptError: any

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }

      try {
        // Timeout wrapper per rilevare timeout (60 secondi per Supabase RPC)
        const timeoutMs = 60000
        const rpcPromise = (supabaseServer as any)
          .rpc('process_programmazioni_chunk', {
            p_campagne_individuazione_id: campagne_individuazione_id,
            p_programmazione_ids: programmazione_ids,
            p_soglia_titolo: soglia_titolo,
            p_artista_ids: artista_ids,
            p_tolleranza_anno_soft: tolleranza_anno_soft,
            p_tolleranza_anno_hard: tolleranza_anno_hard,
          })

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`RPC timeout after ${timeoutMs}ms`))
          }, timeoutMs)
        })

        const rpcResponse = await Promise.race([rpcPromise, timeoutPromise])

        // La chiamata RPC restituisce { data, error }
        finalResult = (rpcResponse as any)?.data
        finalError = (rpcResponse as any)?.error

        // Verifica se il risultato è valido (non null/undefined e ha la struttura attesa)
        if (!finalError && finalResult) {
          // Se il risultato è un oggetto con success, verifica che sia valido
          if (typeof finalResult === 'object' && 'success' in finalResult) {
            // Risultato valido, esci dal loop
            break
          } else if (Array.isArray(finalResult) && finalResult.length > 0) {
            // Risultato array valido, esci dal loop
            break
          } else {
            // Risultato in formato inatteso, potrebbe essere incompleto
            finalError = new Error('RPC returned unexpected result format (possibly incomplete response)')
            // Continua con retry
          }
        }

        // Se non c'è errore ma anche nessun risultato valido, considera come errore retryable
        if (!finalError && !finalResult) {
          finalError = new Error('RPC returned no result (possibly incomplete response)')
        }

        // Se non c'è errore o l'errore non è retryable, esci dal loop
        if (!finalError) {
          break
        }

        // Determina se l'errore è retryable
        const isRetryableError =
          finalError?.message?.includes('timeout') ||
          finalError?.message?.includes('502') ||
          finalError?.message?.includes('incomplete') ||
          finalError?.code === 'PGRST116' || // PostgREST timeout
          finalError?.code === 'ECONNRESET' ||
          finalError?.code === 'ETIMEDOUT'

        if (!isRetryableError || attempt === maxRetries) {
          // Non è retryable o abbiamo esaurito i tentativi
          break
        }

        lastAttemptError = finalError
        finalError = null
        finalResult = null

      } catch (attemptError: any) {
        const isRetryableError =
          attemptError?.message?.includes('timeout') ||
          attemptError?.message?.includes('502') ||
          attemptError?.message?.includes('incomplete') ||
          attemptError?.code === 'ECONNRESET' ||
          attemptError?.code === 'ETIMEDOUT'

        if (!isRetryableError || attempt === maxRetries) {
          finalError = attemptError
          break
        }

        lastAttemptError = attemptError
      }
    }

    if (finalError) {
      console.error('Errore processamento chunk dopo tutti i retry:', finalError)

      // Costruisci un messaggio di errore più informativo
      let errorMessage = finalError.message
      const isIncompleteError =
        errorMessage.includes('incomplete') ||
        errorMessage.includes('502') ||
        finalError.code === 'ECONNRESET'

      if (isIncompleteError && programmazione_ids.length > 10) {
        errorMessage += ` (Suggerimento: prova a ridurre la dimensione del chunk da ${programmazione_ids.length} a 10-15 programmazioni)`
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          retryable: isIncompleteError,
          chunk_size: programmazione_ids.length,
          suggestion: isIncompleteError && programmazione_ids.length > 10
            ? 'Consider reducing chunk size'
            : null
        },
        { status: 500 }
      )
    }

    if (!finalResult?.success) {
      return NextResponse.json(
        {
          success: false,
          error: finalResult?.error,
          partial: {
            programmazioni_processate: finalResult?.programmazioni_processate,
            individuazioni_create: finalResult?.individuazioni_create
          }
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        programmazioni_processate: finalResult.programmazioni_processate,
        programmazioni_con_match: finalResult.programmazioni_con_match,
        individuazioni_create: finalResult.individuazioni_create,
        match_trovati: finalResult.match_trovati
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
