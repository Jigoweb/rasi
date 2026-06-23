import { supabaseService } from '../supabase.js'
import {
  buildProgrammazioniPayloads,
  parseProgrammazioniFile,
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
  await supabaseService.rpc('release_campagna_processing_lock', {
    p_campagna_id: campagnaId,
    p_user_id: userId,
    p_new_stato: newStato,
  })
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
        const { data, error } = await supabaseService
          .from('programmazioni')
          .upsert(payloads, {
            onConflict: 'import_row_uid',
            ignoreDuplicates: true,
          })
          .select('id')

        if (error) throw new Error(`insert chunk ${offset / chunkSize + 1}: ${error.message}`)
        const inserted = data?.length ?? 0
        righeInserite += inserted
        righeDuplicateSaltate += Math.max(payloads.length - inserted, 0)
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
  }
}
