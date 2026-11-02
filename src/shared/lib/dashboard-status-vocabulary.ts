export const PROGRAMMAZIONE_STATUS_LABELS = {
  uploading: 'Caricamento dati',
  deleting: 'Eliminazione',
  upload_error: 'Errore',
  error: 'Errore',
  in_review: 'In revisione',
  individuazione_stale: 'Individuazione interrotta',
  individuazione_running: 'Individuazione in corso',
  individuata: 'Completata',
  bozza: 'Bozza',
} as const

/**
 * Valori di `stato_ripartizione` (db/init/00_schema.sql).
 * Nessuna migrazione successiva modifica l'enum.
 */
export const RIPARTIZIONE_STATUS_LABELS = {
  pianificata: 'Pianificata',
  calcolata: 'Calcolata',
  approvata: 'Approvata',
  distribuita: 'Distribuita',
} as const

export type StatoRipartizione = keyof typeof RIPARTIZIONE_STATUS_LABELS

export const RIPARTIZIONE_STATUSES = Object.keys(
  RIPARTIZIONE_STATUS_LABELS,
) as StatoRipartizione[]

export function isStatoRipartizione(value: string): value is StatoRipartizione {
  return Object.prototype.hasOwnProperty.call(RIPARTIZIONE_STATUS_LABELS, value)
}

/** Etichetta italiana. Stati vuoti o non previsti restano visibili, senza eccezioni. */
export function getRipartizioneStatusLabel(stato: string | null | undefined): string {
  if (typeof stato !== 'string' || stato.trim() === '') return 'Sconosciuto'
  if (isStatoRipartizione(stato)) return RIPARTIZIONE_STATUS_LABELS[stato]
  return stato
}

export const INDIVIDUAZIONE_STATUS_LABELS = {
  completata: 'Completata',
  in_corso: 'In corso',
  bozza: 'Bozza',
  archiviata: 'Archiviata',
  interrotta: 'Interrotta',
  da_verificare: 'Da verificare',
} as const
