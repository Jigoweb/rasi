import { isProcessingStale, type ProcessingJobState, type ProcessingProgress } from './programmazioni.service'

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

export function getProgrammazioneRowState(input: ProgrammazioneOperationalState): ProgrammazioneRowState {
  const datasetStatus = input.datasetStatus
  const uploadJobStatus = input.uploadJob?.stato
  const campaignJobStatus = input.campaignJob?.stato ?? input.progress?.job_stato
  const hasActiveUpload = uploadJobStatus === 'queued' || uploadJobStatus === 'running'
  const hasUploadError = uploadJobStatus === 'error'
  const hasActiveCampaignJob =
    campaignJobStatus === 'queued' ||
    campaignJobStatus === 'running' ||
    input.hasLocalRuntimeProcess
  const hasCampaignJobError = campaignJobStatus === 'error'
  const hasIndividuazioneInCorso =
    input.individuazioneStatus === 'in_corso' || datasetStatus === 'in_corso'
  const stale =
    hasCampaignJobError ||
    isProcessingStale(input.progress, input.now) ||
    (hasIndividuazioneInCorso && !input.progress?.last_activity_at && !hasActiveCampaignJob)

  if (datasetStatus === 'deleting') {
    return blocked('deleting', 'Eliminazione programmazione in corso')
  }

  if (hasActiveUpload || datasetStatus === 'uploading') {
    return blocked('uploading', 'Upload programmazione in corso')
  }

  if (hasUploadError) {
    return {
      badge: 'upload_error',
      canUpload: true,
      canCreateIndividuazione: false,
      canResumeIndividuazione: false,
      blockingReason: input.uploadJob?.error || 'Upload programmazione terminato con errore',
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

  if (datasetStatus === 'error') {
    return {
      badge: 'error',
      canUpload: true,
      canCreateIndividuazione: false,
      canResumeIndividuazione: false,
      blockingReason: 'Errore sui dati della programmazione',
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
