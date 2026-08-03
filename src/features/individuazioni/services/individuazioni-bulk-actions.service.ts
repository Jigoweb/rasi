import type { CampagnaIndividuazione, IndividuazioneProcessingProgress } from './individuazioni.service'
import { canResumeCampagnaIndividuazione } from '@/features/individuazioni/utils/individuazione-display-status'

export interface IndividuazioniBulkSelectionActions {
  selected: CampagnaIndividuazione[]
  exportable: CampagnaIndividuazione[]
  deletable: CampagnaIndividuazione[]
  resumable: CampagnaIndividuazione[]
  skippedExportCount: number
  skippedDeleteCount: number
  skippedResumeCount: number
}

export function getCampagnaIndividuazioniCount(campagna: CampagnaIndividuazione): number {
  return campagna.statistiche?.individuazioni_create
    ?? campagna.individuazioni_count
    ?? 0
}

export function canExportCampagnaIndividuazione(campagna: CampagnaIndividuazione): boolean {
  return getCampagnaIndividuazioniCount(campagna) > 0
}

/** Campagne in elaborazione attiva non vanno eliminate in bulk. */
export function canDeleteCampagnaIndividuazione(
  campagna: CampagnaIndividuazione,
  isProcessing?: (campagneProgrammazioneId: string) => boolean,
): boolean {
  if (campagna.stato === 'in_corso' && isProcessing?.(campagna.campagne_programmazione_id)) {
    return false
  }
  return true
}

export type IndividuazioniBulkProgressMap = Record<string, IndividuazioneProcessingProgress | null>

/**
 * Classifica le campagne di individuazione selezionate per azioni bulk.
 * - exportable: almeno una individuazione da esportare
 * - deletable: non in elaborazione attiva
 * - resumable: interrotte / da verificare e avviabili
 */
export function classifyIndividuazioniBulkSelection(
  campagne: CampagnaIndividuazione[],
  selectedIds: Set<string>,
  isProcessing?: (campagneProgrammazioneId: string) => boolean,
  progressMap?: IndividuazioniBulkProgressMap,
  canStartProcess?: (campagneProgrammazioneId: string) => boolean,
  now?: number,
): IndividuazioniBulkSelectionActions {
  const selected = campagne.filter(campagna => selectedIds.has(campagna.id))
  const exportable: CampagnaIndividuazione[] = []
  const deletable: CampagnaIndividuazione[] = []
  const resumable: CampagnaIndividuazione[] = []

  for (const campagna of selected) {
    if (canExportCampagnaIndividuazione(campagna)) {
      exportable.push(campagna)
    }
    if (canDeleteCampagnaIndividuazione(campagna, isProcessing)) {
      deletable.push(campagna)
    }

    const progress = progressMap?.[campagna.id]
    const canResume = canResumeCampagnaIndividuazione(campagna, progress, now)
    const startOk = canStartProcess
      ? canStartProcess(campagna.campagne_programmazione_id)
      : !isProcessing?.(campagna.campagne_programmazione_id)
    if (canResume && startOk) {
      resumable.push(campagna)
    }
  }

  return {
    selected,
    exportable,
    deletable,
    resumable,
    skippedExportCount: selected.length - exportable.length,
    skippedDeleteCount: selected.length - deletable.length,
    skippedResumeCount: selected.length - resumable.length,
  }
}
