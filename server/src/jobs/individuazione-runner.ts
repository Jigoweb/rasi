import { config } from '../config.js'
import { supabaseService } from '../supabase.js'
import { patchJob } from './store.js'

/**
 * Orchestratore dell'individuazione, eseguito interamente server-side.
 *
 * Replica la logica che prima girava nel browser
 * (`processCampagnaIndividuazioneBatch`), ma chiamando direttamente le RPC
 * Postgres tramite il client service-role, SENZA i limiti di timeout serverless.
 *
 * Il lavoro pesante resta dentro Postgres (process_programmazioni_chunk &c.):
 * qui facciamo solo init/lock → loop dei chunk → finalize → release lock,
 * aggiornando la riga `campaign_jobs` a ogni passo per il polling del client.
 */

export interface RunOptions {
  campagneProgrammazioneId: string
  userId: string
  jobId: string
  sogliaItolo?: number
  artistaIds?: string[] | null
  mandatoOverrideArtistIds?: string[] | null
  campagneIndividuazioneId?: string | null
  nomeCampagna?: string
  descrizione?: string
  resume?: boolean
}

interface LockResult {
  success: boolean
  error?: string
  error_code?: string
  locked_by?: string
  locked_since?: string
}

async function getCampagnaProgrammazioneStato(campagnaId: string): Promise<string | null> {
  const { data, error } = await supabaseService
    .from('campagne_programmazione')
    .select('stato')
    .eq('id', campagnaId)
    .maybeSingle()

  if (error) throw new Error(`get campagna stato: ${error.message}`)
  return typeof data?.stato === 'string' ? data.stato : null
}

/** Acquisisce/rinnova il lock server-side della campagna. */
async function acquireLock(
  campagnaId: string,
  userId: string
): Promise<LockResult> {
  const { data, error } = await supabaseService.rpc(
    'acquire_campagna_processing_lock',
    { p_campagna_id: campagnaId, p_user_id: userId, p_timeout_hours: 2 }
  )
  if (error) return { success: false, error: error.message }
  return (data as LockResult) ?? { success: false, error: 'Lock non disponibile' }
}

async function releaseLock(
  campagnaId: string,
  userId: string,
  newStato: string
): Promise<void> {
  const { data, error } = await supabaseService.rpc('release_campagna_processing_lock', {
    p_campagna_id: campagnaId,
    p_user_id: userId,
    p_new_stato: newStato,
  })

  if (error) throw new Error(`release lock: ${error.message}`)

  const result = data as LockResult | null
  if (!result?.success) {
    throw new Error(`release lock: ${result?.error || 'rilascio lock non riuscito'}`)
  }
}

/**
 * Carica un batch di id programmazione non ancora processate.
 * Replica /api/campagne-individuazione/get-batch-ids con only_unprocessed=true:
 * il chunk marca processato=true, quindi le righe spariscono dal filtro e
 * l'avanzamento è garantito senza cursore (evita il piano PK-scan + ORDER BY).
 */
async function getUnprocessedBatch(
  campagnaProgrammazioneId: string,
  campagnaIndividuazioneId: string | null,
  limit: number
): Promise<string[]> {
  const { data, error } = await supabaseService.rpc(
    'get_campagna_unprocessed_programmazione_ids',
    {
      p_campagne_programmazione_id: campagnaProgrammazioneId,
      p_campagne_individuazione_id: campagnaIndividuazioneId,
      p_limit: limit,
    }
  )

  if (error) throw new Error(`getUnprocessedBatch: ${error.message}`)
  return (data ?? []).map((r: { id: string }) => r.id)
}

interface ChunkResult {
  success: boolean
  error?: string
  programmazioni_processate?: number
  programmazioni_con_match?: number
  individuazioni_create?: number
  match_trovati?: number
}

function isStatementTimeout(message: string | undefined): boolean {
  return Boolean(message?.toLowerCase().includes('statement timeout'))
}

function sumChunkResults(results: ChunkResult[]): ChunkResult {
  return results.reduce<ChunkResult>(
    (acc, result) => ({
      success: acc.success && result.success,
      programmazioni_processate:
        (acc.programmazioni_processate ?? 0) + (result.programmazioni_processate ?? 0),
      programmazioni_con_match:
        (acc.programmazioni_con_match ?? 0) + (result.programmazioni_con_match ?? 0),
      individuazioni_create:
        (acc.individuazioni_create ?? 0) + (result.individuazioni_create ?? 0),
      match_trovati: (acc.match_trovati ?? 0) + (result.match_trovati ?? 0),
    }),
    { success: true, programmazioni_processate: 0, programmazioni_con_match: 0, individuazioni_create: 0, match_trovati: 0 }
  )
}

/**
 * Processa un chunk con timeout + retry esponenziale (come la route serverless,
 * ma senza il vincolo dei 60s di Vercel: qui il timeout è solo una salvaguardia).
 */
async function processChunk(
  campagneIndividuazioneId: string,
  programmazioneIds: string[],
  sogliaItolo: number,
  artistaIds: string[] | null,
  mandatoOverrideArtistIds: string[] | null
): Promise<ChunkResult> {
  const maxRetries = 3
  const baseDelayMs = 1000
  const timeoutMs = 120000

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** (attempt - 1)))
    }

    try {
      const rpcPromise = supabaseService.rpc('process_programmazioni_chunk', {
        p_campagne_individuazione_id: campagneIndividuazioneId,
        p_programmazione_ids: programmazioneIds,
        p_soglia_titolo: sogliaItolo,
        p_artista_ids: artistaIds,
        p_tolleranza_anno_soft: 3,
        p_tolleranza_anno_hard: 5,
        p_mandato_override_artist_ids: mandatoOverrideArtistIds,
      })

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`RPC timeout dopo ${timeoutMs}ms`)), timeoutMs)
      )

      const { data, error } = (await Promise.race([rpcPromise, timeoutPromise])) as any

      if (error) {
        lastError = error
        const retryable =
          error.message?.includes('timeout') ||
          error.code === 'PGRST116' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT'
        if (!retryable || attempt === maxRetries) {
          if (isStatementTimeout(error.message) && programmazioneIds.length > 1) {
            return processChunkInHalves(
              campagneIndividuazioneId,
              programmazioneIds,
              sogliaItolo,
              artistaIds,
              mandatoOverrideArtistIds
            )
          }
          return { success: false, error: error.message }
        }
        continue
      }

      const result = data as ChunkResult
      if (result?.success) return result

      // Risultato non riuscito ma non retryable
      return { success: false, error: result?.error || 'Chunk non riuscito' }
    } catch (err: any) {
      lastError = err
      if (attempt === maxRetries) {
        if (isStatementTimeout(err.message) && programmazioneIds.length > 1) {
          return processChunkInHalves(
            campagneIndividuazioneId,
            programmazioneIds,
            sogliaItolo,
            artistaIds,
            mandatoOverrideArtistIds
          )
        }
        return { success: false, error: err.message || 'Errore chunk' }
      }
    }
  }

  return { success: false, error: lastError?.message || 'Chunk fallito dopo i retry' }
}

async function processChunkInHalves(
  campagneIndividuazioneId: string,
  programmazioneIds: string[],
  sogliaItolo: number,
  artistaIds: string[] | null,
  mandatoOverrideArtistIds: string[] | null
): Promise<ChunkResult> {
  const midpoint = Math.ceil(programmazioneIds.length / 2)
  const left = await processChunk(
    campagneIndividuazioneId,
    programmazioneIds.slice(0, midpoint),
    sogliaItolo,
    artistaIds,
    mandatoOverrideArtistIds
  )
  if (!left.success) return left

  const right = await processChunk(
    campagneIndividuazioneId,
    programmazioneIds.slice(midpoint),
    sogliaItolo,
    artistaIds,
    mandatoOverrideArtistIds
  )
  if (!right.success) return right

  return sumChunkResults([left, right])
}

/**
 * Punto di ingresso del job. NON lancia: in caso di errore aggiorna il job a
 * stato 'error' e rilascia il lock. Va invocato senza await dalla route.
 */
export async function runIndividuazioneJob(opts: RunOptions): Promise<void> {
  const {
    campagneProgrammazioneId,
    userId,
    jobId,
    sogliaItolo = 0.7,
    artistaIds = null,
    mandatoOverrideArtistIds = null,
    campagneIndividuazioneId: requestedCampagneIndividuazioneId = null,
    nomeCampagna,
    descrizione,
    resume = false,
  } = opts

  let rollbackStato = 'in_review'

  try {
    await patchJob(jobId, { stato: 'running', fase: 'init' })
    rollbackStato = await getCampagnaProgrammazioneStato(campagneProgrammazioneId) ?? rollbackStato

    // 1. Lock
    const lock = await acquireLock(campagneProgrammazioneId, userId)
    if (!lock.success) {
      const msg =
        lock.error_code === 'LOCKED_BY_OTHER'
          ? 'Campagna già in elaborazione da un altro utente'
          : lock.error || 'Impossibile acquisire il lock'
      await patchJob(jobId, { stato: 'error', fase: 'error', error: msg })
      return
    }

    // 2. Init (fresh) o resume
    let campagneIndividuazioneId: string
    let programmazioniTotali: number

    if (resume) {
      let ciQuery = supabaseService
        .from('campagne_individuazione')
        .select('id')
        .eq('campagne_programmazione_id', campagneProgrammazioneId)

      if (requestedCampagneIndividuazioneId) {
        ciQuery = ciQuery.eq('id', requestedCampagneIndividuazioneId)
      } else {
        ciQuery = ciQuery.order('updated_at', { ascending: false }).limit(1)
      }

      const { data: ci, error } = await ciQuery.maybeSingle()

      if (error) throw new Error(error.message)
      if (!ci?.id) {
        await releaseLock(campagneProgrammazioneId, userId, rollbackStato)
        await patchJob(jobId, {
          stato: 'error',
          fase: 'error',
          error: 'Nessuna individuazione da riprendere',
        })
        return
      }
      campagneIndividuazioneId = ci.id as string

      const { count } = await supabaseService
        .from('programmazioni')
        .select('id', { count: 'exact', head: true })
        .eq('campagna_programmazione_id', campagneProgrammazioneId)
      programmazioniTotali = count ?? 0
    } else {
      const { data: initResult, error: initError } = await supabaseService.rpc(
        'init_campagna_individuazione',
        {
          p_campagne_programmazione_id: campagneProgrammazioneId,
          p_nome_campagna_individuazione: nomeCampagna ?? null,
          p_descrizione: descrizione ?? null,
          p_mandato_override_artist_ids: mandatoOverrideArtistIds,
        }
      )

      if (initError) throw new Error(initError.message)
      const r = initResult as any
      if (!r || r.success === false) {
        await releaseLock(campagneProgrammazioneId, userId, rollbackStato)
        await patchJob(jobId, {
          stato: 'error',
          fase: 'error',
          error: r?.error || 'Init fallito',
        })
        return
      }
      campagneIndividuazioneId = r.campagne_individuazione_id
      programmazioniTotali = r.programmazioni_totali ?? 0
    }

    const totalChunks = Math.ceil(programmazioniTotali / config.chunkSize) || 0
    await patchJob(jobId, {
      fase: 'processing',
      campagne_individuazione_id: campagneIndividuazioneId,
      programmazioni_totali: programmazioniTotali,
      total_chunks: totalChunks,
    })

    // 3. Loop dei chunk
    let processate = 0
    let individuazioni = 0
    let chunkIndex = 0

    while (true) {
      const ids = await getUnprocessedBatch(campagneProgrammazioneId, campagneIndividuazioneId, config.chunkSize)
      if (ids.length === 0) break

      const result = await processChunk(
        campagneIndividuazioneId,
        ids,
        sogliaItolo,
        artistaIds,
        mandatoOverrideArtistIds
      )

      if (!result.success) {
        // Il lock resta: l'utente potrà riprendere (resume) da dove si è fermato.
        await patchJob(jobId, {
          stato: 'error',
          fase: 'error',
          error: `Errore chunk ${chunkIndex + 1}: ${result.error}`,
          current_chunk: chunkIndex,
          programmazioni_processate: processate,
          individuazioni_create: individuazioni,
        })
        return
      }

      processate += result.programmazioni_processate ?? 0
      individuazioni += result.individuazioni_create ?? 0
      chunkIndex++

      await patchJob(jobId, {
        current_chunk: chunkIndex,
        programmazioni_processate: processate,
        individuazioni_create: individuazioni,
      })
    }

    // 4. Finalize
    await patchJob(jobId, { fase: 'finalizing' })
    const { data: finalizeResult, error: finalizeError } = await supabaseService.rpc(
      'finalize_campagna_individuazione',
      {
        p_campagne_individuazione_id: campagneIndividuazioneId,
        p_campagne_programmazione_id: campagneProgrammazioneId,
      }
    )

    const finalizeOk = !finalizeError && (finalizeResult as any)?.success
    await releaseLock(
      campagneProgrammazioneId,
      userId,
      finalizeOk ? 'individuata' : rollbackStato
    )

    if (!finalizeOk) {
      await patchJob(jobId, {
        stato: 'error',
        fase: 'error',
        error: finalizeError?.message || (finalizeResult as any)?.error || 'Finalize fallito',
      })
      return
    }

    await patchJob(jobId, {
      stato: 'completed',
      fase: 'completed',
      programmazioni_processate: processate,
      individuazioni_create: individuazioni,
    })
  } catch (error: any) {
    // Salvaguardia: rilascia il lock e segna l'errore. Il lock comunque scade
    // da solo dopo il timeout in caso di crash totale del processo.
    try {
      await releaseLock(campagneProgrammazioneId, userId, rollbackStato)
    } catch {
      /* best effort */
    }
    await patchJob(jobId, {
      stato: 'error',
      fase: 'error',
      error: error.message || 'Errore inatteso nel job',
    })
  }
}
