import type { Json } from '@/shared/lib/supabase'

export type AuditAzione = 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN'

export const AZIONE_LABELS: Record<AuditAzione, string> = {
  INSERT: 'Creazione',
  UPDATE: 'Modifica',
  DELETE: 'Eliminazione',
  LOGIN: 'Accesso',
}

export const TABELLA_LABELS: Record<string, string> = {
  artisti: 'Artisti',
  artisti_note: 'Note artista',
  artisti_referenti: 'Tutori / eredi',
  opere: 'Opere',
  episodi: 'Episodi',
  opera_aliases: 'Alias opere',
  partecipazioni: 'Partecipazioni',
  cast_esterno: 'Cast esterno',
  ruoli_tipologie: 'Ruoli',
  emittenti: 'Emittenti',
  campagne_programmazione: 'Campagne programmazione',
  campagne_individuazione: 'Campagne individuazione',
  individuazioni: 'Individuazioni',
  campagne_ripartizione: 'Campagne ripartizione',
  parametri_ripartizione: 'Parametri ripartizione',
  alert_prese_visione: 'Alert (presa visione)',
  pages: 'Sito: pagine',
  bandi_news: 'Sito: bandi e news',
  documents: 'Sito: documenti',
  utenti: 'Utenti',
}

export function formatTabella(tabella: string): string {
  return TABELLA_LABELS[tabella] ?? tabella
}

export function formatAzione(azione: string): string {
  return AZIONE_LABELS[azione as AuditAzione] ?? azione
}

/** Campo tecnico → etichetta leggibile (snake_case → "Snake case"). */
export function formatCampo(campo: string): string {
  const spaced = campo.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function formatValore(value: Json | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sì' : 'No'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return JSON.stringify(value)
}

export type AuditDiffRow = { campo: string; prima: string; dopo: string }

function asObject(value: Json | null | undefined): Record<string, Json | undefined> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, Json | undefined>) : {}
}

/**
 * Righe "campo / prima / dopo". Per le modifiche usa solo i campi cambiati;
 * per creazioni ed eliminazioni elenca i campi valorizzati della riga.
 */
export function buildAuditDiff(entry: {
  azione: string
  campi_modificati: string[] | null
  old_data: Json | null
  new_data: Json | null
}): AuditDiffRow[] {
  const oldData = asObject(entry.old_data)
  const newData = asObject(entry.new_data)
  const hidden = new Set(['id', 'created_at', 'created_by'])

  const campi =
    entry.azione === 'UPDATE' && entry.campi_modificati?.length
      ? entry.campi_modificati
      : Object.keys(entry.azione === 'DELETE' ? oldData : newData)
          .filter((campo) => !hidden.has(campo))
          .filter((campo) => formatValore((entry.azione === 'DELETE' ? oldData : newData)[campo]) !== '—')
          .sort()

  return campi.map((campo) => ({
    campo,
    prima: entry.azione === 'INSERT' ? '—' : formatValore(oldData[campo]),
    dopo: entry.azione === 'DELETE' ? '—' : formatValore(newData[campo]),
  }))
}

/** Link alla scheda collegata, se esiste ancora una pagina di dettaglio. */
export function auditRecordHref(entry: {
  azione: string
  tabella: string
  artista_id: string | null
  opera_id: string | null
}): string | null {
  if (entry.azione === 'DELETE' && (entry.tabella === 'artisti' || entry.tabella === 'opere')) return null
  if (entry.opera_id && entry.tabella !== 'artisti' && entry.tabella !== 'artisti_note' && entry.tabella !== 'artisti_referenti') {
    return `/dashboard/opere/${entry.opera_id}`
  }
  if (entry.artista_id) return `/dashboard/artisti/${entry.artista_id}`
  if (entry.opera_id) return `/dashboard/opere/${entry.opera_id}`
  return null
}
