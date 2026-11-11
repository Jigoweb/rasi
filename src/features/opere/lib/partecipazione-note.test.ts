import {
  flattenPartecipazioneNote,
  partecipazioneNoteText,
  readPartecipazioneNote,
  splitPartecipazionePayload,
} from './partecipazione-note'
import { FULL_DATABASE_PARTECIPAZIONI_SELECT } from '@/features/report/services/report-export.service'
import fs from 'fs'
import path from 'path'

function columnLines(select: string): string[] {
  return select.split('\n').map((line) => line.trim().replace(/,$/, '')).filter(Boolean)
}

describe('partecipazione notes', () => {
  it('reads an object or a one-element embed and keeps an empty string', () => {
    expect(readPartecipazioneNote({ note: 'interna' })).toBe('interna')
    expect(readPartecipazioneNote([{ note: 'interna' }])).toBe('interna')
    expect(readPartecipazioneNote({ note: '' })).toBe('')
    expect(readPartecipazioneNote(null)).toBeNull()
    expect(readPartecipazioneNote([])).toBeNull()
  })

  it('flattens the embed onto note and removes it', () => {
    expect(flattenPartecipazioneNote({
      id: 'p1',
      partecipazioni_note: { note: 'solo staff' },
    })).toEqual({ id: 'p1', note: 'solo staff' })
  })

  it('splits a write so the partecipazione payload never carries note', () => {
    expect(splitPartecipazionePayload({
      ruolo_id: 'r1',
      personaggio: 'Ada',
      note: 'riservata',
    })).toEqual({
      partecipazione: { ruolo_id: 'r1', personaggio: 'Ada' },
      note: 'riservata',
    })
    expect(splitPartecipazionePayload({ ruolo_id: 'r1', note: null })).toEqual({
      partecipazione: { ruolo_id: 'r1' },
      note: null,
    })
    expect(splitPartecipazionePayload({ ruolo_id: 'r1' })).toEqual({
      partecipazione: { ruolo_id: 'r1' },
      note: undefined,
    })
  })

  it('keeps the note text in staff exports from either shape', () => {
    expect(partecipazioneNoteText({ note: 'diretta' })).toBe('diretta')
    expect(partecipazioneNoteText({ partecipazioni_note: { note: 'embed' } })).toBe('embed')
    expect(partecipazioneNoteText({})).toBe('')
  })

  it('asks staff queries for the note table and not for a note column', () => {
    const select = FULL_DATABASE_PARTECIPAZIONI_SELECT
    expect(select).toContain('partecipazioni_note (note)')
    expect(columnLines(select)).not.toContain('note')
  })

  it('the opera RPC reads the note from partecipazioni_note, not from partecipazioni', () => {
    const migration = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../../supabase/migrations/20261111155000_list_partecipazioni_opera_note_separate.sql',
      ),
      'utf8',
    ).replace(/--.*$/gm, '')
    expect(migration).toMatch(/LEFT JOIN public\.partecipazioni_note n ON n\.partecipazione_id = p\.id/)
    expect(migration).not.toMatch(/\bp\.note\b/)
    expect(migration).toMatch(/SECURITY INVOKER/)
  })
})
