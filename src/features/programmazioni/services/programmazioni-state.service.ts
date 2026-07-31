import { isProcessingStale, type ProcessingJobState, type ProcessingProgress } from './programmazioni.service'

/** Allineato al cutoff worker (30 min) per job upload senza progresso. */
export const UPLOAD_STALE_THRESHOLD_MS = 30 * 60 * 1000

export type ProgrammazioneRowBadge =
  | 'bozza'
  | 'in_review'
  | 'individuata'
  | 'uploading'
  | 'upload_error'
  | 'individuazione_running'
  | 'individuazione_stale'
  | 'deleting'
  | 'error'

export interface ProgrammazioneOperationalState {
  datasetStatus: string
  uploadJob?: {
    stato: string
    righe_processate?: number
    righe_totali?: number
    updated_at?: string | null
    error?: string | null
  } | null
  campaignJob?: {
    stato?: ProcessingJobState | string | null
    updated_at?: string | null
    error?: string | null
  } | null
  progress?: Pick<ProcessingProgress, 'last_activity_at' | 'job_stato'> | null
  individuazioneStatus?: string | null
  hasLocalRuntimeProcess: boolean
  hasData: boolean
  now?: number
}

export interface ProgrammazioneRowState {
  badge: ProgrammazioneRowBadge
  canUpload: boolean
  canCreateIndividuazione: boolean
  canResumeIndividuazione: boolean
  blockingReason?: string
}

export type ProcessingOperationalState =
  | 'idle'
  | 'running'
  | 'stale'
  | 'recoverable_unknown'
  | 'error_recent'
  | 'error_old'

export function isUploadJobStale(
  job: { stato?: string | null; updated_at?: string | null } | null | undefined,
  now = Date.now(),
): boolean {
  if (!job?.stato) return false
  if (job.stato !== 'queued' && job.stato !== 'running') return false
  if (!job.updated_at) return true
  const updatedTime = new Date(job.updated_at).getTime()
  if (Number.isNaN(updatedTime)) return true
  return now - updatedTime > UPLOAD_STALE_THRESHOLD_MS
}

export function classifyProcessingOperationalState(
  input: Pick<
    ProgrammazioneOperationalState,
    'datasetStatus' | 'campaignJob' | 'progress' | 'hasLocalRuntimeProcess' | 'now'
  >
): ProcessingOperationalState {
  const campaignJobStatus = input.campaignJob?.stato ?? input.progress?.job_stato
  const hasActiveCampaignJob =
    campaignJobStatus === 'queued' ||
    campaignJobStatus === 'running' ||
    input.hasLocalRuntimeProcess
  const hasIndividuazioneInCorso = input.datasetStatus === 'in_corso'

  if (hasActiveCampaignJob) {
    return 'running'
  }

  if (campaignJobStatus === 'error') {
    return isRecent(input.campaignJob?.updated_at, input.now) ? 'error_recent' : 'error_old'
  }

  if (isProcessingStale(input.progress, input.now)) {
    return 'stale'
  }

  if (hasIndividuazioneInCorso && !input.progress?.last_activity_at) {
    return 'recoverable_unknown'
  }

  return 'idle'
}

export function getProgrammazioneRowState(input: ProgrammazioneOperationalState): ProgrammazioneRowState {
  const datasetStatus = input.datasetStatus
  const uploadJobStatus = input.uploadJob?.stato
  const uploadStale = isUploadJobStale(input.uploadJob, input.now)
  const hasActiveUpload =
    (uploadJobStatus === 'queued' || uploadJobStatus === 'running') && !uploadStale
  const hasUploadError =
    uploadJobStatus === 'error' ||
    uploadJobStatus === 'cancelled' ||
    uploadStale ||
    (datasetStatus === 'uploading' && !hasActiveUpload)
  const hasIndividuazioneInCorso =
    input.individuazioneStatus === 'in_corso' || datasetStatus === 'in_corso'
  const processingState = classifyProcessingOperationalState({
    datasetStatus,
    campaignJob: input.campaignJob,
    progress: input.progress,
    hasLocalRuntimeProcess: input.hasLocalRuntimeProcess,
    now: input.now,
  })
  const hasActiveCampaignJob = processingState === 'running'
  const hasCampaignJobError = processingState === 'error_recent' || processingState === 'error_old'
  const stale =
    processingState === 'stale' ||
    processingState === 'recoverable_unknown' ||
    hasCampaignJobError

  if (datasetStatus === 'deleting') {
    return blocked('deleting', 'Eliminazione programmazione in corso')
  }

  if (hasActiveUpload) {
    return blocked('uploading', 'Upload programmazione in corso')
  }

  if (hasUploadError || datasetStatus === 'error') {
    return {
      badge: datasetStatus === 'error' && !uploadJobStatus ? 'error' : 'upload_error',
      canUpload: true,
      canCreateIndividuazione: false,
      canResumeIndividuazione: false,
      blockingReason:
        input.uploadJob?.error ||
        (uploadStale
          ? 'Caricamento interrotto (nessun progresso). Puoi riprovare o eliminare la programmazione.'
          : datasetStatus === 'uploading'
            ? 'Caricamento interrotto. Puoi riprovare o eliminare la programmazione.'
            : 'Errore sui dati della programmazione'),
    }
  }

  if (hasIndividuazioneInCorso || hasActiveCampaignJob || hasCampaignJobError) {
    if (stale) {
      return {
        badge: 'individuazione_stale',
        canUpload: false,
        canCreateIndividuazione: false,
        canResumeIndividuazione: true,
        blockingReason: input.campaignJob?.error || 'Individuazione interrotta: riprendi dalla pagina Individuazioni',
      }
    }

    return blocked('individuazione_running', 'Individuazione in corso')
  }

  if (datasetStatus === 'individuata') {
    return {
      badge: 'individuata',
      canUpload: false,
      canCreateIndividuazione: false,
      canResumeIndividuazione: false,
    }
  }

  if (datasetStatus === 'bozza') {
    return {
      badge: 'bozza',
      canUpload: true,
      canCreateIndividuazione: false,
      canResumeIndividuazione: false,
      blockingReason: input.hasData ? undefined : 'Carica dati prima di creare individuazioni',
    }
  }

  return {
    badge: 'in_review',
    canUpload: true,
    canCreateIndividuazione: input.hasData,
    canResumeIndividuazione: false,
    blockingReason: input.hasData ? undefined : 'Nessuna programmazione caricata',
  }
}

function blocked(badge: ProgrammazioneRowBadge, blockingReason: string): ProgrammazioneRowState {
  return {
    badge,
    canUpload: false,
    canCreateIndividuazione: false,
    canResumeIndividuazione: false,
    blockingReason,
  }
}

function isRecent(updatedAt: string | null | undefined, now = Date.now()): boolean {
  if (!updatedAt) return false
  const updatedTime = new Date(updatedAt).getTime()
  if (Number.isNaN(updatedTime)) return false
  return now - updatedTime <= 10 * 60 * 1000
}
