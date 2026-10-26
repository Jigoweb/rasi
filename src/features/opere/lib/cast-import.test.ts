import { parseTabularFile } from '@/shared/lib/tabular-file'
import { buildCastTemplateCsv } from './cast-template'
import {
  CAST_IMPORT_ALERTS,
  CAST_TEMPLATE_COLUMNS,
  buildCastImportInserts,
  classifyCastImport,
  classifyCastValues,
  externalCandidateLabel,
  insertWithDuplicateFallback,
  isMissingCastEsternoColumnError,
  legacyCastFields,
  summarizeCastRows,
  toPublicCastRows,
  type CastImportContext,
} from './cast-import'
import { authorizeCastImport } from './cast-import-access'

const ruoli = [
  { id: 'r-prot', nome: 'Protagonista Primario', attivo: true, categoria: 'recitazione' },
  { id: 'r-comp', nome: 'Comprimario', attivo: true, categoria: 'recitazione' },
  { id: 'r-dopp', nome: 'Doppiatore Primario', attivo: true, categoria: 'doppiaggio' },
  { id: 'r-off', nome: 'Regista', attivo: false, categoria: 'direzione' },
]

const episodi = [
  { id: 'ep-1', numero_stagione: 1, numero_episodio: 2 },
]

function context(overrides: Partial<CastImportContext> = {}): CastImportContext {
  return {
    artisti: [
      { id: 'a1', nome: 'Mario', cognome: 'Rossi', codice_ipn: 'IPN1' },
      { id: 'a2', nome: 'Anna', cognome: 'Verdi', codice_ipn: 'IPN2' },
      { id: 'a3', nome: 'Luca', cognome: 'Neri', codice_ipn: null },
    ],
    ruoli,
    episodi,
    partecipazioni: [],
    castEsterno: [],
    externalCastReady: true,
    ...overrides,
  }
}

function row(values: Partial<Record<(typeof CAST_TEMPLATE_COLUMNS)[number], string>>): Record<string, string> {
  return {
    Nome: '',
    Cognome: '',
    IPN: '',
    Ruolo: '',
    Stagione: '',
    Episodio: '',
    ...values,
  }
}

function classify(rows: Record<string, string>[], overrides?: Partial<CastImportContext>) {
  return classifyCastImport([...CAST_TEMPLATE_COLUMNS], rows, context(overrides))
}

describe('classifyCastImport', () => {
  it('rejects a file whose columns are not exactly the template', () => {
    const result = classifyCastImport(['Nome', 'Cognome', 'Personaggio'], [], context())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe(CAST_IMPORT_ALERTS.headers)
  })

  it('creates a partecipazione when nome, cognome and IPN match one RASI artist', () => {
    const result = classify([
      row({ Nome: ' mario ', Cognome: 'Rossi', IPN: 'ipn1', Ruolo: 'protagonista primario', Stagione: '1', Episodio: '2' }),
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0]).toMatchObject({
      status: 'valid',
      action: 'partecipazione',
      artistaId: 'a1',
      ruoloId: 'r-prot',
      episodioId: 'ep-1',
      rowNumber: 2,
    })
  })

  it('matches accent-insensitive names and links an empty season to the whole opera', () => {
    const result = classify(
      [row({ Nome: 'Jose', Cognome: 'Garcia', IPN: 'IPN9', Ruolo: 'Comprimario' })],
      { artisti: [{ id: 'a9', nome: 'José', cognome: 'García', codice_ipn: 'IPN9' }] },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0]).toMatchObject({ status: 'valid', action: 'partecipazione', artistaId: 'a9', episodioId: null })
  })

  it('sends an unknown person to the external cast and does not assign an artist id', () => {
    const result = classify([
      row({ Nome: 'Giulia', Cognome: 'Bianchi', IPN: 'NEW1', Ruolo: 'Comprimario', Stagione: '1', Episodio: '2' }),
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const classified = result.rows[0]
    expect(classified).toMatchObject({
      status: 'valid',
      action: 'cast_esterno',
      ruoloId: 'r-comp',
      episodioId: 'ep-1',
    })
    expect(classified).not.toHaveProperty('artistaId')
  })

  it('does not guess when the IPN matches but the surname differs', () => {
    const result = classify([row({ Nome: 'Mario', Cognome: 'Bianchi', IPN: 'IPN1', Ruolo: 'Comprimario' })])
    expect(result.ok && result.rows[0]).toMatchObject({ status: 'skipped', alert: CAST_IMPORT_ALERTS.ipnConflict })
  })

  it('does not guess when the IPN belongs to another artist', () => {
    const result = classify([row({ Nome: 'Giulia', Cognome: 'Bianchi', IPN: 'IPN1', Ruolo: 'Comprimario' })])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0]).toMatchObject({ status: 'skipped', alert: CAST_IMPORT_ALERTS.ipnConflict })
    expect(result.rows[0]).not.toHaveProperty('action')
  })

  it('does not pick one artist when the same IPN is shared', () => {
    const result = classify(
      [row({ Nome: 'Mario', Cognome: 'Rossi', IPN: 'IPN1', Ruolo: 'Comprimario' })],
      {
        artisti: [
          { id: 'a1', nome: 'Mario', cognome: 'Rossi', codice_ipn: 'IPN1' },
          { id: 'a4', nome: 'Marco', cognome: 'Rossi', codice_ipn: 'IPN1' },
        ],
      },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0]).toMatchObject({ status: 'skipped', alert: CAST_IMPORT_ALERTS.ipnConflict })
  })

  it('matches an empty IPN only with an artist who also has no IPN', () => {
    const matched = classify([row({ Nome: 'Luca', Cognome: 'Neri', IPN: '', Ruolo: 'Comprimario' })])
    const notMatched = classify([row({ Nome: 'Mario', Cognome: 'Rossi', IPN: '', Ruolo: 'Comprimario' })])
    expect(matched.ok && matched.rows[0]).toMatchObject({ status: 'valid', action: 'partecipazione', artistaId: 'a3' })
    expect(notMatched.ok && notMatched.rows[0]).toMatchObject({ status: 'valid', action: 'cast_esterno' })
  })

  it('skips a missing episode and never describes a new episode', () => {
    const result = classify([row({ Nome: 'Giulia', Cognome: 'Bianchi', IPN: '', Ruolo: 'Comprimario', Stagione: '3', Episodio: '1' })])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0]).toMatchObject({ status: 'skipped' })
    if (result.rows[0].status === 'skipped') expect(result.rows[0].alert).toContain(CAST_IMPORT_ALERTS.episodeMissing)
  })

  it('requires season and episode together and as integers', () => {
    const half = classify([row({ Nome: 'Giulia', Cognome: 'Bianchi', Ruolo: 'Comprimario', Stagione: '1' })])
    const decimal = classify([row({ Nome: 'Giulia', Cognome: 'Bianchi', Ruolo: 'Comprimario', Stagione: '1', Episodio: '2.5' })])
    expect(half.ok && half.rows[0]).toMatchObject({ status: 'skipped', alert: CAST_IMPORT_ALERTS.seasonPair })
    expect(decimal.ok && decimal.rows[0]).toMatchObject({ status: 'skipped', alert: CAST_IMPORT_ALERTS.seasonNumber })
  })

  it('skips the same artist and role already on that episode, and duplicates inside the file', () => {
    const result = classify(
      [
        row({ Nome: 'Mario', Cognome: 'Rossi', IPN: 'IPN1', Ruolo: 'Comprimario', Stagione: '1', Episodio: '2' }),
        row({ Nome: 'Anna', Cognome: 'Verdi', IPN: 'IPN2', Ruolo: 'Comprimario' }),
        row({ Nome: 'Anna', Cognome: 'Verdi', IPN: 'IPN2', Ruolo: 'Comprimario' }),
      ],
      { partecipazioni: [{ artista_id: 'a1', ruolo_id: 'r-comp', episodio_id: 'ep-1' }] },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0]).toMatchObject({ status: 'skipped', alert: CAST_IMPORT_ALERTS.duplicateCast })
    expect(result.rows[1]).toMatchObject({ status: 'valid', action: 'partecipazione', artistaId: 'a2', episodioId: null })
    expect(result.rows[2]).toMatchObject({ status: 'skipped', alert: CAST_IMPORT_ALERTS.duplicateFile })
  })

  it('treats the same role on the opera and on an episode as two different rows', () => {
    const result = classify(
      [row({ Nome: 'Mario', Cognome: 'Rossi', IPN: 'IPN1', Ruolo: 'Comprimario', Stagione: '1', Episodio: '2' })],
      { partecipazioni: [{ artista_id: 'a1', ruolo_id: 'r-comp', episodio_id: null }] },
    )
    expect(result.ok && result.rows[0]).toMatchObject({ status: 'valid', episodioId: 'ep-1' })
  })

  it('skips an external duplicate in the database and inside the file', () => {
    const result = classify([
      row({ Nome: 'Giulia', Cognome: 'Bianchi', IPN: 'NEW1', Ruolo: 'Comprimario' }),
      row({ Nome: 'Giulia', Cognome: 'Bianchi', IPN: 'new1', Ruolo: 'Comprimario' }),
      row({ Nome: 'Giulia', Cognome: 'Bianchi', IPN: 'NEW1', Ruolo: 'Protagonista Primario' }),
    ], {
      castEsterno: [{ id: 'ext-1', nome: 'Giulia Bianchi', codice_ipn: 'NEW1', ruolo_id: 'r-comp', episodio_id: null }],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0]).toMatchObject({ status: 'skipped', alert: CAST_IMPORT_ALERTS.duplicateCast })
    expect(result.rows[1]).toMatchObject({ status: 'skipped', alert: CAST_IMPORT_ALERTS.duplicateCast })
    expect(result.rows[2]).toMatchObject({ status: 'valid', action: 'cast_esterno', ruoloId: 'r-prot' })
    const fresh = classify([
      row({ Nome: 'Paolo', Cognome: 'Gialli', IPN: 'NEW2', Ruolo: 'Comprimario' }),
      row({ Nome: 'Paolo', Cognome: 'Gialli', IPN: 'NEW2', Ruolo: 'Comprimario' }),
    ])
    expect(fresh.ok && fresh.rows[1]).toMatchObject({ status: 'skipped', alert: CAST_IMPORT_ALERTS.duplicateFile })
  })

  it('proposes to update a manual external row that has no role', () => {
    const result = classify(
      [row({ Nome: 'Giulia', Cognome: 'Bianchi', IPN: 'NEW9', Ruolo: 'Comprimario' })],
      { castEsterno: [{ id: 'ext-manual', nome: 'Giulia Bianchi', codice_ipn: null, ruolo_id: null, episodio_id: null }] },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0]).toMatchObject({
      status: 'valid',
      action: 'update_cast_esterno',
      castEsternoId: 'ext-manual',
      included: true,
      proposta: 'aggiorna',
      alert: CAST_IMPORT_ALERTS.duplicateManual,
    })
    const [created] = toPublicCastRows(result.rows)
    expect(created.flagged).toBe(true)
    const inserts = buildCastImportInserts('opera-1', result.rows, 1)
    expect(inserts.castEsterno).toEqual([])
    expect(inserts.aggiornamenti).toEqual([
      expect.objectContaining({ id: 'ext-manual', ruolo_id: 'r-comp', codice_ipn: 'NEW9', nome: 'Giulia Bianchi' }),
    ])
  })

  it('lets the operator create a second row or exclude the manual duplicate', () => {
    const values = [{
      rowNumber: 2,
      Nome: 'Giulia',
      Cognome: 'Bianchi',
      IPN: '',
      Ruolo: 'Comprimario',
      Stagione: '',
      Episodio: '',
    }]
    const base = context({
      castEsterno: [{ id: 'ext-manual', nome: 'Giulia Bianchi', codice_ipn: null, ruolo_id: null, episodio_id: null }],
    })
    const edit = {
      rowNumber: 2,
      nome: 'Giulia',
      cognome: 'Bianchi',
      ipn: '',
      ruolo: 'Comprimario',
      stagione: '',
      episodio: '',
      included: true,
      proposta: 'crea' as const,
      castEsternoId: null,
    }
    const created = classifyCastValues(values, base, [edit])
    expect(created.rows[0]).toMatchObject({
      status: 'valid',
      action: 'cast_esterno',
      alert: CAST_IMPORT_ALERTS.duplicateManualCreate,
      included: true,
    })
    expect(buildCastImportInserts('opera-1', created.rows, 0).castEsterno).toHaveLength(1)
    expect(buildCastImportInserts('opera-1', created.rows, 0).aggiornamenti).toEqual([])

    const excluded = classifyCastValues(values, base, [{ ...edit, proposta: 'aggiorna', included: false }])
    expect(excluded.rows[0]).toMatchObject({ status: 'valid', action: 'update_cast_esterno', included: false })
    expect(buildCastImportInserts('opera-1', excluded.rows, 0)).toMatchObject({
      partecipazioni: [],
      castEsterno: [],
      aggiornamenti: [],
    })
  })

  it('keeps an IPN conflict out until the operator corrects the name', () => {
    const conflict = classify([
      row({ Nome: 'Mario', Cognome: 'Bianchi', IPN: 'IPN1', Ruolo: 'Comprimario' }),
    ])
    expect(conflict.ok && conflict.rows[0]).toMatchObject({
      status: 'skipped',
      alert: CAST_IMPORT_ALERTS.ipnConflict,
      included: false,
    })
    const corrected = classifyCastValues(
      [{
        rowNumber: 2,
        Nome: 'Mario',
        Cognome: 'Rossi',
        IPN: 'IPN1',
        Ruolo: 'Comprimario',
        Stagione: '',
        Episodio: '',
      }],
      context(),
      [{
        rowNumber: 2,
        nome: 'Mario',
        cognome: 'Rossi',
        ipn: 'IPN1',
        ruolo: 'Comprimario',
        stagione: '',
        episodio: '',
        included: true,
        proposta: null,
        castEsternoId: null,
      }],
    )
    expect(corrected.rows[0]).toMatchObject({ status: 'valid', action: 'partecipazione', artistaId: 'a1', included: true, alert: null })
  })

  it('does not import a forced include while the IPN is still in conflict', () => {
    const forced = classifyCastValues(
      [{
        rowNumber: 2,
        Nome: 'Mario',
        Cognome: 'Bianchi',
        IPN: 'IPN1',
        Ruolo: 'Comprimario',
        Stagione: '',
        Episodio: '',
      }],
      context(),
      [{
        rowNumber: 2,
        nome: 'Mario',
        cognome: 'Bianchi',
        ipn: 'IPN1',
        ruolo: 'Comprimario',
        stagione: '',
        episodio: '',
        included: true,
        proposta: null,
        castEsternoId: null,
      }],
    )
    expect(forced.rows[0]).toMatchObject({ status: 'skipped', included: false, alert: CAST_IMPORT_ALERTS.ipnConflict })
    expect(buildCastImportInserts('opera-1', forced.rows, 0).partecipazioni).toEqual([])
  })

  it('lets the operator choose which homonym to update in the same scope', () => {
    const manuals = [
      { id: 'ext-a', nome: 'Giulia Bianchi', codice_ipn: null, ruolo_id: null, episodio_id: null, personaggio: 'Anna' },
      { id: 'ext-b', nome: 'Giulia Bianchi', codice_ipn: 'IPN9', ruolo_id: null, episodio_id: null, personaggio: null },
    ]
    const values = [{
      rowNumber: 2,
      Nome: 'Giulia',
      Cognome: 'Bianchi',
      IPN: '',
      Ruolo: 'Comprimario',
      Stagione: '',
      Episodio: '',
    }]
    const base = context({ castEsterno: manuals })
    const preview = classifyCastValues(values, base)
    expect(preview.rows[0]).toMatchObject({
      status: 'valid',
      action: 'update_cast_esterno',
      castEsternoId: 'ext-a',
      included: true,
      alert: CAST_IMPORT_ALERTS.duplicateManualAmbiguous,
    })
    if (preview.rows[0].status !== 'valid') return
    expect(preview.rows[0].candidati.map((item) => item.id)).toEqual(['ext-a', 'ext-b'])
    expect(externalCandidateLabel(preview.rows[0].candidati[0], 0)).toContain('Anna')

    const chosen = classifyCastValues(values, base, [{
      rowNumber: 2,
      nome: 'Giulia',
      cognome: 'Bianchi',
      ipn: '',
      ruolo: 'Comprimario',
      stagione: '',
      episodio: '',
      included: true,
      proposta: 'aggiorna',
      castEsternoId: 'ext-b',
    }])
    expect(chosen.rows[0]).toMatchObject({ action: 'update_cast_esterno', castEsternoId: 'ext-b' })
    expect(buildCastImportInserts('opera-1', chosen.rows, 0).aggiornamenti).toEqual([
      expect.objectContaining({ id: 'ext-b' }),
    ])
  })

  it('treats the same person on the whole opera and on an episode as a new external row', () => {
    const result = classify(
      [row({ Nome: 'Giulia', Cognome: 'Bianchi', Ruolo: 'Comprimario', Stagione: '1', Episodio: '2' })],
      { castEsterno: [{ id: 'ext-opera', nome: 'Giulia Bianchi', codice_ipn: null, ruolo_id: null, episodio_id: null }] },
    )
    expect(result.ok && result.rows[0]).toMatchObject({
      status: 'valid',
      action: 'cast_esterno',
      castEsternoId: null,
      episodioId: 'ep-1',
    })
  })

  it('skips unknown, inactive and ambiguous roles', () => {
    const unknown = classify([row({ Nome: 'Giulia', Cognome: 'Bianchi', Ruolo: 'Fantasma' })])
    const inactive = classify([row({ Nome: 'Giulia', Cognome: 'Bianchi', Ruolo: 'Regista' })])
    const ambiguous = classify(
      [row({ Nome: 'Giulia', Cognome: 'Bianchi', Ruolo: 'Comprimario' })],
      { ruoli: [...ruoli, { id: 'r-comp-2', nome: 'comprimario', attivo: true, categoria: 'recitazione' }] },
    )
    expect(unknown.ok && unknown.rows[0]).toMatchObject({ status: 'skipped' })
    if (unknown.ok && unknown.rows[0].status === 'skipped') expect(unknown.rows[0].alert).toContain(CAST_IMPORT_ALERTS.ruoloUnknown)
    expect(inactive.ok && inactive.rows[0]).toMatchObject({ status: 'skipped' })
    if (inactive.ok && inactive.rows[0].status === 'skipped') expect(inactive.rows[0].alert).toContain(CAST_IMPORT_ALERTS.ruoloInactive)
    expect(ambiguous.ok && ambiguous.rows[0]).toMatchObject({ status: 'skipped' })
    if (ambiguous.ok && ambiguous.rows[0].status === 'skipped') expect(ambiguous.rows[0].alert).toContain(CAST_IMPORT_ALERTS.ruoloAmbiguous)
  })

  it('ignores fully empty rows and requires a name', () => {
    const result = classify([
      row({}),
      row({ Ruolo: 'Comprimario' }),
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0]).toEqual({ status: 'ignored', rowNumber: 2 })
    expect(result.rows[1]).toMatchObject({ status: 'skipped', alert: CAST_IMPORT_ALERTS.nameRequired, rowNumber: 3 })
    const summary = summarizeCastRows(toPublicCastRows(result.rows))
    expect(summary).toMatchObject({ valid: 0, skipped: 1 })
  })

  it('blocks external rows when the cast_esterno columns are not migrated yet', () => {
    const result = classify(
      [row({ Nome: 'Giulia', Cognome: 'Bianchi', IPN: 'NEW1', Ruolo: 'Comprimario' })],
      { externalCastReady: false },
    )
    expect(result.ok && result.rows[0]).toMatchObject({ status: 'skipped', alert: CAST_IMPORT_ALERTS.migration })
  })
})

describe('template round-trip', () => {
  it('reimports a prefilled partecipazione as a duplicate', () => {
    const csv = buildCastTemplateCsv([
      { Nome: 'Mario', Cognome: 'Rossi', IPN: 'IPN1', Ruolo: 'Comprimario', Stagione: '', Episodio: '' },
    ])
    const parsed = parseTabularFile('template.csv', Buffer.from(csv))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const result = classifyCastImport(parsed.table.headers, parsed.table.rows, context({
      partecipazioni: [{ artista_id: 'a1', ruolo_id: 'r-comp', episodio_id: null }],
    }))
    expect(result.ok && result.rows[0]).toMatchObject({ status: 'skipped', alert: CAST_IMPORT_ALERTS.duplicateCast })
  })
})

describe('buildCastImportInserts', () => {
  it('writes partecipazioni and cast esterno, never an artist record', () => {
    const classified = classify([
      row({ Nome: 'Mario', Cognome: 'Rossi', IPN: 'IPN1', Ruolo: 'Comprimario' }),
      row({ Nome: 'Giulia', Cognome: 'Bianchi', IPN: 'NEW1', Ruolo: 'Doppiatore Primario', Stagione: '1', Episodio: '2' }),
    ])
    expect(classified.ok).toBe(true)
    if (!classified.ok) return
    const inserts = buildCastImportInserts('opera-1', classified.rows, 4)
    expect(inserts.partecipazioni).toEqual([
      expect.objectContaining({ artista_id: 'a1', opera_id: 'opera-1', ruolo_id: 'r-comp', episodio_id: null, personaggio: null }),
    ])
    expect(inserts.castEsterno).toEqual([
      expect.objectContaining({
        opera_id: 'opera-1',
        nome: 'Giulia Bianchi',
        codice_ipn: 'NEW1',
        ruolo_id: 'r-dopp',
        ruolo: 'doppiatore',
        primarieta: 'primario',
        episodio_id: 'ep-1',
        fonte: 'manuale',
        personaggio: null,
        ordine: 4,
      }),
    ])
    expect(JSON.stringify(inserts)).not.toContain('artisti')
  })
})

describe('legacyCastFields', () => {
  it('fills the constrained attore/doppiatore columns from the tipologia', () => {
    expect(legacyCastFields('recitazione', 'Protagonista Primario')).toEqual({ ruolo: 'attore', primarieta: 'primario' })
    expect(legacyCastFields('recitazione', 'Comprimario Primario')).toEqual({ ruolo: 'attore', primarieta: 'comprimario' })
    expect(legacyCastFields('doppiaggio', 'Doppiatore Primario')).toEqual({ ruolo: 'doppiatore', primarieta: 'primario' })
    expect(legacyCastFields('direzione', 'Direzione Doppiaggio')).toEqual({ ruolo: 'doppiatore', primarieta: 'comprimario' })
    expect(legacyCastFields('tecnico', 'Adattamento Dialoghi')).toEqual({ ruolo: 'attore', primarieta: 'comprimario' })
  })
})

describe('insertWithDuplicateFallback', () => {
  it('retries row by row after a unique violation and maps a missing column', async () => {
    const rows = [{ rowNumber: 2 }, { rowNumber: 3 }]
    const unique = await insertWithDuplicateFallback(
      rows,
      async () => ({ error: { code: '23505', message: 'duplicate' } }),
      async (row) => ({ error: row.rowNumber === 3 ? { code: '23505', message: 'duplicate' } : null }),
      CAST_IMPORT_ALERTS.duplicateCast,
    )
    expect(unique).toEqual({
      inserted: 1,
      failed: [{ rowNumber: 3, alert: CAST_IMPORT_ALERTS.duplicateCast }],
    })

    const missing = await insertWithDuplicateFallback(
      rows,
      async () => ({ error: { message: 'column "ruolo_id" of relation "cast_esterno" does not exist' } }),
      async () => ({ error: null }),
      CAST_IMPORT_ALERTS.duplicateCast,
    )
    expect(missing.inserted).toBe(0)
    expect(missing.failed[0].alert).toBe(CAST_IMPORT_ALERTS.migration)
    expect(isMissingCastEsternoColumnError('Could not find the ruolo_id column of cast_esterno in the schema cache')).toBe(true)
  })
})

describe('authorizeCastImport', () => {
  it('allows only app_metadata admin and operatore', () => {
    expect(authorizeCastImport(null)).toMatchObject({ ok: false, status: 401 })
    expect(authorizeCastImport({ app_metadata: { ruolo: 'operatore' } })).toEqual({ ok: true })
    expect(authorizeCastImport({ app_metadata: { ruolo: 'admin' } })).toEqual({ ok: true })
    expect(authorizeCastImport({
      app_metadata: { ruolo: 'artista' },
      user_metadata: { ruolo: 'admin' },
    })).toMatchObject({ ok: false, status: 403 })
    expect(authorizeCastImport({ app_metadata: { ruolo: 'collecting' } })).toMatchObject({ ok: false, status: 403 })
    expect(authorizeCastImport({ app_metadata: { ruolo: 'readonly' } })).toMatchObject({ ok: false, status: 403 })
  })
})
