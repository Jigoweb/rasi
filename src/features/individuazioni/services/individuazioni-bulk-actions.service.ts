import type { CampagnaIndividuazione } from './individuazioni.service'

export interface IndividuazioniBulkSelectionActions {
  selected: CampagnaIndividuazione[]
  exportable: CampagnaIndividuazione[]
  deletable: CampagnaIndividuazione[]
  skippedExportCount: number
  skippedDeleteCount: number
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

/**
 * Classifica le campagne di individuazione selezionate per azioni bulk.
 * - exportable: almeno una individuazione da esportare
 * - deletable: non in elaborazione attiva
 */
export function classifyIndividuazioniBulkSelection(
  campagne: CampagnaIndividuazione[],
  selectedIds: Set<string>,
  isProcessing?: (campagneProgrammazioneId: string) => boolean,
): IndividuazioniBulkSelectionActions {
  const selected = campagne.filter(campagna => selectedIds.has(campagna.id))
  const exportable: CampagnaIndividuazione[] = []
  const deletable: CampagnaIndividuazione[] = []

  for (const campagna of selected) {
    if (canExportCampagnaIndividuazione(campagna)) {
      exportable.push(campagna)
    }
    if (canDeleteCampagnaIndividuazione(campagna, isProcessing)) {
      deletable.push(campagna)
    }
  }

  return {
    selected,
    exportable,
    deletable,
    skippedExportCount: selected.length - exportable.length,
    skippedDeleteCount: selected.length - deletable.length,
  }
}
