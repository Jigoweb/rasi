import { isProcessingStale } from '@/features/programmazioni/services/programmazioni.service'
import type {
  CampagnaIndividuazione,
  IndividuazioneProcessingProgress,
} from '@/features/individuazioni/services/individuazioni.service'

/**
 * Stato visuale della campagna individuazione.
 * `interrotto` / `da_verificare` sono derivati da `in_corso` + progresso job.
 */
export type IndividuazioneDisplayStatus =
  | 'bozza'
  | 'in_corso'
  | 'interrotto'
  | 'da_verificare'
  | 'completata'
  | 'archiviata'
  | string

export function getIndividuazioneDisplayStatus(
  stato: string,
  progress?: IndividuazioneProcessingProgress | null,
  now?: number,
): IndividuazioneDisplayStatus {
  if (stato !== 'in_corso') return stato

  if (progress?.job_stato === 'error' || isProcessingStale(progress, now)) {
    return 'interrotto'
  }

  if (!progress?.last_activity_at && progress?.job_stato !== 'running') {
    return 'da_verificare'
  }

  return 'in_corso'
}

/** Allineato al bottone Riprendi in tabella. */
export function canResumeCampagnaIndividuazione(
  campagna: Pick<CampagnaIndividuazione, 'stato'>,
  progress?: IndividuazioneProcessingProgress | null,
  now?: number,
): boolean {
  if (campagna.stato !== 'in_corso') return false
  const display = getIndividuazioneDisplayStatus(campagna.stato, progress, now)
  return display === 'interrotto' || display === 'da_verificare'
}

/**
 * Match del filtro stato in lista.
 * - `in_corso`: solo processi attivi (esclude interrotti)
 * - `interrotto`: job error o stale
 * - `da_verificare`: in_corso senza attività nota
 * - altri: match diretto su stato DB
 */
export function matchesIndividuazioneStatusFilter(
  campagna: Pick<CampagnaIndividuazione, 'stato'>,
  statusFilter: string,
  progress?: IndividuazioneProcessingProgress | null,
  now?: number,
): boolean {
  if (statusFilter === 'all') return true

  const display = getIndividuazioneDisplayStatus(campagna.stato, progress, now)

  if (statusFilter === 'in_corso') {
    return display === 'in_corso'
  }

  if (statusFilter === 'interrotto') {
    return display === 'interrotto'
  }

  if (statusFilter === 'da_verificare') {
    return display === 'da_verificare'
  }

  return campagna.stato === statusFilter
}

export function getIndividuazioneStatusFilterLabel(statusFilter: string): string {
  switch (statusFilter) {
    case 'in_corso':
      return 'In corso'
    case 'interrotto':
      return 'Interrotto'
    case 'da_verificare':
      return 'Da verificare'
    case 'completata':
      return 'Completata'
    case 'bozza':
      return 'Bozza'
    case 'archiviata':
      return 'Archiviata'
    default:
      return statusFilter
  }
}
