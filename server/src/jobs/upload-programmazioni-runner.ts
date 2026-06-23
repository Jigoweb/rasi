import { supabaseService } from '../supabase.js'
import {
  buildProgrammazioniPayloads,
  parseProgrammazioniFile,
  type ProgrammazioneImportPayload,
  type UploadMappingSnapshot,
} from './programmazioni-import-core.js'
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

      if (payloads.length > 0) {
        try {
          const { attempted, insertedExact, duplicateSkippedExact } = await upsertProgrammazioniChunk(payloads)
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
    await patchUploadJob(jobId, {
      stato: 'completed',
      fase: 'completed',
      righe_processate: rows.length,
      righe_inserite: righeInserite,
      righe_duplicate_saltate: righeDuplicateSaltate,
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
