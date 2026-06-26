import { supabase } from '@/shared/lib/supabase'
import {
  WORKER_MAX_NETWORK_ERRORS,
  WORKER_POLL_INTERVAL_MS,
} from './individuazione-contract'
import type { WorkerJobSnapshot } from './individuazione-contract'

// ============================================
// HELPER: Get auth token for API requests
// ============================================

const getAuthHeaders = async (): Promise<HeadersInit> => {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  return headers
}

// ============================================
// BATCH PROCESSING TYPES
// ============================================

export interface InitCampagnaRequest {
  campagne_programmazione_id: string
  nome_campagna_individuazione?: string
  descrizione?: string
  mandato_override_artist_ids?: string[] | null
}

export interface InitCampagnaResponse {
  success: boolean
  data?: {
    campagne_individuazione_id: string
    programmazioni_totali: number
    campagne_programmazione_id: string
  }
  error?: string
  error_code?: string  // 'LOCKED_BY_OTHER' if campaign is locked
  locked_by?: string   // User ID who holds the lock
  locked_since?: string // When the lock was acquired
  message?: string     // User-friendly message
}

export interface GetBatchIdsRequest {
  campagne_programmazione_id: string
  campagne_individuazione_id?: string
  last_id?: string | null  // Cursor: ultimo ID processato (null per il primo batch)
  limit: number
  only_unprocessed?: boolean  // Resume: salta le programmazioni già processate
}

export interface GetBatchIdsResponse {
  success: boolean
  data?: {
    programmazione_ids: string[]
    count: number
    last_id: string | null  // Cursor per il prossimo batch
    has_more: boolean
  }
  error?: string
}

export interface ProcessChunkRequest {
  campagne_individuazione_id: string
  programmazione_ids: string[]
  soglia_titolo?: number
  artista_ids?: string[] | null  // Filtro artisti opzionale
  mandato_override_artist_ids?: string[] | null
}

export interface ProcessChunkResponse {
  success: boolean
  data?: {
    programmazioni_processate: number
    programmazioni_con_match: number
    individuazioni_create: number
    match_trovati: number
  }
  error?: string
  partial?: {
    programmazioni_processate: number
    individuazioni_create: number
  }
}

export interface FinalizeCampagnaRequest {
  campagne_individuazione_id: string
  campagne_programmazione_id: string
}

export interface FinalizeCampagnaResponse {
  success: boolean
  data?: {
    statistiche: {
      programmazioni_totali: number
      programmazioni_processate: number
      individuazioni_create: number
      artisti_distinti: number
      opere_distinte: number
    }
    campagna?: any
  }
  error?: string
}

export interface BatchProcessingProgress {
  phase: 'init' | 'processing' | 'finalizing' | 'completed' | 'error'
  programmazioni_totali: number
  programmazioni_processate: number
  individuazioni_create: number
  current_chunk: number
  total_chunks: number
  error?: string
}

// ============================================
// BATCH PROCESSING FUNCTIONS
// ============================================

/**
 * Inizializza una campagna_individuazione per il batch processing
 * Acquisisce anche un lock server-side per prevenire elaborazioni concorrenti
 */
export const initCampagnaIndividuazione = async (
  request: InitCampagnaRequest
): Promise<InitCampagnaResponse> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/campagne-individuazione/init', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    const data = await response.json()

    if (!response.ok) {
      // Return the full response including lock info for LOCKED_BY_OTHER
      return { 
        success: false, 
        error: data.error || 'Errore durante l\'inizializzazione',
        error_code: data.error_code,
        locked_by: data.locked_by,
        locked_since: data.locked_since,
        message: data.message
      }
    }

    return data as InitCampagnaResponse
  } catch (error: any) {
    return { success: false, error: error.message || 'Errore di connessione' }
  }
}

/**
 * Riprende una campagna_individuazione interrotta (es. sistema chiuso a metà).
 * Riusa la campagna_individuazione esistente SENZA eliminare nulla e SENZA
 * azzerare il flag `processato` — il processing continua dalle righe non ancora
 * processate. Rinnova il lock server-side per lo stesso utente.
 */
export const resumeCampagnaIndividuazione = async (
  request: { campagne_programmazione_id: string; campagne_individuazione_id?: string }
): Promise<InitCampagnaResponse> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/campagne-individuazione/resume', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Errore durante il resume',
        error_code: data.error_code,
        locked_by: data.locked_by,
        locked_since: data.locked_since,
        message: data.message
      }
    }

    return data as InitCampagnaResponse
  } catch (error: any) {
    return { success: false, error: error.message || 'Errore di connessione' }
  }
}

/**
 * Processa un chunk di programmazioni con retry automatico per errori 500/502
 */
export const processChunk = async (
  request: ProcessChunkRequest,
  retryCount = 0
): Promise<ProcessChunkResponse> => {
  const maxRetries = 3
  const baseDelayMs = 1000

  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/campagne-individuazione/process-chunk', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    // Verifica se la risposta è HTML (errore Cloudflare) invece di JSON
    const contentType = response.headers.get('content-type') || ''
    const isHtml = contentType.includes('text/html') || !contentType.includes('application/json')

    if (isHtml) {
      // Se riceviamo HTML, significa che Cloudflare ha restituito una pagina di errore
      const text = await response.text()
      const isRetryable = response.status === 500 || response.status === 502 || response.status === 503
      
      if (isRetryable && retryCount < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, retryCount)
        console.log(`[processChunk] Received HTML error page (${response.status}), retrying in ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
        return processChunk(request, retryCount + 1)
      }

      // Estrai informazioni utili dall'HTML se possibile
      const cloudflareRayMatch = text.match(/Cloudflare Ray ID[^<]*<strong[^>]*>([^<]+)<\/strong>/i)
      const rayId = cloudflareRayMatch ? cloudflareRayMatch[1] : 'unknown'
      
      return {
        success: false,
        error: `Errore del server (${response.status}). Cloudflare Ray ID: ${rayId}. ${isRetryable ? 'Tentativo di riconnessione fallito.' : 'Riprova più tardi.'}`
      }
    }

    // Prova a parsare come JSON
    let data: any
    try {
      data = await response.json()
    } catch (jsonError) {
      // Se anche il parsing JSON fallisce, potrebbe essere un errore di rete
      const isRetryable = response.status >= 500 && retryCount < maxRetries
      if (isRetryable) {
        const delayMs = baseDelayMs * Math.pow(2, retryCount)
        console.log(`[processChunk] Failed to parse JSON, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
        return processChunk(request, retryCount + 1)
      }
      return { 
        success: false, 
        error: `Errore di comunicazione con il server (${response.status}). Impossibile parsare la risposta.`
      }
    }

    if (!response.ok) {
      // Verifica se l'errore è retryable
      const isRetryable = 
        (response.status === 500 || response.status === 502 || response.status === 503) &&
        retryCount < maxRetries &&
        (data.retryable !== false) // Rispetta il flag retryable dal backend se presente

      if (isRetryable) {
        const delayMs = baseDelayMs * Math.pow(2, retryCount)
        console.log(`[processChunk] Server error ${response.status}, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
        return processChunk(request, retryCount + 1)
      }

      return { 
        success: false, 
        error: data.error || `Errore durante il processamento (${response.status})`,
        partial: data.partial
      }
    }

    return data as ProcessChunkResponse
  } catch (error: any) {
    // Errori di rete o altri errori
    const isRetryable = retryCount < maxRetries && (
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError') ||
      error.message?.includes('ECONNRESET') ||
      error.message?.includes('ETIMEDOUT')
    )

    if (isRetryable) {
      const delayMs = baseDelayMs * Math.pow(2, retryCount)
      console.log(`[processChunk] Network error, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries}):`, error.message)
      await new Promise(resolve => setTimeout(resolve, delayMs))
      return processChunk(request, retryCount + 1)
    }

    return { 
      success: false, 
      error: error.message || 'Errore di connessione'
    }
  }
}

/**
 * Finalizza una campagna_individuazione
 * Rilascia anche il lock server-side
 */
export const finalizeCampagnaIndividuazione = async (
  request: FinalizeCampagnaRequest
): Promise<FinalizeCampagnaResponse> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/campagne-individuazione/finalize', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Errore durante la finalizzazione' }
    }

    return data as FinalizeCampagnaResponse
  } catch (error: any) {
    return { success: false, error: error.message || 'Errore di connessione' }
  }
}

/**
 * Divide un array in chunk di dimensione specificata
 */
export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * Ottiene un batch di programmazione_ids con paginazione
 */
export const getBatchIds = async (
  request: GetBatchIdsRequest
): Promise<GetBatchIdsResponse> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/campagne-individuazione/get-batch-ids', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Errore durante il caricamento batch' }
    }

    return data as GetBatchIdsResponse
  } catch (error: any) {
    return { success: false, error: error.message || 'Errore di connessione' }
  }
}

/**
 * Processa una campagna_individuazione in batch con callback per il progresso
 */
type BatchProcessingOptions = {
  chunkSize?: number
  sogliaItolo?: number
  nomeCampagna?: string
  descrizione?: string
  artistaIds?: string[] | null  // Filtro artisti opzionale
  mandatoOverrideArtistIds?: string[] | null
  campagneIndividuazioneId?: string
  resume?: boolean              // Riprende un processo interrotto (skip righe già fatte)
}

export const processCampagnaIndividuazioneBatch = async (
  campagneProgrammazioneId: string,
  onProgress: (progress: BatchProcessingProgress) => void,
  options?: BatchProcessingOptions
): Promise<FinalizeCampagnaResponse> => {
  // Se è configurato il worker Node.js (Railway), delega a lui l'intera
  // orchestrazione: il browser fa solo start + polling e può chiudersi senza
  // fermare il processo. Altrimenti resta il path serverless legacy qui sotto.
  if (getIndividuazioneRuntimeMode() === 'worker') {
    return processCampagnaIndividuazioneViaWorker(campagneProgrammazioneId, onProgress, options)
  }

  const chunkSize = options?.chunkSize || 500
  const sogliaItolo = options?.sogliaItolo || 0.7
  const artistaIds = options?.artistaIds || null
  const mandatoOverrideArtistIds = options?.mandatoOverrideArtistIds || null
  const isResume = options?.resume === true
  const startTime = Date.now()

  let progress: BatchProcessingProgress = {
    phase: 'init',
    programmazioni_totali: 0,
    programmazioni_processate: 0,
    individuazioni_create: 0,
    current_chunk: 0,
    total_chunks: 0
  }

  try {
    // 1. Inizializzazione (o resume di un processo interrotto)
    console.log(`[Batch] Starting ${isResume ? 'resume' : 'init'} for campagna:`, campagneProgrammazioneId, 'at', new Date().toISOString())
    onProgress({ ...progress, phase: 'init' })

    const initResult = isResume
      ? await resumeCampagnaIndividuazione({
          campagne_programmazione_id: campagneProgrammazioneId,
          campagne_individuazione_id: options?.campagneIndividuazioneId,
        })
      : await initCampagnaIndividuazione({
          campagne_programmazione_id: campagneProgrammazioneId,
          nome_campagna_individuazione: options?.nomeCampagna,
          descrizione: options?.descrizione,
          mandato_override_artist_ids: mandatoOverrideArtistIds,
        })

    console.log('[Batch] Init result:', JSON.stringify(initResult, null, 2))

    if (!initResult.success || !initResult.data) {
      console.error('[Batch] Init failed:', initResult.error, 'Code:', initResult.error_code)
      
      // If locked by another user, return the lock info for the UI
      if (initResult.error_code === 'LOCKED_BY_OTHER') {
        return {
          success: false,
          error: initResult.message || initResult.error || 'Campagna già in elaborazione da un altro utente',
          error_code: initResult.error_code,
          locked_by: initResult.locked_by,
          locked_since: initResult.locked_since
        } as any
      }
      
      throw new Error(initResult.error || 'Errore durante l\'inizializzazione')
    }

    const { campagne_individuazione_id, programmazioni_totali, campagne_programmazione_id } = initResult.data
    console.log('[Batch] Init success - CI ID:', campagne_individuazione_id, 'Total prog:', programmazioni_totali)

    // 2. Calcola numero di chunk
    const totalChunks = Math.ceil(programmazioni_totali / chunkSize)
    console.log('[Batch] Will process', totalChunks, 'chunks of', chunkSize)
    
    progress = {
      ...progress,
      phase: 'processing',
      programmazioni_totali,
      total_chunks: totalChunks
    }
    onProgress(progress)

    // 3. Processa ogni chunk con cursor-based pagination (molto più veloce di OFFSET)
    let lastId: string | null = null
    let chunkIndex = 0
    let hasMore = true

    while (hasMore) {
      // Ottieni il batch di IDs usando cursor (last_id)
      console.log(`[Batch] Fetching IDs batch with cursor: ${lastId || 'START'}`)
      const batchResult = await getBatchIds({
        campagne_programmazione_id,
        campagne_individuazione_id,
        last_id: lastId,
        limit: chunkSize,
        // Sempre true: init azzera `processato` a inizio run fresh e il chunk lo
        // marca durante il processing, quindi sia il run nuovo che il resume
        // pescano solo le righe non processate. Evita il piano PK-scan + ORDER BY
        // id che mandava in timeout le campagne con id alti (es. Netflix 2025).
        only_unprocessed: true
      })

      if (!batchResult.success || !batchResult.data) {
        throw new Error(batchResult.error || 'Errore nel caricamento batch IDs')
      }

      const { programmazione_ids, has_more, last_id: newLastId } = batchResult.data
      hasMore = has_more
      lastId = newLastId  // Aggiorna cursor per il prossimo batch
      
      if (programmazione_ids.length === 0) {
        break
      }

      console.log(`[Batch] Processing chunk ${chunkIndex + 1}/${totalChunks} with ${programmazione_ids.length} items`)
      
      const chunkResult = await processChunk({
        campagne_individuazione_id,
        programmazione_ids,
        soglia_titolo: sogliaItolo,
        artista_ids: artistaIds,  // Passa il filtro artisti
        mandato_override_artist_ids: mandatoOverrideArtistIds,
      })

      console.log(`[Batch] Chunk ${chunkIndex + 1} result:`, chunkResult.success ? 'success' : 'failed', chunkResult.data || chunkResult.error)

      if (!chunkResult.success) {
        // Costruisci un messaggio di errore più dettagliato
        const errorMessage = chunkResult.error || `Errore nel chunk ${chunkIndex + 1}`
        const enhancedError = new Error(
          `${errorMessage} (Chunk ${chunkIndex + 1}/${totalChunks}, ${programmazione_ids.length} programmazioni)`
        )
        throw enhancedError
      }

      progress = {
        ...progress,
        programmazioni_processate: progress.programmazioni_processate + (chunkResult.data?.programmazioni_processate || 0),
        individuazioni_create: progress.individuazioni_create + (chunkResult.data?.individuazioni_create || 0),
        current_chunk: chunkIndex + 1
      }
      onProgress(progress)

      chunkIndex++
    }

    // 4. Finalizzazione
    console.log('[Batch] Finalizing...')
    progress = { ...progress, phase: 'finalizing' }
    onProgress(progress)

    const finalizeResult = await finalizeCampagnaIndividuazione({
      campagne_individuazione_id,
      campagne_programmazione_id
    })

    if (!finalizeResult.success) {
      throw new Error(finalizeResult.error || 'Errore durante la finalizzazione')
    }

    const endTime = Date.now()
    const tempoProcessamentoMs = endTime - startTime

    progress = { ...progress, phase: 'completed' }
    onProgress(progress)

    console.log('[Batch] Completed in', tempoProcessamentoMs, 'ms')

    return {
      success: true,
      data: {
        ...finalizeResult.data!,
        statistiche: ({
          ...(finalizeResult.data!.statistiche as any),
          campagne_individuazione_id,
          tempo_processamento_ms: tempoProcessamentoMs
        } as any)
      }
    }

  } catch (error: any) {
    progress = { ...progress, phase: 'error', error: error.message }
    onProgress(progress)

    return {
      success: false,
      error: error.message
    }
  }
}

// ============================================
// WORKER (Railway) — orchestrazione server-side
// ============================================

/**
 * URL del worker Node.js su Railway (senza slash finale), oppure null se non
 * configurato. Quando assente, il processing resta orchestrato dal browser.
 */
export const getWorkerUrl = (): string | null => {
  const url = process.env.NEXT_PUBLIC_WORKER_URL
  return url ? url.replace(/\/+$/, '') : null
}

export const getIndividuazioneRuntimeMode = (): 'worker' | 'legacy-serverless' =>
  getWorkerUrl() ? 'worker' : 'legacy-serverless'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const mapWorkerJobToProgress = (job: WorkerJobSnapshot): BatchProcessingProgress => ({
  phase: job.fase || 'processing',
  programmazioni_totali: job.programmazioni_totali ?? 0,
  programmazioni_processate: job.programmazioni_processate ?? 0,
  individuazioni_create: job.individuazioni_create ?? 0,
  current_chunk: job.current_chunk ?? 0,
  total_chunks: job.total_chunks ?? 0,
  error: job.error ?? undefined,
})

export const mapCompletedWorkerJob = (
  job: WorkerJobSnapshot,
  startTime: number
): FinalizeCampagnaResponse => ({
  success: true,
  data: {
    statistiche: {
      programmazioni_totali: job.programmazioni_totali ?? 0,
      programmazioni_processate: job.programmazioni_processate ?? 0,
      individuazioni_create: job.individuazioni_create ?? 0,
      artisti_distinti: 0,
      opere_distinte: 0,
      campagne_individuazione_id: job.campagne_individuazione_id,
      tempo_processamento_ms: Date.now() - startTime,
    } as any,
  },
})

export const mapTerminalWorkerJobError = (
  job: WorkerJobSnapshot
): FinalizeCampagnaResponse | null => {
  if (job.stato !== 'error' && job.stato !== 'cancelled') return null
  return { success: false, error: job.error || 'Job terminato con errore' }
}

/** Cerca il job attivo (queued/running) più recente per una campagna. */
export const findActiveWorkerJob = async (
  campagneProgrammazioneId?: string | null
): Promise<{
  jobId: string
  campagneProgrammazioneId: string
} | null> => {
  if (!campagneProgrammazioneId) return null

  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return null

  const { data, error } = await (supabase as any)
    .from('campaign_jobs')
    .select('id, campagne_programmazione_id')
    .eq('campagne_programmazione_id', campagneProgrammazioneId)
    .eq('created_by', userId)
    .in('stato', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return {
    jobId: data.id as string,
    campagneProgrammazioneId: data.campagne_programmazione_id as string,
  }
}

/**
 * Polling di un job già avviato (su Railway). Usato sia dal flusso normale
 * (dopo start) sia per il re-attach al reload di pagina.
 * `signal` permette di annullare il loop quando startProcess prende il controllo.
 */
export const pollWorkerJob = async (
  jobId: string,
  onProgress: (progress: BatchProcessingProgress) => void,
  startTime = Date.now(),
  signal?: AbortSignal
): Promise<FinalizeCampagnaResponse> => {
  const workerUrl = getWorkerUrl()
  if (!workerUrl) return { success: false, error: 'Worker non configurato' }

  let networkErrors = 0
  while (true) {
    if (signal?.aborted) return { success: false, error: 'Polling annullato' }
    await sleep(WORKER_POLL_INTERVAL_MS)
    if (signal?.aborted) return { success: false, error: 'Polling annullato' }

    let job: WorkerJobSnapshot | null
    try {
      const pollHeaders = await getAuthHeaders()
      const res = await fetch(`${workerUrl}/api/jobs/${jobId}`, { headers: pollHeaders })
      if (!res.ok) {
        if (++networkErrors > WORKER_MAX_NETWORK_ERRORS) throw new Error(`Worker non raggiungibile (${res.status})`)
        continue
      }
      const payload = await res.json()
      job = payload?.data as WorkerJobSnapshot | null
      networkErrors = 0
    } catch (e) {
      if (++networkErrors > WORKER_MAX_NETWORK_ERRORS) throw e as any
      continue
    }

    if (!job) continue

    onProgress(mapWorkerJobToProgress(job))

    if (job.stato === 'completed') {
      onProgress({ ...mapWorkerJobToProgress(job), phase: 'completed' })
      return mapCompletedWorkerJob(job, startTime)
    }

    const terminalError = mapTerminalWorkerJobError(job)
    if (terminalError) return terminalError
  }
}

/**
 * Variante di processCampagnaIndividuazioneBatch che delega al worker Railway.
 * Avvia il job (start), poi fa polling dello stato mappandolo su onProgress.
 * Il processo gira interamente server-side: chiudere il browser non lo ferma.
 */
const processCampagnaIndividuazioneViaWorker = async (
  campagneProgrammazioneId: string,
  onProgress: (progress: BatchProcessingProgress) => void,
  options?: BatchProcessingOptions
): Promise<FinalizeCampagnaResponse> => {
  const workerUrl = getWorkerUrl()!
  const startTime = Date.now()

  const baseProgress: BatchProcessingProgress = {
    phase: 'init',
    programmazioni_totali: 0,
    programmazioni_processate: 0,
    individuazioni_create: 0,
    current_chunk: 0,
    total_chunks: 0,
  }
  onProgress(baseProgress)

  try {
    // 1. Avvia (o riprende) il job
    const headers = await getAuthHeaders()
    const startRes = await fetch(`${workerUrl}/api/individuazione/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        campagne_programmazione_id: campagneProgrammazioneId,
        soglia_titolo: options?.sogliaItolo,
        artista_ids: options?.artistaIds ?? null,
        mandato_override_artist_ids: options?.mandatoOverrideArtistIds ?? null,
        nome_campagna: options?.nomeCampagna,
        descrizione: options?.descrizione,
        campagne_individuazione_id: options?.campagneIndividuazioneId,
        resume: options?.resume === true,
      }),
    })

    const startData = await startRes.json()
    // 202 = nuovo job; 409 con job_id = job già attivo → ci agganciamo a quello.
    const jobId: string | undefined = startData?.job_id
    if (!jobId) {
      throw new Error(startData?.error || 'Errore avvio job sul worker')
    }

    // 2. Polling (delegato a pollWorkerJob per permettere il re-attach al reload)
    return pollWorkerJob(jobId, onProgress, startTime)
  } catch (error: any) {
    onProgress({ ...baseProgress, phase: 'error', error: error.message })
    return { success: false, error: error.message || 'Errore di connessione al worker' }
  }
}

// ============================================
// LEGACY SYNC PROCESSING (deprecated)
// ============================================

export interface ProcessCampagnaIndividuazioneRequest {
  campagne_programmazione_id: string
  nome_campagna_individuazione?: string
  descrizione?: string
}

export interface ProcessCampagnaIndividuazioneStatistiche {
  programmazioni_processate: number
  programmazioni_totali: number
  individuazioni_create: number
  match_trovati: number
  match_scartati_duplicati: number
  tempo_processamento_ms: number
  errore: boolean
  data_processamento: string
}

export interface ProcessCampagnaIndividuazioneResponse {
  success: boolean
  data?: {
    campagne_individuazione_id: string
    statistiche: ProcessCampagnaIndividuazioneStatistiche
    campagna?: any
  }
  error?: string
  details?: string | null
}

/**
 * @deprecated Use processCampagnaIndividuazioneBatch instead
 */
export const processCampagnaIndividuazione = async (
  request: ProcessCampagnaIndividuazioneRequest
): Promise<ProcessCampagnaIndividuazioneResponse> => {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/campagne-individuazione/process', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Errore durante il processamento',
        details: data.details || null,
      }
    }

    return data as ProcessCampagnaIndividuazioneResponse
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Errore di connessione',
    }
  }
}
