import { supabaseService } from '../supabase.js'
import {
  buildProgrammazioniPayloads,
  parseProgrammazioniFile,
  type ProgrammazioneImportPayload,
  type UploadMappingSnapshot,
} from './programmazioni-import-core.js'
import { summarizeImportQuality } from './import-quality.js'
import { patchUploadJob } from './upload-job-store.js'

const BUCKET = 'programmazioni-uploads'

interface RunUploadOptions {
  jobId: string
  campagneProgrammazioneId: string
  userId: string
  emittenteId: string
  storagePath: string
  fileName: string
  mappingSnapshot: UploadMappingSnapshot
  chunkSize: number
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

  const result = data as { success?: boolean; error?: string } | null
  if (!result?.success) {
    throw new Error(`release lock: ${result?.error || 'rilascio lock non riuscito'}`)
  }
}

async function removeUploadedFile(storagePath: string): Promise<void> {
  const { error } = await supabaseService.storage
    .from(BUCKET)
    .remove([storagePath])

  if (error) {
    console.warn(`[upload-programmazioni] cleanup storage fallito per ${storagePath}: ${error.message}`)
  }
}

export async function upsertProgrammazioniChunk(
  payloads: ProgrammazioneImportPayload[]
): Promise<{ attempted: number; insertedExact: number | null; duplicateSkippedExact: number | null }> {
  if (payloads.length === 0) {
    return { attempted: 0, insertedExact: 0, duplicateSkippedExact: 0 }
  }

  const { error } = await supabaseService
    .from('programmazioni')
    .upsert(payloads, {
      onConflict: 'import_row_uid',
      ignoreDuplicates: true,
    })

  if (error) throw error
  // Without selecting returned rows, Supabase confirms the upsert request but not
  // exact inserted-vs-duplicate counts. Keep exact counters nullable internally.
  return {
    attempted: payloads.length,
    insertedExact: null,
    duplicateSkippedExact: null,
  }
}

/** Codici Postgres transitori: statement timeout, lock timeout. */
const TRANSIENT_PG_CODES = new Set(['57014', '55P03'])
const TRANSIENT_MESSAGE_RX =
  /statement timeout|canceling statement|lock timeout|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|\b50[234]\b/i

/**
 * Errori per cui ha senso ritentare lo stesso blocco. Il caso reale: PLEX AVOD
 * 2024 (11/11/2026) si è fermato al blocco 75 di 153 con «canceling statement
 * due to statement timeout» (limite 8 s del ruolo API) e il file è stato perso.
 */
export function isTransientChunkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const { code, message } = error as { code?: unknown; message?: unknown }
  if (typeof code === 'string' && TRANSIENT_PG_CODES.has(code)) return true
  return typeof message === 'string' && TRANSIENT_MESSAGE_RX.test(message)
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Inserisce un blocco ritentando sugli errori transitori. È sicuro ripetere:
 * ogni riga ha import_row_uid deterministico e l'upsert ignora i duplicati,
 * quindi un tentativo parzialmente riuscito non crea doppioni.
 */
export async function upsertChunkWithRetry(
  payloads: ProgrammazioneImportPayload[],
  options: {
    delaysMs?: number[]
    sleep?: (ms: number) => Promise<void>
    upsert?: typeof upsertProgrammazioniChunk
    onRetry?: (attempt: number, error: unknown) => void
  } = {},
): Promise<Awaited<ReturnType<typeof upsertProgrammazioniChunk>>> {
  const delays = options.delaysMs ?? [2000, 5000, 10000]
  const sleep = options.sleep ?? defaultSleep
  const upsert = options.upsert ?? upsertProgrammazioniChunk
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await upsert(payloads)
    } catch (error) {
      if (attempt >= delays.length || !isTransientChunkError(error)) throw error
      options.onRetry?.(attempt + 1, error)
      await sleep(delays[attempt])
    }
  }
}

export async function runUploadProgrammazioniJob(opts: RunUploadOptions): Promise<void> {
  const {
    jobId,
    campagneProgrammazioneId,
    userId,
    emittenteId,
    storagePath,
    fileName,
    mappingSnapshot,
    chunkSize,
  } = opts

  try {
    await patchUploadJob(jobId, { stato: 'running', fase: 'downloading' })

    const { data: fileData, error: downloadError } = await supabaseService.storage
      .from(BUCKET)
      .download(storagePath)

    if (downloadError) throw new Error(`download file: ${downloadError.message}`)
    const fileBuffer = Buffer.from(await fileData.arrayBuffer())

    await patchUploadJob(jobId, { fase: 'parsing' })
    const rows = parseProgrammazioniFile(fileBuffer, fileName)
    const totalChunks = Math.ceil(rows.length / chunkSize) || 0

    await patchUploadJob(jobId, {
      righe_totali: rows.length,
      total_chunks: totalChunks,
      fase: 'inserting',
    })

    let righeInserite = 0
    let righeDuplicateSaltate = 0
    const qualityPayloads: ProgrammazioneImportPayload[] = []

    for (let offset = 0; offset < rows.length; offset += chunkSize) {
      const chunk = rows.slice(offset, offset + chunkSize)
      const payloads = buildProgrammazioniPayloads(
        chunk,
        mappingSnapshot,
        {
          campagnaProgrammazioneId: campagneProgrammazioneId,
          emittenteId,
        },
        offset + 1
      )
      qualityPayloads.push(...payloads)

      if (payloads.length > 0) {
        try {
          const { attempted, insertedExact, duplicateSkippedExact } = await upsertChunkWithRetry(payloads, {
            onRetry: (attempt, error) => {
              const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error)
              console.warn(`[upload-programmazioni] job ${jobId} blocco ${offset / chunkSize + 1}: nuovo tentativo ${attempt} dopo «${message}»`)
            },
          })
          righeInserite += insertedExact ?? attempted
          righeDuplicateSaltate += duplicateSkippedExact ?? 0
        } catch (error: any) {
          throw new Error(`insert chunk ${offset / chunkSize + 1}: ${error.message}`)
        }
      }

      await patchUploadJob(jobId, {
        current_chunk: Math.floor(offset / chunkSize) + 1,
        righe_processate: Math.min(offset + chunk.length, rows.length),
        righe_inserite: righeInserite,
        righe_duplicate_saltate: righeDuplicateSaltate,
      })
    }

    await releaseLock(campagneProgrammazioneId, userId, 'in_review')
    const qualityReport = summarizeImportQuality(qualityPayloads)
    await patchUploadJob(jobId, {
      stato: 'completed',
      fase: 'completed',
      righe_processate: rows.length,
      righe_inserite: righeInserite,
      righe_duplicate_saltate: righeDuplicateSaltate,
      quality_report: qualityReport,
    })
    await removeUploadedFile(storagePath)
  } catch (error: any) {
    try {
      await releaseLock(campagneProgrammazioneId, userId, 'in_review')
    } catch {
      /* best effort */
    }

    await patchUploadJob(jobId, {
      stato: 'error',
      fase: 'error',
      error: error.message || 'Errore inatteso upload programmazioni',
    })
    await removeUploadedFile(storagePath)
  }
}
