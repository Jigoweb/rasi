import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/shared/lib/supabase-server'

/**
 * POST /api/campagne-individuazione/process-chunk
 * 
 * Processa un chunk di programmazioni per creare individuazioni.
 */
export async function POST(req: NextRequest) {
  // #region agent log
  const sessionId = 'debug-session'
  const runId = `run-${Date.now()}`
  const logEndpoint = 'http://127.0.0.1:7242/ingest/94fdf2e6-d905-468d-a41a-cd3d52af05ea'
  const log = (hypothesisId: string, location: string, message: string, data: any) => {
    fetch(logEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, runId, hypothesisId, location, message, data, timestamp: Date.now() })
    }).catch(() => {})
  }
  // #endregion

  try {
    const requestStartTime = Date.now()
    // #region agent log
    log('A', 'route.ts:15', 'Request received', { timestamp: requestStartTime })
    // #endregion

    const body = await req.json()
    const { 
      campagne_individuazione_id,
      programmazione_ids,
      soglia_titolo = 0.7,
      artista_ids = null  // Nuovo: filtro artisti opzionale
    } = body

    // #region agent log
    log('A', 'route.ts:28', 'Request body parsed', {
      campagne_individuazione_id,
      programmazione_ids_count: programmazione_ids?.length,
      soglia_titolo,
      artista_ids_count: artista_ids?.length,
      payload_size_bytes: JSON.stringify(body).length
    })
    // #endregion

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

    // #region agent log
    const rpcStartTime = Date.now()
    log('A', 'route.ts:62', 'RPC call starting', {
      rpc_start_time: rpcStartTime,
      time_since_request_start_ms: rpcStartTime - requestStartTime
    })
    // #endregion

    // Retry logic con backoff esponenziale per gestire errori 502/incomplete response
    const maxRetries = 3
    const baseDelayMs = 1000
    let finalResult: any
    let finalError: any
    let lastAttemptError: any

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1)
        // #region agent log
        log('F', 'route.ts:72', 'Retrying RPC call', {
          attempt,
          max_retries: maxRetries,
          delay_ms: delayMs,
          previous_error: lastAttemptError?.message
        })
        // #endregion
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }

      try {
        // #region agent log
        log('B', `route.ts:${80 + attempt}`, `RPC call attempt ${attempt + 1}`, {
          attempt: attempt + 1,
          max_retries: maxRetries + 1
        })
        // #endregion

        // Timeout wrapper per rilevare timeout (60 secondi per Supabase RPC)
        const timeoutMs = 60000
        const rpcPromise = (supabaseServer as any)
          .rpc('process_programmazioni_chunk', {
            p_campagne_individuazione_id: campagne_individuazione_id,
            p_programmazione_ids: programmazione_ids,
            p_soglia_titolo: soglia_titolo,
            p_artista_ids: artista_ids
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

        // #region agent log
        const attemptEndTime = Date.now()
        log('B', `route.ts:${100 + attempt}`, `RPC attempt ${attempt + 1} completed`, {
          attempt: attempt + 1,
          duration_ms: attemptEndTime - rpcStartTime,
          has_error: !!finalError,
          has_result: !!finalResult,
          result_type: typeof finalResult,
          result_is_array: Array.isArray(finalResult),
          error_message: finalError?.message,
          error_code: finalError?.code
        })
        // #endregion

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
            // #region agent log
            log('C', `route.ts:${120 + attempt}`, 'Unexpected result format, treating as incomplete', {
              result_type: typeof finalResult,
              result_keys: finalResult && typeof finalResult === 'object' ? Object.keys(finalResult) : null
            })
            // #endregion
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
        // #region agent log
        log('C', `route.ts:${130 + attempt}`, `RPC attempt ${attempt + 1} threw exception`, {
          attempt: attempt + 1,
          error_message: attemptError?.message,
          error_type: attemptError?.constructor?.name,
          elapsed_ms: Date.now() - rpcStartTime
        })
        // #endregion

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

    // #region agent log
    const rpcEndTime = Date.now()
    const rpcDuration = rpcEndTime - rpcStartTime
    log('A', 'route.ts:119', 'RPC call completed', {
      rpc_end_time: rpcEndTime,
      rpc_duration_ms: rpcDuration,
      has_error: !!finalError,
      has_result: !!finalResult,
      result_success: finalResult?.success,
      error_message: finalError?.message,
      error_code: finalError?.code,
      error_details: finalError?.details,
      error_hint: finalError?.hint
    })
    // #endregion

    if (finalError) {
      // #region agent log
      log('C', 'route.ts:195', 'RPC error detected after all retries', {
        error_type: finalError.constructor?.name,
        error_message: finalError.message,
        error_code: finalError.code,
        error_details: finalError.details,
        error_hint: finalError.hint,
        error_stack: finalError.stack?.substring(0, 500),
        total_attempts: maxRetries + 1,
        chunk_size: programmazione_ids.length
      })
      // #endregion
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
      // #region agent log
      log('D', 'route.ts:153', 'RPC returned unsuccessful result', {
        result_error: finalResult?.error,
        partial_data: {
          programmazioni_processate: finalResult?.programmazioni_processate,
          individuazioni_create: finalResult?.individuazioni_create
        }
      })
      // #endregion
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

    // #region agent log
    const responseEndTime = Date.now()
    log('A', 'route.ts:177', 'Response prepared successfully', {
      response_end_time: responseEndTime,
      total_request_duration_ms: responseEndTime - requestStartTime,
      result_data: {
        programmazioni_processate: finalResult.programmazioni_processate,
        programmazioni_con_match: finalResult.programmazioni_con_match,
        individuazioni_create: finalResult.individuazioni_create,
        match_trovati: finalResult.match_trovati
      }
    })
    // #endregion

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
    // #region agent log
    const errorTime = Date.now()
    log('E', 'route.ts:120', 'Unexpected exception caught', {
      error_time: errorTime,
      error_type: error?.constructor?.name,
      error_message: error?.message,
      error_stack: error?.stack?.substring(0, 1000),
      error_name: error?.name,
      error_cause: error?.cause
    })
    // #endregion
    console.error('Errore inatteso:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Errore inatteso' },
      { status: 500 }
    )
  }
}

