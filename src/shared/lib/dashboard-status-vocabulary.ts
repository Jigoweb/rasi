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

export const RIPARTIZIONE_STATUS_LABELS = {
  pianificata: 'Pianificata',
  in_corso: 'In corso',
  completata: 'Completata',
  distribuita: 'Distribuita',
  sospesa: 'Sospesa',
  annullata: 'Annullata',
} as const

export const INDIVIDUAZIONE_STATUS_LABELS = {
  completata: 'Completata',
  in_corso: 'In corso',
  bozza: 'Bozza',
  archiviata: 'Archiviata',
  interrotta: 'Interrotta',
  da_verificare: 'Da verificare',
} as const
