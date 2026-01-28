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

    // Processa il chunk (con filtro artisti opzionale)
    const rpcPromise = (supabaseServer as any)
      .rpc('process_programmazioni_chunk', {
        p_campagne_individuazione_id: campagne_individuazione_id,
        p_programmazione_ids: programmazione_ids,
        p_soglia_titolo: soglia_titolo,
        p_artista_ids: artista_ids  // Passa il filtro artisti alla funzione SQL
      })

    // #region agent log
    log('B', 'route.ts:78', 'RPC promise created', { promise_created_at: Date.now() })
    // #endregion

    // Timeout wrapper per rilevare timeout (120 secondi - limite Vercel Hobby è 10s per Edge, 60s per Serverless)
    const timeoutMs = 120000
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        // #region agent log
        log('C', 'route.ts:85', 'RPC timeout detected', {
          timeout_after_ms: timeoutMs,
          elapsed_ms: Date.now() - rpcStartTime
        })
        // #endregion
        reject(new Error(`RPC timeout after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    let finalResult: any
    let finalError: any

    try {
      // #region agent log
      log('B', 'route.ts:100', 'Awaiting RPC with timeout', { timeout_ms: timeoutMs })
      // #endregion
      const rpcResponse = await Promise.race([rpcPromise, timeoutPromise])
      // La chiamata RPC restituisce { data, error }
      finalResult = (rpcResponse as any)?.data
      finalError = (rpcResponse as any)?.error
    } catch (timeoutError: any) {
      // #region agent log
      log('C', 'route.ts:107', 'Timeout or error during RPC await', {
        error_message: timeoutError?.message,
        error_type: timeoutError?.constructor?.name,
        elapsed_ms: Date.now() - rpcStartTime
      })
      // #endregion
      finalError = timeoutError
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
      log('C', 'route.ts:135', 'RPC error detected', {
        error_type: finalError.constructor?.name,
        error_message: finalError.message,
        error_code: finalError.code,
        error_details: finalError.details,
        error_hint: finalError.hint,
        error_stack: finalError.stack?.substring(0, 500)
      })
      // #endregion
      console.error('Errore processamento chunk:', finalError)
      return NextResponse.json(
        { success: false, error: finalError.message },
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

