import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { supabaseService } from '../supabase.js'
import { findActiveJob, userOwnsCampagnaProgrammazione } from '../jobs/store.js'
import { runUploadProgrammazioniJob } from '../jobs/upload-programmazioni-runner.js'
import {
  createUploadJob,
  findActiveUploadJob,
  getUploadJobForUser,
  userOwnsCampagnaEmittente,
} from '../jobs/upload-job-store.js'
import type { UploadMappingSnapshot } from '../jobs/programmazioni-import-core.js'

export const uploadProgrammazioniRouter = Router()
export const uploadJobsRouter = Router()

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const TEMPLATE_FIELDS = new Set([
  'titolo',
  'tipo',
  'data_trasmissione',
  'ora_inizio',
  'ora_fine',
  'durata_minuti',
  'titolo_originale',
  'numero_episodio',
  'titolo_episodio',
  'titolo_episodio_originale',
  'numero_stagione',
  'anno',
  'production',
  'regia',
  'data_inizio',
  'data_fine',
  'retail_price',
  'sales_month',
  'track_price_local_currency',
  'views',
  'total_net_ad_revenue',
  'total_revenue',
  'canale',
  'emittente',
])

export function normalizeUploadChunkSize(value: unknown): number {
  return Math.max(100, Math.min(Number(value) || 500, 1000))
}

export function isValidUploadStoragePath(
  storagePath: unknown,
  userId: string,
  campagnaProgrammazioneId: string
): storagePath is string {
  if (typeof storagePath !== 'string') return false
  const parts = storagePath.split('/')
  if (parts.length < 3) return false
  const [pathUserId, pathCampagnaId, ...fileParts] = parts
  if (pathUserId !== userId || pathCampagnaId !== campagnaProgrammazioneId) return false
  if (fileParts.length === 0) return false
  return fileParts.every(part => part.length > 0 && part !== '.' && part !== '..')
}

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
  if (!isValidUploadStoragePath(storage_path, req.userId!, campagne_programmazione_id)) {
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

    const hasEmittenteAccess = await userOwnsCampagnaEmittente(
      campagne_programmazione_id,
      emittente_id,
      req.userId!
    )
    if (!hasEmittenteAccess) {
      return res.status(404).json({
        success: false,
        error: 'Emittente non trovata per questa campagna',
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
      chunk_size: normalizeUploadChunkSize(chunk_size),
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

export function isValidMappingSnapshot(value: unknown): value is UploadMappingSnapshot {
  if (!value || typeof value !== 'object') return false
  const kind = (value as { kind?: unknown }).kind
  if (kind === 'legacy_template') return true
  if (kind === 'apply_existing') {
    const mapping = (value as { mapping?: unknown }).mapping
    return isValidImportMappingConfig(mapping)
  }
  return false
}

function isValidImportMappingConfig(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const config = value as {
    version?: unknown
    colonne_rilevate?: unknown
    mapping?: unknown
    rules?: unknown
    transforms?: unknown
  }
  if (config.version !== 1) return false
  if (!Array.isArray(config.colonne_rilevate)) return false
  if (!config.colonne_rilevate.every(column => typeof column === 'string' && column.length > 0)) {
    return false
  }
  if (!config.mapping || typeof config.mapping !== 'object' || Array.isArray(config.mapping)) {
    return false
  }

  const sourceColumns = new Set(config.colonne_rilevate)
  for (const [source, target] of Object.entries(config.mapping as Record<string, unknown>)) {
    if (!sourceColumns.has(source)) return false
    if (typeof target !== 'string' || !TEMPLATE_FIELDS.has(target)) return false
  }

  if (config.rules !== undefined) {
    if (!config.rules || typeof config.rules !== 'object' || Array.isArray(config.rules)) return false
    for (const [target, ruleValue] of Object.entries(config.rules as Record<string, unknown>)) {
      if (!TEMPLATE_FIELDS.has(target)) return false
      if (!ruleValue || typeof ruleValue !== 'object' || Array.isArray(ruleValue)) return false
      const rule = ruleValue as { sources?: unknown; onlyIfPresent?: unknown }
      if (!Array.isArray(rule.sources) || rule.sources.length === 0) return false
      if (!rule.sources.every(source => typeof source === 'string' && sourceColumns.has(source))) {
        return false
      }
      if (
        rule.onlyIfPresent !== undefined &&
        (typeof rule.onlyIfPresent !== 'string' || !sourceColumns.has(rule.onlyIfPresent))
      ) {
        return false
      }
    }
  }

  if (config.transforms !== undefined) {
    if (!config.transforms || typeof config.transforms !== 'object' || Array.isArray(config.transforms)) return false
    for (const source of Object.keys(config.transforms as Record<string, unknown>)) {
      if (!sourceColumns.has(source)) return false
    }
  }

  return true
}
