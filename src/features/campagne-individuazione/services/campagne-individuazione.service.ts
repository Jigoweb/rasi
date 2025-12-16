// ============================================
// BATCH PROCESSING TYPES
// ============================================

export interface InitCampagnaRequest {
  campagne_programmazione_id: string
  nome_campagna_individuazione?: string
  descrizione?: string
}

export interface InitCampagnaResponse {
  success: boolean
  data?: {
    campagne_individuazione_id: string
    programmazioni_totali: number
    campagne_programmazione_id: string
  }
  error?: string
}

export interface GetBatchIdsRequest {
  campagne_programmazione_id: string
  offset: number
  limit: number
}

export interface GetBatchIdsResponse {
  success: boolean
  data?: {
    programmazione_ids: string[]
    count: number
    offset: number
    has_more: boolean
  }
  error?: string
}

export interface ProcessChunkRequest {
  campagne_individuazione_id: string
  programmazione_ids: string[]
  soglia_titolo?: number
  artista_ids?: string[] | null  // Filtro artisti opzionale
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
 */
export const initCampagnaIndividuazione = async (
  request: InitCampagnaRequest
): Promise<InitCampagnaResponse> => {
  try {
    const response = await fetch('/api/campagne-individuazione/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Errore durante l\'inizializzazione' }
    }

    return data as InitCampagnaResponse
  } catch (error: any) {
    return { success: false, error: error.message || 'Errore di connessione' }
  }
}

/**
 * Processa un chunk di programmazioni
 */
export const processChunk = async (
  request: ProcessChunkRequest
): Promise<ProcessChunkResponse> => {
  try {
    const response = await fetch('/api/campagne-individuazione/process-chunk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    const data = await response.json()

    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || 'Errore durante il processamento',
        partial: data.partial
      }
    }

    return data as ProcessChunkResponse
  } catch (error: any) {
    return { success: false, error: error.message || 'Errore di connessione' }
  }
}

/**
 * Finalizza una campagna_individuazione
 */
export const finalizeCampagnaIndividuazione = async (
  request: FinalizeCampagnaRequest
): Promise<FinalizeCampagnaResponse> => {
  try {
    const response = await fetch('/api/campagne-individuazione/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const response = await fetch('/api/campagne-individuazione/get-batch-ids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
export const processCampagnaIndividuazioneBatch = async (
  campagneProgrammazioneId: string,
  onProgress: (progress: BatchProcessingProgress) => void,
  options?: {
    chunkSize?: number
    sogliaItolo?: number
    nomeCampagna?: string
    descrizione?: string
    artistaIds?: string[] | null  // Filtro artisti opzionale
  }
): Promise<FinalizeCampagnaResponse> => {
  const chunkSize = options?.chunkSize || 500
  const sogliaItolo = options?.sogliaItolo || 0.7
  const artistaIds = options?.artistaIds || null
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
    // 1. Inizializzazione
    console.log('[Batch] Starting init for campagna:', campagneProgrammazioneId, 'at', new Date().toISOString())
    onProgress({ ...progress, phase: 'init' })

    const initResult = await initCampagnaIndividuazione({
      campagne_programmazione_id: campagneProgrammazioneId,
      nome_campagna_individuazione: options?.nomeCampagna,
      descrizione: options?.descrizione
    })

    console.log('[Batch] Init result:', JSON.stringify(initResult, null, 2))

    if (!initResult.success || !initResult.data) {
      console.error('[Batch] Init failed:', initResult.error)
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

    // 3. Processa ogni chunk con paginazione
    let offset = 0
    let chunkIndex = 0
    let hasMore = true

    while (hasMore) {
      // Ottieni il batch di IDs
      console.log(`[Batch] Fetching IDs batch at offset ${offset}`)
      const batchResult = await getBatchIds({
        campagne_programmazione_id,
        offset,
        limit: chunkSize
      })

      if (!batchResult.success || !batchResult.data) {
        throw new Error(batchResult.error || 'Errore nel caricamento batch IDs')
      }

      const { programmazione_ids, has_more } = batchResult.data
      hasMore = has_more
      
      if (programmazione_ids.length === 0) {
        break
      }

      console.log(`[Batch] Processing chunk ${chunkIndex + 1}/${totalChunks} with ${programmazione_ids.length} items`)
      
      const chunkResult = await processChunk({
        campagne_individuazione_id,
        programmazione_ids,
        soglia_titolo: sogliaItolo,
        artista_ids: artistaIds  // Passa il filtro artisti
      })

      console.log(`[Batch] Chunk ${chunkIndex + 1} result:`, chunkResult.success ? 'success' : 'failed', chunkResult.data || chunkResult.error)

      if (!chunkResult.success) {
        throw new Error(chunkResult.error || `Errore nel chunk ${chunkIndex + 1}`)
      }

      progress = {
        ...progress,
        programmazioni_processate: progress.programmazioni_processate + (chunkResult.data?.programmazioni_processate || 0),
        individuazioni_create: progress.individuazioni_create + (chunkResult.data?.individuazioni_create || 0),
        current_chunk: chunkIndex + 1
      }
      onProgress(progress)

      offset += chunkSize
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
    const response = await fetch('/api/campagne-individuazione/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
