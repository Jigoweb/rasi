import { supabase } from '@/shared/lib/supabase'
import { getWorkerUrl } from '@/features/campagne-individuazione/services/campagne-individuazione.service'
import type { ImportMappingConfig, UploadDecision } from './import-mapping.service'

const UPLOAD_BUCKET = 'programmazioni-uploads'
const UPLOAD_POLL_INTERVAL_MS = 2500
const UPLOAD_MAX_NETWORK_ERRORS = 10

export type UploadMappingSnapshot =
  | { kind: 'legacy_template' }
  | { kind: 'apply_existing'; mapping: ImportMappingConfig }

export interface UploadJobSnapshot {
  id: string
  campagna_programmazione_id: string
  stato: 'queued' | 'running' | 'completed' | 'error' | 'cancelled'
  fase: string | null
  righe_totali: number
  righe_processate: number
  righe_inserite: number
  righe_duplicate_saltate: number
  current_chunk: number
  total_chunks: number
  error: string | null
}

export function getUploadMappingSnapshot(decision: UploadDecision): UploadMappingSnapshot {
  if (decision.kind === 'apply_existing') {
    return { kind: 'apply_existing', mapping: decision.mapping }
  }
  if (decision.kind === 'warn_format_changed') {
    return { kind: 'apply_existing', mapping: decision.mapping }
  }
  return { kind: 'legacy_template' }
}

export async function computeImportRowUid(
  campagnaProgrammazioneId: string,
  rowIndex: number,
  row: Record<string, unknown>
): Promise<string> {
  const sortedRow = Object.keys(row)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = row[key]
      return acc
    }, {})
  const input = `${campagnaProgrammazioneId}:${rowIndex}:${JSON.stringify(sortedRow)}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function uploadProgrammazioniFileToStorage(
  file: File,
  campagnaProgrammazioneId: string
): Promise<{ storagePath: string; error: Error | null }> {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return { storagePath: '', error: new Error('Utente non autenticato') }

  const safeName = file.name.replace(/[^\w.\-]+/g, '_')
  const storagePath = `${userId}/${campagnaProgrammazioneId}/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage
    .from(UPLOAD_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })

  return { storagePath, error: error ? new Error(error.message) : null }
}

export async function startUploadProgrammazioniJob(params: {
  campagneProgrammazioneId: string
  emittenteId: string
  storagePath: string
  fileName: string
  fileType: string
  mappingSnapshot: UploadMappingSnapshot
  chunkSize?: number
}): Promise<{ success: boolean; jobId?: string; error?: string; errorCode?: string }> {
  const workerUrl = getWorkerUrl()
  if (!workerUrl) return { success: false, error: 'Worker non configurato' }

  const headers = await getAuthHeaders()
  const response = await fetch(`${workerUrl}/api/upload-programmazioni/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      campagne_programmazione_id: params.campagneProgrammazioneId,
      emittente_id: params.emittenteId,
      storage_path: params.storagePath,
      file_name: params.fileName,
      file_type: params.fileType,
      mapping_snapshot: params.mappingSnapshot,
      chunk_size: params.chunkSize ?? 500,
    }),
  })

  const payload = await response.json()
  if (!response.ok || !payload?.job_id) {
    return {
      success: false,
      error: payload?.error || 'Errore avvio upload sul worker',
      errorCode: payload?.error_code,
    }
  }

  return { success: true, jobId: payload.job_id }
}

export async function pollUploadProgrammazioniJob(
  jobId: string,
  onProgress: (job: UploadJobSnapshot) => void
): Promise<{ success: boolean; job?: UploadJobSnapshot; error?: string }> {
  const workerUrl = getWorkerUrl()
  if (!workerUrl) return { success: false, error: 'Worker non configurato' }

  let networkErrors = 0
  while (true) {
    await new Promise(resolve => setTimeout(resolve, UPLOAD_POLL_INTERVAL_MS))

    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${workerUrl}/api/upload-jobs/${jobId}`, { headers })
      if (!response.ok) {
        if (++networkErrors > UPLOAD_MAX_NETWORK_ERRORS) {
          return { success: false, error: `Worker non raggiungibile (${response.status})` }
        }
        continue
      }

      const payload = await response.json()
      const job = payload?.data as UploadJobSnapshot
      networkErrors = 0
      onProgress(job)

      if (job.stato === 'completed') return { success: true, job }
      if (job.stato === 'error' || job.stato === 'cancelled') {
        return { success: false, job, error: job.error || 'Upload terminato con errore' }
      }
    } catch (error: any) {
      if (++networkErrors > UPLOAD_MAX_NETWORK_ERRORS) {
        return { success: false, error: error.message || 'Errore polling upload' }
      }
    }
  }
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  return headers
}
