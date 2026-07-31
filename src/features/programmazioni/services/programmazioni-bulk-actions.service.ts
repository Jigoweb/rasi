import {
  getProgrammazioneRowState,
  type ProgrammazioneRowState,
} from '@/features/programmazioni/services/programmazioni-state.service'
import type {
  CampagnaProgrammazione,
  ProcessingActivityJob,
  ProcessingProgress,
} from '@/features/programmazioni/services/programmazioni.service'

export type BulkProgressCount = {
  done: number
  total: number
}

export interface BulkRowContext {
  uploadProgress: Record<string, BulkProgressCount>
  processingProgressMap: Record<string, ProcessingProgress | null>
  processingJobMap: Record<string, ProcessingActivityJob | null>
  isCampagnaProcessing: (campagnaId: string) => boolean
}

export function getCampagnaRowStateForBulk(
  campagna: CampagnaProgrammazione,
  context: BulkRowContext,
): ProgrammazioneRowState {
  const hasData = (campagna.programmazioni_count || 0) > 0

  return getProgrammazioneRowState({
    datasetStatus: campagna.stato,
    uploadJob: context.uploadProgress[campagna.id]
      ? {
          stato: 'running',
          righe_processate: context.uploadProgress[campagna.id].done,
          righe_totali: context.uploadProgress[campagna.id].total,
        }
      : null,
    progress: context.processingProgressMap[campagna.id],
    campaignJob: context.processingJobMap[campagna.id],
    hasLocalRuntimeProcess: context.isCampagnaProcessing(campagna.id),
    hasData,
  })
}

export interface BulkSelectionActions {
  selected: CampagnaProgrammazione[]
  creatable: CampagnaProgrammazione[]
  deletable: CampagnaProgrammazione[]
  skippedCreateCount: number
  skippedDeleteCount: number
}

/**
 * Classifica le campagne selezionate per azioni bulk.
 * - creatable: dati pronti e processo avviabile
 * - deletable: non in upload/delete/processing attivo
 */
export function classifyBulkSelection(
  campagne: CampagnaProgrammazione[],
  selectedIds: Set<string>,
  context: BulkRowContext,
  canStartProcess: (campagnaId: string) => boolean,
): BulkSelectionActions {
  const selected = campagne.filter(campagna => selectedIds.has(campagna.id))
  const creatable: CampagnaProgrammazione[] = []
  const deletable: CampagnaProgrammazione[] = []

  for (const campagna of selected) {
    const rowState = getCampagnaRowStateForBulk(campagna, context)

    if (rowState.canCreateIndividuazione && canStartProcess(campagna.id)) {
      creatable.push(campagna)
    }

    if (canBulkDelete(rowState)) {
      deletable.push(campagna)
    }
  }

  return {
    selected,
    creatable,
    deletable,
    skippedCreateCount: selected.length - creatable.length,
    skippedDeleteCount: selected.length - deletable.length,
  }
}

export function canBulkDelete(rowState: ProgrammazioneRowState): boolean {
  return (
    rowState.badge !== 'uploading' &&
    rowState.badge !== 'deleting' &&
    rowState.badge !== 'individuazione_running'
  )
}

export function buildIndividuazioneName(programmazioneName: string): string {
  const trimmed = programmazioneName.trim()
  return trimmed ? `Individuazione - ${trimmed}` : 'Individuazione'
}

export function getSharedAnno(campagne: CampagnaProgrammazione[]): number | null {
  if (campagne.length === 0) return null
  const first = campagne[0].anno
  return campagne.every(campagna => campagna.anno === first) ? first : null
}
