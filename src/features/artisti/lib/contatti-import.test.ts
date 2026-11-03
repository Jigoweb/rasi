import * as XLSX from 'xlsx'
import {
  buildArtistPatch,
  classifyContattiImport,
  parseContattiEdits,
  parseContattiImportFile,
  type ContattiArtist,
  type ContattiEdit,
  type ContattiFieldKey,
  type ContattiImportRow,
} from './contatti-import'
import { authorizeContattiImport } from './contatti-import-access'

const CF_MARIO = 'RSSMRA80A01H501U'
const CF_MARIO_ALT = 'RSSMRA90A01H501W'
const CF_ANNA = 'BNCNNA85M45F205D'
const PIVA = '12345678903'

function artist(overrides: Partial<ContattiArtist> = {}): ContattiArtist {
  return {
    id: 'a1',
    nome: 'Mario',
    cognome: 'Rossi',
    codice_fiscale: null,
    partita_iva: null,
    contatti: null,
    indirizzo: null,
    riservati: null,
    ...overrides,
  }
}

function edit(overrides: Omit<Partial<ContattiEdit>, 'values'> & { values?: Partial<ContattiEdit['values']> } = {}): ContattiEdit {
  return {
    rowNumber: overrides.rowNumber ?? 2,
    values: {
      cognome: 'Rossi',
      nome: 'Mario',
      email: '',
      via: '',
      cap: '',
      citta: '',
      provincia: '',
      telefono: '',
      codice_fiscale: '',
      partita_iva: '',
      regime: '',
      tassazione: '',
      dettagli_regime: '',
      ...overrides.values,
    },
    included: overrides.included ?? true,
    artistaId: overrides.artistaId ?? null,
    sceltaManuale: overrides.sceltaManuale ?? false,
    decisions: overrides.decisions ?? {},
  }
}

function classify(
  artists: ContattiArtist[],
  edits: ContattiEdit[],
  options?: { keepIncluded?: boolean },
): ContattiImportRow[] {
  const result = classifyContattiImport(artists, edits, options)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error)
  return result.rows
}

function field(row: ContattiImportRow, key: ContattiFieldKey) {
  const found = row.fields.find((item) => item.key === key)
  if (!found) throw new Error(`Campo mancante: ${key}`)
  return found
}

const HEADERS = [
  'cognome', 'nome', 'email', 'via', 'cap', 'citta', 'provincia', 'telefono',
  'codice_fiscale', 'partita_iva', 'regime', 'tassazione', 'dettagli_regime',
]

describe('classifyContattiImport', () => {
  it('matches a valid codice fiscale even if the name has different case, accents or spaces', () => {
    const rows = classify(
      [artist({ codice_fiscale: 'rssmra80a01h501u', nome: 'Marìo', cognome: '  Rossi ' })],
      [edit({ values: { nome: 'MARIO', cognome: 'Rossi', codice_fiscale: CF_MARIO, email: 'mario@example.com' } })],
    )
    expect(rows[0]).toMatchObject({
      status: 'pronto',
      matchType: 'codice_fiscale',
      artistaId: 'a1',
      included: true,
    })
    expect(field(rows[0], 'email').stato).toBe('compilare')
  })

  it('matches a unique nome and cognome when the codice fiscale is missing', () => {
    const rows = classify(
      [artist()],
      [edit({ values: { nome: ' mario ', cognome: 'rossi', telefono: '3331234567' } })],
    )
    expect(rows[0]).toMatchObject({ status: 'pronto', matchType: 'solo_nome', artistaId: 'a1' })
  })

  it('folds accents and apostrophes before comparing the name', () => {
    const rows = classify(
      [artist({ nome: 'José', cognome: "D'Angelo" })],
      [edit({ values: { nome: 'Jose', cognome: 'D Angelo', email: 'j@example.com' } })],
    )
    expect(rows[0].matchType).toBe('solo_nome')
  })

  it('does not swap nome and cognome', () => {
    const rows = classify(
      [artist()],
      [edit({ values: { nome: 'Rossi', cognome: 'Mario' } })],
    )
    expect(rows[0].status).toBe('senza_artista')
    expect(rows[0].included).toBe(false)
  })

  it('ignores empty and placeholder codici fiscali and falls back to the name', () => {
    const rows = classify(
      [artist({ codice_fiscale: 'XXXX' })],
      [edit({ values: { codice_fiscale: 'ABCD', email: 'mario@example.com' } })],
    )
    expect(rows[0].matchType).toBe('solo_nome')
    expect(field(rows[0], 'codice_fiscale').stato).toBe('vuoto')
    const patch = buildArtistPatch(artist({ codice_fiscale: 'XXXX' }), rows[0])
    expect(patch?.codice_fiscale).toBeUndefined()
    expect(patch?.contatti).toMatchObject({ email: 'mario@example.com' })
  })

  it('marks homonyms as da verificare and does not pick one', () => {
    const rows = classify(
      [
        artist({ id: 'a1', codice_fiscale: null }),
        artist({ id: 'a2', nome: 'Mario', cognome: 'Rossi', codice_fiscale: CF_MARIO_ALT }),
      ],
      [edit({ values: { codice_fiscale: '' } })],
    )
    expect(rows[0]).toMatchObject({
      status: 'da_verificare',
      matchType: null,
      artistaId: null,
      included: false,
    })
    expect(rows[0].suggerimenti.map((item) => item.id).sort()).toEqual(['a1', 'a2'])
    expect(buildArtistPatch(artist(), rows[0])).toBeNull()
  })

  it('marks every repeated codice fiscale in the file as da verificare', () => {
    const rows = classify(
      [artist({ codice_fiscale: CF_MARIO })],
      [
        edit({ rowNumber: 2, values: { codice_fiscale: CF_MARIO, email: 'uno@example.com' } }),
        edit({ rowNumber: 3, values: { codice_fiscale: CF_MARIO.toLowerCase(), email: 'due@example.com' } }),
      ],
    )
    expect(rows.map((row) => row.status)).toEqual(['da_verificare', 'da_verificare'])
    expect(rows.every((row) => row.included === false)).toBe(true)
  })

  it('does not auto-match by name when the name is repeated in the file', () => {
    const rows = classify(
      [artist()],
      [
        edit({ rowNumber: 2, values: { email: 'uno@example.com' } }),
        edit({ rowNumber: 3, values: { email: 'due@example.com' } }),
      ],
    )
    expect(rows.map((row) => row.status)).toEqual(['da_verificare', 'da_verificare'])
  })

  it('keeps a unique codice fiscale match when only the name is repeated', () => {
    const rows = classify(
      [
        artist({ id: 'a1', codice_fiscale: CF_MARIO }),
        artist({ id: 'a2', nome: 'Mario', cognome: 'Rossi', codice_fiscale: CF_MARIO_ALT }),
      ],
      [
        edit({ rowNumber: 2, values: { codice_fiscale: CF_MARIO, email: 'uno@example.com' } }),
        edit({ rowNumber: 3, values: { codice_fiscale: CF_MARIO_ALT, email: 'due@example.com' } }),
      ],
    )
    expect(rows[0]).toMatchObject({ status: 'pronto', matchType: 'codice_fiscale', artistaId: 'a1' })
    expect(rows[1]).toMatchObject({ status: 'pronto', matchType: 'codice_fiscale', artistaId: 'a2' })
  })

  it('does not auto-link when the codice fiscale matches a different name', () => {
    const rows = classify(
      [artist({ nome: 'Luigi', cognome: 'Verdi', codice_fiscale: CF_MARIO })],
      [edit({ values: { nome: 'Mario', cognome: 'Rossi', codice_fiscale: CF_MARIO } })],
    )
    expect(rows[0]).toMatchObject({ status: 'da_verificare', matchType: null, artistaId: null })
    expect(rows[0].suggerimenti[0]?.id).toBe('a1')
  })

  it('does not auto-link when the name matches but the codice fiscale differs', () => {
    const rows = classify(
      [artist({ codice_fiscale: CF_MARIO })],
      [edit({ values: { codice_fiscale: CF_MARIO_ALT, email: 'mario@example.com' } })],
    )
    expect(rows[0].status).toBe('da_verificare')
    expect(rows[0].motivo).toMatch(/codice fiscale/i)
    expect(buildArtistPatch(artist({ codice_fiscale: CF_MARIO }), rows[0])).toBeNull()
  })

  it('lists unmatched people and does not create them', () => {
    const rows = classify(
      [artist()],
      [edit({ values: { nome: 'Anna', cognome: 'Bianchi', codice_fiscale: CF_ANNA, email: 'anna@example.com' } })],
    )
    expect(rows[0]).toMatchObject({ status: 'senza_artista', artistaId: null, included: false })
    expect(rows[0].motivo).toMatch(/non crea/i)
  })

  it('accepts a manual artist on a row that was da verificare', () => {
    const current = artist({ id: 'a2', codice_fiscale: null, contatti: null })
    const rows = classify(
      [artist({ id: 'a1' }), current],
      [edit({ artistaId: 'a2', sceltaManuale: true, values: { email: 'mario@example.com' } })],
    )
    expect(rows[0]).toMatchObject({
      status: 'pronto',
      matchType: 'manuale',
      artistaId: 'a2',
      included: true,
    })
  })

  it('fills only empty fields and keeps a different existing value unless the operator replaces it', () => {
    const current = artist({
      contatti: { email: 'vecchia@example.com', note: 'lasciare' },
      indirizzo: { via: '', civico: '10', citta: 'Milano' },
      riservati: { regime: 'forfettario', tassazione: null, dettagli_regime: null },
    })
    const kept = classify(
      [current],
      [edit({
        values: {
          email: 'nuova@example.com',
          via: 'Via Roma',
          citta: 'milano',
          telefono: '3331234567',
          regime: 'ordinario',
          codice_fiscale: CF_MARIO,
        },
      })],
    )
    expect(kept[0].status).toBe('conflitto')
    expect(field(kept[0], 'email')).toMatchObject({
      stato: 'conflitto',
      current: 'vecchia@example.com',
      incoming: 'nuova@example.com',
      decision: 'tieni',
    })
    expect(field(kept[0], 'citta').stato).toBe('uguale')
    expect(field(kept[0], 'via').stato).toBe('compilare')
    expect(field(kept[0], 'regime').stato).toBe('conflitto')

    const keptPatch = buildArtistPatch(current, kept[0])
    expect(keptPatch?.contatti).toMatchObject({
      email: 'vecchia@example.com',
      note: 'lasciare',
      number: '3331234567',
      telefono: '3331234567',
    })
    expect(keptPatch?.indirizzo).toMatchObject({ via: 'Via Roma', civico: '10', citta: 'Milano' })
    expect(keptPatch?.codice_fiscale).toBe(CF_MARIO)
    expect(keptPatch?.riservati).toBeUndefined()
    expect(keptPatch?.campiCompilati).toEqual(expect.arrayContaining(['via', 'telefono', 'codice_fiscale']))
    expect(keptPatch?.conflittiMantenuti).toEqual(expect.arrayContaining(['email', 'regime']))
    expect(keptPatch?.conflittiSostituiti).toEqual([])

    const replaced = classify(
      [current],
      [edit({
        values: { email: 'nuova@example.com', regime: 'ordinario' },
        decisions: { email: 'sostituisci', regime: 'sostituisci' },
      })],
    )
    const replacedPatch = buildArtistPatch(current, replaced[0])
    expect(replacedPatch?.contatti).toMatchObject({ email: 'nuova@example.com' })
    expect(replacedPatch?.riservati).toMatchObject({ regime: 'ordinario', tassazione: null, dettagli_regime: null })
    expect(replacedPatch?.conflittiSostituiti).toEqual(expect.arrayContaining(['email', 'regime']))
  })

  it('treats an equivalent phone as already present whether it is stored as number or telefono', () => {
    const withNumber = artist({ contatti: { number: '333 1234567' } })
    const rows = classify([withNumber], [edit({ values: { telefono: '3331234567' } })])
    expect(field(rows[0], 'telefono').stato).toBe('uguale')
    expect(buildArtistPatch(withNumber, rows[0])).toBeNull()

    const withTelefono = artist({ contatti: { telefono: '3331234567' } })
    const legacy = classify([withTelefono], [edit({ values: { telefono: '333 1234567' } })])
    expect(field(legacy[0], 'telefono').stato).toBe('uguale')
    expect(buildArtistPatch(withTelefono, legacy[0])).toBeNull()
  })

  it('does not write an invalid partita IVA and conflicts when a valid one differs', () => {
    const current = artist({ partita_iva: 12345678903 })
    const invalid = classify([current], [edit({ values: { partita_iva: '0000' } })])
    expect(field(invalid[0], 'partita_iva').stato).toBe('vuoto')
    expect(buildArtistPatch(current, invalid[0])).toBeNull()

    const badChecksum = classify([current], [edit({ values: { partita_iva: '12345678900' } })])
    expect(field(badChecksum[0], 'partita_iva').stato).toBe('vuoto')

    const conflict = classify([current], [edit({ values: { partita_iva: '11111111115' } })])
    expect(field(conflict[0], 'partita_iva')).toMatchObject({
      stato: 'conflitto',
      current: '12345678903',
      incoming: '11111111115',
    })
    expect(buildArtistPatch(current, conflict[0])?.partita_iva).toBeUndefined()
  })

  it('is idempotent: applying the same file again changes nothing', () => {
    const source = artist({ indirizzo: { civico: '4' } })
    const edits = [edit({
      values: {
        email: 'Mario@Example.com',
        telefono: '333 1234567',
        via: 'Via Roma',
        cap: '00100',
        citta: 'Roma',
        provincia: 'RM',
        codice_fiscale: CF_MARIO,
        partita_iva: PIVA,
        regime: 'Ordinario',
        tassazione: 'Ritenuta',
        dettagli_regime: 'Nessuna nota',
      },
    })]
    const first = classify([source], edits)[0]
    const patch = buildArtistPatch(source, first)
    expect(patch).not.toBeNull()
    if (!patch) return

    const stored: ContattiArtist = {
      ...source,
      codice_fiscale: patch.codice_fiscale ?? source.codice_fiscale,
      partita_iva: patch.partita_iva ?? source.partita_iva,
      contatti: patch.contatti ?? source.contatti,
      indirizzo: patch.indirizzo ?? source.indirizzo,
      riservati: patch.riservati ?? source.riservati,
    }
    const second = classify([stored], edits, { keepIncluded: true })[0]
    expect(second.fields.every((item) => item.stato === 'uguale' || item.stato === 'vuoto')).toBe(true)
    expect(buildArtistPatch(stored, second)).toBeNull()
  })

  it('does not turn an automatic artist id into a manual match', () => {
    const rows = classify(
      [artist({ codice_fiscale: CF_MARIO })],
      [edit({ artistaId: 'a1', values: { codice_fiscale: CF_MARIO, email: 'mario@example.com' } })],
    )
    expect(rows[0].matchType).toBe('codice_fiscale')
  })

  it('keeps only the first selected row when two rows point at the same artist', () => {
    const rows = classify(
      [artist({ codice_fiscale: CF_MARIO })],
      [
        edit({ rowNumber: 2, artistaId: 'a1', sceltaManuale: true, values: { codice_fiscale: '', email: 'uno@example.com' } }),
        edit({ rowNumber: 3, artistaId: 'a1', sceltaManuale: true, values: { nome: 'Anna', cognome: 'Bianchi', email: 'due@example.com' } }),
      ],
    )
    expect(rows[0].included).toBe(true)
    expect(rows[1].included).toBe(false)
    expect(rows[1].motivo).toMatch(/già scelto/i)
  })
})

describe('parseContattiImportFile', () => {
  const csv = [
    HEADERS.map((header) => `"${header}"`).join(';'),
    [
      '"Rossi"',
      '"Mario"',
      '"mario@example.com"',
      '"Via Roma"',
      '"00100"',
      '"Roma"',
      '"RM"',
      '"3331234567"',
      `"${CF_MARIO}"`,
      `"${PIVA}"`,
      '"ordinario"',
      '"ritenuta"',
      '"nessuna; nota"',
    ].join(';'),
  ].join('\n')

  it('parses a quoted semicolon CSV without splitting the note', () => {
    const parsed = parseContattiImportFile('contatti.csv', Buffer.from(`\uFEFF${csv}`, 'utf8'))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.edits).toHaveLength(1)
    expect(parsed.edits[0].rowNumber).toBe(2)
    expect(parsed.edits[0].values).toMatchObject({
      cognome: 'Rossi',
      nome: 'Mario',
      email: 'mario@example.com',
      dettagli_regime: 'nessuna; nota',
      codice_fiscale: CF_MARIO,
    })
  })

  it('reads the same columns from xlsx', () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      HEADERS,
      ['Rossi', 'Mario', 'mario@example.com', 'Via Roma', '00100', 'Roma', 'RM', '3331234567', CF_MARIO, PIVA, 'ordinario', 'ritenuta', 'nota'],
    ])
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Contatti')
    const data = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const parsed = parseContattiImportFile('Contatti.xlsx', data)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.edits[0].values.email).toBe('mario@example.com')
    expect(parsed.edits[0].values.partita_iva).toBe(PIVA)
  })

  it('rejects a file that does not have the expected columns', () => {
    const parsed = parseContattiImportFile('contatti.csv', Buffer.from('nome;cognome\nMario;Rossi\n', 'utf8'))
    expect(parsed.ok).toBe(false)
  })
})

describe('parseContattiEdits', () => {
  it('rejects a payload that is not a list of rows', () => {
    expect(parseContattiEdits({ rows: [] }).ok).toBe(false)
    expect(parseContattiEdits([{ rowNumber: 2, values: { nome: 'Mario', cognome: 'Rossi' }, included: true }]).ok).toBe(true)
  })
})

describe('authorizeContattiImport', () => {
  it('allows only admin and operatore from app_metadata', () => {
    expect(authorizeContattiImport(null)).toMatchObject({ ok: false, status: 401 })
    expect(authorizeContattiImport({ app_metadata: { ruolo: 'operatore' }, user_metadata: {} })).toMatchObject({ ok: true })
    expect(authorizeContattiImport({ app_metadata: { ruolo: 'artista' }, user_metadata: { ruolo: 'admin' } })).toMatchObject({ ok: false, status: 403 })
    expect(authorizeContattiImport({ app_metadata: { ruolo: 'readonly' }, user_metadata: {} })).toMatchObject({ ok: false, status: 403 })
  })
})
