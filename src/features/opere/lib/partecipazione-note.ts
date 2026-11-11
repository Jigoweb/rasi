/** Embed PostgREST sulla tabella staff-only. L'area artista non lo chiede. */
export const PARTECIPAZIONE_NOTE_EMBED = 'partecipazioni_note (note)'

export type PartecipazioneNoteEmbed =
  | { note: string | null }
  | { note: string | null }[]
  | null
  | undefined

export function readPartecipazioneNote(embed: PartecipazioneNoteEmbed): string | null {
  if (embed == null) return null
  const row = Array.isArray(embed) ? embed[0] : embed
  if (!row || row.note == null) return null
  return row.note
}

export function flattenPartecipazioneNote<T extends { partecipazioni_note?: PartecipazioneNoteEmbed }>(
  row: T,
): Omit<T, 'partecipazioni_note'> & { note: string | null } {
  const note = readPartecipazioneNote(row.partecipazioni_note)
  const rest = { ...row }
  delete rest.partecipazioni_note
  return { ...rest, note }
}

/** Separa la nota dal payload di partecipazioni: la colonna non esiste più. */
export function splitPartecipazionePayload<T extends Record<string, unknown>>(
  payload: T & { note?: string | null },
): {
  partecipazione: Omit<T, 'note'>
  note: string | null | undefined
} {
  const hasNote = Object.prototype.hasOwnProperty.call(payload, 'note')
  const partecipazione = { ...payload }
  delete partecipazione.note
  if (!hasNote) return { partecipazione: partecipazione as Omit<T, 'note'>, note: undefined }
  return { partecipazione: partecipazione as Omit<T, 'note'>, note: payload.note ?? null }
}

export function samePartecipazioneKey(
  left: { artista_id?: string; opera_id?: string; ruolo_id?: string; episodio_id?: string | null },
  right: { artista_id?: string; opera_id?: string; ruolo_id?: string; episodio_id?: string | null },
): boolean {
  return left.artista_id === right.artista_id
    && left.opera_id === right.opera_id
    && left.ruolo_id === right.ruolo_id
    && (left.episodio_id ?? null) === (right.episodio_id ?? null)
}

/** Testo per gli export staff. Legge la colonna appiattita o l'embed. */
export function partecipazioneNoteText(row: {
  note?: string | null
  partecipazioni_note?: PartecipazioneNoteEmbed
}): string {
  if (row.note != null && row.note !== '') return row.note
  return readPartecipazioneNote(row.partecipazioni_note) ?? ''
}
