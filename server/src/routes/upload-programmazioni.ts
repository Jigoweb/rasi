import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { supabaseService } from '../supabase.js'
import { findActiveJob, userOwnsCampagnaProgrammazione } from '../jobs/store.js'
import { runUploadProgrammazioniJob } from '../jobs/upload-programmazioni-runner.js'
import {
  createUploadJob,
  findActiveUploadJob,
  getUploadJobForUser,
} from '../jobs/upload-job-store.js'
import type { UploadMappingSnapshot } from '../jobs/programmazioni-import-core.js'

export const uploadProgrammazioniRouter = Router()
export const uploadJobsRouter = Router()

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function acquireLock(campagnaId: string, userId: string) {
  const { data, error } = await supabaseService.rpc('acquire_campagna_processing_lock', {
    p_campagna_id: campagnaId,
    p_user_id: userId,
    p_timeout_hours: 2,
  })
  if (error) return { success: false, error: error.message }
  return (data as { success: boolean; error?: string; error_code?: string }) ?? {
    success: false,
    error: 'Lock non disponibile',
  }
}

uploadProgrammazioniRouter.post('/start', requireAuth, async (req, res) => {
  const {
    campagne_programmazione_id,
    emittente_id,
    storage_path,
    file_name,
    file_type,
    mapping_snapshot,
    chunk_size,
  } = req.body ?? {}

  if (!campagne_programmazione_id || !UUID_RE.test(campagne_programmazione_id)) {
    return res.status(400).json({ success: false, error: 'campagne_programmazione_id non valido' })
  }
  if (!emittente_id || !UUID_RE.test(emittente_id)) {
    return res.status(400).json({ success: false, error: 'emittente_id non valido' })
  }
  if (!storage_path || typeof storage_path !== 'string' || !storage_path.startsWith(`${req.userId}/`)) {
    return res.status(400).json({ success: false, error: 'storage_path non valido' })
  }
  if (!file_name || typeof file_name !== 'string') {
    return res.status(400).json({ success: false, error: 'file_name non valido' })
  }
  if (!isValidMappingSnapshot(mapping_snapshot)) {
    return res.status(400).json({ success: false, error: 'mapping_snapshot non valido' })
  }

  try {
    const hasCampaignAccess = await userOwnsCampagnaProgrammazione(
      campagne_programmazione_id,
      req.userId!
    )
    if (!hasCampaignAccess) {
      return res.status(404).json({
        success: false,
        error: 'Campagna non trovata o non autorizzata',
      })
    }

    const activeUpload = await findActiveUploadJob(campagne_programmazione_id)
    if (activeUpload) {
      return res.status(409).json({
        success: false,
        error: 'Esiste già un upload attivo per questa campagna',
        error_code: 'UPLOAD_ALREADY_RUNNING',
        job_id: activeUpload.created_by === req.userId ? activeUpload.id : undefined,
      })
    }

    const activeIndividuazione = await findActiveJob(campagne_programmazione_id)
    if (activeIndividuazione) {
      return res.status(409).json({
        success: false,
        error: 'Esiste già un processamento attivo per questa campagna',
        error_code: 'CAMPAIGN_JOB_ALREADY_RUNNING',
      })
    }

    const lock = await acquireLock(campagne_programmazione_id, req.userId!)
    if (!lock.success) {
      return res.status(409).json({
        success: false,
        error: lock.error || 'Campagna già in lavorazione',
        error_code: lock.error_code || 'LOCK_UNAVAILABLE',
      })
    }

    await supabaseService
      .from('campagne_programmazione')
      .update({ stato: 'uploading', updated_at: new Date().toISOString() })
      .eq('id', campagne_programmazione_id)

    const job = await createUploadJob({
      campagna_programmazione_id: campagne_programmazione_id,
      storage_path,
      file_name,
      file_type: typeof file_type === 'string' ? file_type : 'application/octet-stream',
      mapping_snapshot,
      chunk_size: Math.max(100, Math.min(Number(chunk_size) || 500, 1000)),
      created_by: req.userId ?? null,
    })

    void runUploadProgrammazioniJob({
      jobId: job.id,
      campagneProgrammazioneId: campagne_programmazione_id,
      userId: req.userId!,
      emittenteId: emittente_id,
      storagePath: storage_path,
      fileName: file_name,
      mappingSnapshot: mapping_snapshot,
      chunkSize: job.chunk_size,
    })

    return res.status(202).json({ success: true, job_id: job.id })
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Errore avvio upload' })
  }
})

uploadJobsRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const job = await getUploadJobForUser(req.params.id, req.userId!)
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job upload non trovato' })
    }
    return res.json({ success: true, data: job })
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Errore lettura job upload' })
  }
})

function isValidMappingSnapshot(value: unknown): value is UploadMappingSnapshot {
  if (!value || typeof value !== 'object') return false
  const kind = (value as { kind?: unknown }).kind
  if (kind === 'legacy_template') return true
  if (kind === 'apply_existing') {
    const mapping = (value as { mapping?: unknown }).mapping
    return Boolean(mapping && typeof mapping === 'object')
  }
  return false
}
