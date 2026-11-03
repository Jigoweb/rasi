/**
 * @jest-environment node
 */
import {
  EPISODI_IMPORT_HEADERS,
  buildEpisodiTemplateCsv,
  buildEpisodiTemplateXlsx,
  canImportEpisodi,
  classifyEpisodiMatrix,
  confirmEpisodiDrafts,
  episodiTemplateFileName,
  parseEpisodiFile,
  revalidateEpisodeDrafts,
  runEpisodiImport,
  type EpisodeDraft,
  type EpisodiImportStore,
  type EpisodeInsert,
} from './episodi-import'

const HEADER = [...EPISODI_IMPORT_HEADERS]

function matrix(rows: unknown[][]): unknown[][] {
  const aligned = rows.map((row) => (
    row.length === 5 ? [row[0], row[1], row[2], '', row[3], row[4]] : row
  ))
  return [HEADER, ...aligned]
}

function row(result: ReturnType<typeof classifyEpisodiMatrix>, index = 0) {
  if (!result.ok) throw new Error(result.error)
  return result.rows[index]
}

describe('canImportEpisodi', () => {
  it('consente solo admin e operatore letti da app_metadata', () => {
    expect(canImportEpisodi({ app_metadata: { ruolo: 'admin' } })).toBe(true)
    expect(canImportEpisodi({ app_metadata: { ruolo: 'operatore' } })).toBe(true)
    expect(canImportEpisodi({ app_metadata: { ruolo: 'artista' } })).toBe(false)
    expect(canImportEpisodi({ app_metadata: { ruolo: 'collecting' } })).toBe(false)
    expect(canImportEpisodi({ app_metadata: {} })).toBe(false)
    expect(canImportEpisodi(null)).toBe(false)
  })

  it('ignora un ruolo admin scritto in user_metadata', () => {
    expect(
      canImportEpisodi({
        app_metadata: { ruolo: 'artista' },
        user_metadata: { ruolo: 'admin' },
      }),
    ).toBe(false)
    expect(
      canImportEpisodi({
        app_metadata: { provider: 'email' },
        user_metadata: { ruolo: 'operatore' },
      }),
    ).toBe(false)
  })
})

describe('classifyEpisodiMatrix', () => {
  it('accetta una riga valida e normalizza data gg/mm/aaaa e titolo', () => {
    const result = classifyEpisodiMatrix(
      matrix([[1, 2, '  Pilota  ', 45, '15/03/2020']]),
      [],
    )
    expect(result.ok).toBe(true)
    expect(row(result)).toEqual({
      rowNumber: 2,
      status: 'valid',
      message: null,
      stagione: 1,
      episodio: 2,
      titolo: 'Pilota',
      titoloOriginale: null,
      durataMinuti: 45,
      dataPrimaMessaInOnda: '2020-03-15',
      draft: {
        stagione: '1',
        episodio: '2',
        titolo: 'Pilota',
        titoloOriginale: '',
        durataMinuti: '45',
        dataPrimaMessaInOnda: '15/03/2020',
      },
    })
  })

  it('accetta titolo, durata e data vuoti', () => {
    const result = classifyEpisodiMatrix(matrix([['1', '3', '', '', '']]), [])
    expect(row(result).status).toBe('valid')
    expect(row(result).titolo).toBeNull()
    expect(row(result).durataMinuti).toBeNull()
    expect(row(result).dataPrimaMessaInOnda).toBeNull()
  })

  it('accetta data con giorno e mese a una cifra e una data ISO', () => {
    const dmy = classifyEpisodiMatrix(matrix([[1, 1, 'A', null, '5/3/2020']]), [])
    const iso = classifyEpisodiMatrix(matrix([[1, 1, 'A', null, '2020-03-15']]), [])
    expect(row(dmy).dataPrimaMessaInOnda).toBe('2020-03-05')
    expect(row(iso).dataPrimaMessaInOnda).toBe('2020-03-15')
  })

  it('accetta il seriale Excel e una data con orario', () => {
    const serial = classifyEpisodiMatrix(matrix([[1, 1, 'A', null, 43905]]), [])
    const withTime = classifyEpisodiMatrix(
      matrix([[1, 1, 'A', null, '15/03/2020 00:00:00']]),
      [],
    )
    expect(row(serial).dataPrimaMessaInOnda).toBe('2020-03-15')
    expect(row(withTime).dataPrimaMessaInOnda).toBe('2020-03-15')
  })

  it('ignora le righe completamente vuote senza avviso e conserva il numero di riga', () => {
    const result = classifyEpisodiMatrix(
      matrix([
        [null, null, null, null, null],
        [1, 4, 'Dopo il vuoto', null, null],
      ]),
      [],
    )
    if (!result.ok) throw new Error(result.error)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].rowNumber).toBe(3)
    expect(result.rows[0].episodio).toBe(4)
  })

  it('salta stagione o episodio assenti, zero, negativi o non interi', () => {
    const cases: unknown[][] = [
      ['', 1, 'A', null, null],
      [0, 1, 'A', null, null],
      [-2, 1, 'A', null, null],
      [1.5, 1, 'A', null, null],
      [1, '', 'A', null, null],
      [1, 0, 'A', null, null],
      [1, '2bis', 'A', null, null],
    ]
    for (const cells of cases) {
      const result = classifyEpisodiMatrix(matrix([cells]), [])
      expect(row(result).status).toBe('skipped')
      expect(row(result).message).toMatch(/Stagione non valida|Episodio non valido/)
    }
  })

  it('salta durata zero, negativa o frazionaria e data impossibile o anno a due cifre', () => {
    const durata = classifyEpisodiMatrix(matrix([[1, 1, 'A', 0, null]]), [])
    const frazione = classifyEpisodiMatrix(matrix([[1, 1, 'A', '45,5', null]]), [])
    const data = classifyEpisodiMatrix(matrix([[1, 1, 'A', null, '31/02/2020']]), [])
    const annoCorto = classifyEpisodiMatrix(matrix([[1, 1, 'A', null, '15/03/20']]), [])
    expect(row(durata).message).toMatch(/Durata non valida/)
    expect(row(frazione).message).toMatch(/Durata non valida/)
    expect(row(data).message).toMatch(/Data prima messa in onda non valida/)
    expect(row(data).draft.dataPrimaMessaInOnda).toBe('31/02/2020')
    expect(row(annoCorto).message).toMatch(/Data prima messa in onda non valida/)
    expect(row(annoCorto).draft.dataPrimaMessaInOnda).toBe('15/03/20')
  })

  it('unisce più errori di campo sulla stessa riga', () => {
    const result = classifyEpisodiMatrix(matrix([[0, 0, 'A', -1, 'no']]), [])
    expect(row(result).status).toBe('skipped')
    expect(row(result).message).toMatch(/Stagione non valida/)
    expect(row(result).message).toMatch(/Episodio non valido/)
    expect(row(result).message).toMatch(/Durata non valida/)
    expect(row(result).message).toMatch(/Data prima messa in onda non valida/)
  })

  it('salta un episodio già presente senza trattarlo come aggiornamento', () => {
    const result = classifyEpisodiMatrix(matrix([[1, 1, 'Nuovo titolo', 50, '01/01/2021']]), [
      { numero_stagione: 1, numero_episodio: 1 },
    ])
    expect(row(result)).toMatchObject({
      status: 'skipped',
      stagione: 1,
      episodio: 1,
      titolo: 'Nuovo titolo',
    })
    expect(row(result).message).toBe(
      'Episodio già presente sull\'opera (stagione 1, episodio 1): riga ignorata, nessun aggiornamento',
    )
  })

  it('tiene la prima occorrenza e salta i duplicati successivi nel file', () => {
    const result = classifyEpisodiMatrix(
      matrix([
        [1, 1, 'Prima', 40, '01/01/2020'],
        [1, 1, 'Seconda', 41, '02/01/2020'],
        ['01', '01', 'Terza', null, null],
      ]),
      [],
    )
    if (!result.ok) throw new Error(result.error)
    expect(result.rows.map((item) => item.status)).toEqual(['valid', 'skipped', 'skipped'])
    expect(result.rows[1].message).toBe(
      'Duplicato nel file: stagione 1, episodio 1 è già alla riga 2',
    )
    expect(result.rows[2].message).toBe(
      'Duplicato nel file: stagione 1, episodio 1 è già alla riga 2',
    )
    expect(result.alerts).toEqual([
      { rowNumber: 3, message: result.rows[1].message },
      { rowNumber: 4, message: result.rows[2].message },
    ])
  })

  it('se la prima riga con la stessa coppia è invalida, le successive restano duplicate', () => {
    const result = classifyEpisodiMatrix(
      matrix([
        [1, 1, 'Rotta', null, '31/02/2020'],
        [1, 1, 'Corretta', 40, '01/02/2020'],
      ]),
      [],
    )
    if (!result.ok) throw new Error(result.error)
    expect(result.rows[0].status).toBe('skipped')
    expect(result.rows[0].message).toMatch(/Data prima messa in onda non valida/)
    expect(result.rows[1].status).toBe('skipped')
    expect(result.rows[1].message).toMatch(/Duplicato nel file/)
  })

  it('rifiuta colonne diverse, anche solo per maiuscole o colonne extra', () => {
    const missing = classifyEpisodiMatrix([['Stagione', 'Episodio'], [1, 1]], [])
    const extra = classifyEpisodiMatrix(
      [['Stagione', 'Episodio', 'Titolo', 'Durata (minuti)', 'Data prima messa in onda', 'Note'], [1, 1, 'A', null, null, 'x']],
      [],
    )
    const wrongCase = classifyEpisodiMatrix(
      [['stagione', 'Episodio', 'Titolo', 'Durata (minuti)', 'Data prima messa in onda'], [1, 1, 'A', null, null]],
      [],
    )
    expect(missing.ok).toBe(false)
    expect(extra.ok).toBe(false)
    expect(wrongCase.ok).toBe(false)
    if (!extra.ok) expect(extra.error).toMatch(/Note/)
  })

  it('legge titolo italiano e titolo originale come colonne distinte', () => {
    const result = classifyEpisodiMatrix(
      [[...HEADER], [1, 2, '  Il quinto oboe  ', ' The Fifth Oboe ', 40, null]],
      [],
    )
    expect(row(result)).toMatchObject({
      status: 'valid',
      titolo: 'Il quinto oboe',
      titoloOriginale: 'The Fifth Oboe',
      draft: { titolo: 'Il quinto oboe', titoloOriginale: 'The Fifth Oboe' },
    })
  })

  it('accetta il template precedente con la sola colonna Titolo come titolo italiano', () => {
    const result = classifyEpisodiMatrix(
      [['Stagione', 'Episodio', 'Titolo', 'Durata (minuti)', 'Data prima messa in onda'], [1, 1, 'Pilota', null, null]],
      [],
    )
    expect(row(result)).toMatchObject({ status: 'valid', titolo: 'Pilota', titoloOriginale: null })
  })

  it('accetta le colonne in ordine diverso', () => {
    const result = classifyEpisodiMatrix(
      [
        ['Titolo', 'Data prima messa in onda', 'Episodio', 'Durata (minuti)', 'Stagione'],
        ['Pilot', '15/03/2020', 8, 30, 2],
      ],
      [],
    )
    expect(row(result)).toMatchObject({
      status: 'valid',
      stagione: 2,
      episodio: 8,
      titolo: 'Pilot',
      durataMinuti: 30,
      dataPrimaMessaInOnda: '2020-03-15',
    })
  })
})

describe('template episodi', () => {
  const existing = [
    {
      numero_stagione: 1,
      numero_episodio: 2,
      titolo_episodio: 'Secondo',
      titolo_episodio_originale: 'Second',
      durata_minuti: 44,
      data_prima_messa_in_onda: '2020-03-15',
    },
    {
      numero_stagione: 1,
      numero_episodio: 1,
      titolo_episodio: null,
      durata_minuti: null,
      data_prima_messa_in_onda: null,
    },
  ]

  it('precompila l’xlsx con gli episodi esistenti, ordinati, e il reimport li salta', () => {
    const bytes = buildEpisodiTemplateXlsx(existing)
    const parsed = parseEpisodiFile('episodi.xlsx', bytes)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const classified = classifyEpisodiMatrix(parsed.matrix, existing)
    if (!classified.ok) throw new Error(classified.error)
    expect(classified.rows.map((item) => [item.stagione, item.episodio, item.status, item.titolo, item.durataMinuti, item.dataPrimaMessaInOnda])).toEqual([
      [1, 1, 'skipped', null, null, null],
      [1, 2, 'skipped', 'Secondo', 44, '2020-03-15'],
    ])
    expect(classified.rows.every((item) => item.message?.includes('nessun aggiornamento'))).toBe(true)
  })

  it('precompila anche il CSV, con virgola o punto e virgola', () => {
    const csv = buildEpisodiTemplateCsv(existing)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const comma = parseEpisodiFile('episodi.csv', new TextEncoder().encode(csv))
    const semicolon = parseEpisodiFile(
      'episodi.csv',
      new TextEncoder().encode(
        'Stagione;Episodio;Titolo;Durata (minuti);Data prima messa in onda\n2;3;Punto e virgola;50;01/04/2021\n',
      ),
    )
    expect(comma.ok && semicolon.ok).toBe(true)
    if (!comma.ok || !semicolon.ok) return
    const fromTemplate = classifyEpisodiMatrix(comma.matrix, [])
    const fromSemicolon = classifyEpisodiMatrix(semicolon.matrix, [])
    if (!fromTemplate.ok || !fromSemicolon.ok) throw new Error('parse')
    expect(fromTemplate.rows[0]).toMatchObject({ stagione: 1, episodio: 1, status: 'valid', titolo: null })
    expect(fromTemplate.rows[1]).toMatchObject({
      stagione: 1,
      episodio: 2,
      titolo: 'Secondo',
      titoloOriginale: 'Second',
      durataMinuti: 44,
      dataPrimaMessaInOnda: '2020-03-15',
    })
    expect(fromSemicolon.rows[0]).toMatchObject({
      status: 'valid',
      stagione: 2,
      episodio: 3,
      titolo: 'Punto e virgola',
      durataMinuti: 50,
      dataPrimaMessaInOnda: '2021-04-01',
    })
  })

  it('costruisce un nome file sicuro', () => {
    expect(episodiTemplateFileName('La città è mia!', 'xlsx', new Date('2026-10-23T00:00:00Z'))).toBe(
      'episodi_La_citta_e_mia_2026-10-23.xlsx',
    )
    expect(episodiTemplateFileName(null, 'csv', new Date('2026-10-23T00:00:00Z'))).toBe(
      'episodi_opera_2026-10-23.csv',
    )
  })
})

describe('runEpisodiImport', () => {
  const operaId = '11111111-1111-4111-8111-111111111111'

  function storeFor(options: {
    opera: { id: string; tipo: string | null; has_episodes: boolean | null } | null
    existing?: Array<{ numero_stagione: number; numero_episodio: number }>
    onInsert?: (row: EpisodeInsert) => { ok: true } | { ok: false; code?: string; message: string }
  }): { store: EpisodiImportStore; inserted: EpisodeInsert[] } {
    const inserted: EpisodeInsert[] = []
    const store: EpisodiImportStore = {
      async getOpera(id) {
        expect(id).toBe(operaId)
        return options.opera
      },
      async listEpisodeKeys() {
        return options.existing ?? []
      },
      async insertEpisode(row) {
        inserted.push(row)
        return options.onInsert ? options.onInsert(row) : { ok: true }
      },
    }
    return { store, inserted }
  }

  function csvFile(body: string) {
    return new TextEncoder().encode(
      `Stagione,Episodio,Titolo,Durata (minuti),Data prima messa in onda\n${body}`,
    )
  }

  it('in anteprima non inserisce e segna solo le righe valide', async () => {
    const { store, inserted } = storeFor({
      opera: { id: operaId, tipo: 'serie_tv', has_episodes: true },
      existing: [{ numero_stagione: 1, numero_episodio: 1 }],
    })
    const result = await runEpisodiImport({
      store,
      operaId,
      filename: 'episodi.csv',
      bytes: csvFile('1,1,Gia,40,01/01/2020\n1,2,Nuovo,41,02/01/2020\n'),
      mode: 'preview',
    })
    expect(inserted).toEqual([])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.mode).toBe('preview')
    expect(result.summary).toEqual({ total: 2, valid: 1, skipped: 1, excluded: 0, imported: 0 })
    expect(result.rows[0].included).toBe(false)
    expect(result.rows[1].included).toBe(true)
    expect(result.existingKeys).toEqual([{ numero_stagione: 1, numero_episodio: 1 }])
    expect(result.rows[1]).toMatchObject({ status: 'valid', stagione: 1, episodio: 2 })
  })

  it('in conferma inserisce solo le righe valide e non aggiorna gli esistenti', async () => {
    const { store, inserted } = storeFor({
      opera: { id: operaId, tipo: 'animazione', has_episodes: true },
      existing: [{ numero_stagione: 1, numero_episodio: 1 }],
    })
    const result = await runEpisodiImport({
      store,
      operaId,
      filename: 'episodi.csv',
      bytes: csvFile('1,1,Non aggiornare,40,01/01/2020\n1,2,Nuovo,41,\n, ,rotta,,\n'),
      mode: 'confirm',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.summary.imported).toBe(1)
    expect(inserted).toEqual([
      {
        opera_id: operaId,
        numero_stagione: 1,
        numero_episodio: 2,
        titolo_episodio: 'Nuovo',
        titolo_episodio_originale: null,
        durata_minuti: 41,
        data_prima_messa_in_onda: null,
      },
    ])
    expect(result.alerts.map((alert) => alert.rowNumber)).toEqual([2, 4])
  })

  it('rifiuta un’opera che non può avere episodi e un’opera assente', async () => {
    const film = storeFor({
      opera: { id: operaId, tipo: 'serie_tv', has_episodes: false },
    })
    const missing = storeFor({ opera: null })
    const denied = await runEpisodiImport({
      store: film.store,
      operaId,
      filename: 'episodi.csv',
      bytes: csvFile('1,1,A,,\n'),
      mode: 'confirm',
    })
    const absent = await runEpisodiImport({
      store: missing.store,
      operaId,
      filename: 'episodi.csv',
      bytes: csvFile('1,1,A,,\n'),
      mode: 'preview',
    })
    expect(denied).toMatchObject({ ok: false, status: 400 })
    expect(absent).toMatchObject({ ok: false, status: 404 })
    expect(film.inserted).toEqual([])
    expect(missing.inserted).toEqual([])
  })

  it('consente il film se has_episodes è true', async () => {
    const { store, inserted } = storeFor({
      opera: { id: operaId, tipo: 'film', has_episodes: true },
    })
    const result = await runEpisodiImport({
      store,
      operaId,
      filename: 'episodi.csv',
      bytes: csvFile('1,1,A,,\n'),
      mode: 'confirm',
    })
    expect(result.ok && result.summary.imported).toBe(1)
    expect(inserted).toHaveLength(1)
  })

  it('trasforma un conflitto univoco in skip e non conta la riga come importata', async () => {
    const { store } = storeFor({
      opera: { id: operaId, tipo: 'serie_tv', has_episodes: true },
      onInsert: () => ({ ok: false, code: '23505', message: 'duplicate key' }),
    })
    const result = await runEpisodiImport({
      store,
      operaId,
      filename: 'episodi.csv',
      bytes: csvFile('3,1,Corsa,,\n'),
      mode: 'confirm',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.summary).toMatchObject({ imported: 0, skipped: 1, valid: 0 })
    expect(result.alerts[0].message).toMatch(/già presente/)
    expect(result.alerts[0].message).toMatch(/nessun aggiornamento/)
  })

  it('rifiuta un formato diverso da xlsx e csv', async () => {
    const { store, inserted } = storeFor({
      opera: { id: operaId, tipo: 'serie_tv', has_episodes: true },
    })
    const result = await runEpisodiImport({
      store,
      operaId,
      filename: 'episodi.xls',
      bytes: new Uint8Array([1, 2, 3]),
      mode: 'preview',
    })
    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(inserted).toEqual([])
  })
})

function draft(stagione: string, episodio: string, titolo: string, data = '', titoloOriginale = ''): EpisodeDraft {
  return { stagione, episodio, titolo, titoloOriginale, durataMinuti: '', dataPrimaMessaInOnda: data }
}

describe('revalidateEpisodeDrafts', () => {
  it('tiene escluso un duplicato corretto finché non viene incluso e non riscrive la bozza', () => {
    const start = revalidateEpisodeDrafts([
      { rowNumber: 2, included: true, draft: draft('1', '1', 'Prima') },
      { rowNumber: 3, included: false, draft: draft('1', '1', 'Seconda') },
    ], [])
    expect(start[1].status).toBe('skipped')
    expect(start[1].included).toBe(false)
    expect(start[1].message).toMatch(/Duplicato nel file/)

    const fixed = revalidateEpisodeDrafts([
      start[0],
      { ...start[1], draft: { ...start[1].draft, episodio: '9' } },
    ], [])
    expect(fixed[1]).toMatchObject({ status: 'valid', episodio: 9, included: false })

    const chosen = revalidateEpisodeDrafts([
      fixed[0],
      { ...fixed[1], included: true },
    ], [])
    expect(chosen[1].included).toBe(true)
  })

  it('esclude una riga inclusa che diventa non valida e conserva il testo digitato', () => {
    const rows = revalidateEpisodeDrafts([
      { rowNumber: 2, included: true, draft: draft('1', '1', 'A', '5/3/2020') },
    ], [])
    expect(rows[0].status).toBe('valid')
    expect(rows[0].dataPrimaMessaInOnda).toBe('2020-03-05')
    expect(rows[0].draft.dataPrimaMessaInOnda).toBe('5/3/2020')

    const broken = revalidateEpisodeDrafts([
      { rowNumber: 2, included: true, draft: draft('1', '1', 'A', '31/02/2020') },
    ], [])
    expect(broken[0]).toMatchObject({ status: 'skipped', included: false })
    expect(broken[0].draft.dataPrimaMessaInOnda).toBe('31/02/2020')
    expect(broken[0].message).toMatch(/Data prima messa in onda non valida/)
  })

  it('segna una riga svuotata in anteprima senza toglierla e ordina per numero di riga', () => {
    const rows = revalidateEpisodeDrafts([
      { rowNumber: 5, included: true, draft: draft('1', '1', 'Dopo') },
      { rowNumber: 4, included: true, draft: draft('', '', '') },
      { rowNumber: 2, included: true, draft: draft('1', '1', 'Prima') },
    ], [])
    expect(rows.map((item) => item.rowNumber)).toEqual([2, 4, 5])
    expect(rows[0].status).toBe('valid')
    expect(rows[1]).toMatchObject({ status: 'skipped', message: 'Riga vuota', included: false })
    expect(rows[2].message).toBe('Duplicato nel file: stagione 1, episodio 1 è già alla riga 2')
  })

  it('rende importabile il duplicato se la prima riga valida è esclusa, senza includerlo da solo', () => {
    const released = revalidateEpisodeDrafts([
      { rowNumber: 2, included: false, draft: draft('1', '1', 'Prima') },
      { rowNumber: 3, included: false, draft: draft('1', '1', 'Seconda') },
    ], [])
    expect(released[0]).toMatchObject({ status: 'valid', included: false })
    expect(released[1]).toMatchObject({ status: 'valid', included: false, message: null, titolo: 'Seconda' })

    const chosen = revalidateEpisodeDrafts([
      released[0],
      { ...released[1], included: true },
    ], [])
    expect(chosen[0]).toMatchObject({ status: 'valid', included: false })
    expect(chosen[1]).toMatchObject({ status: 'valid', included: true })

    const restored = revalidateEpisodeDrafts([
      { ...chosen[0], included: true },
      chosen[1],
    ], [])
    expect(restored[0]).toMatchObject({ status: 'valid', included: true })
    expect(restored[1].status).toBe('skipped')
    expect(restored[1].included).toBe(false)
    expect(restored[1].message).toMatch(/Duplicato nel file/)
  })

  it('una riga non valida o già presente continua a bloccare il duplicato successivo', () => {
    const invalid = revalidateEpisodeDrafts([
      { rowNumber: 2, included: false, draft: draft('1', '1', 'Rotta', '31/02/2020') },
      { rowNumber: 3, included: true, draft: draft('1', '1', 'Seconda') },
    ], [])
    expect(invalid[0].status).toBe('skipped')
    expect(invalid[1].status).toBe('skipped')
    expect(invalid[1].included).toBe(false)
    expect(invalid[1].message).toMatch(/Duplicato nel file/)

    const existing = revalidateEpisodeDrafts([
      { rowNumber: 2, included: false, draft: draft('1', '1', 'Gia') },
      { rowNumber: 3, included: true, draft: draft('1', '1', 'Altra') },
    ], [{ numero_stagione: 1, numero_episodio: 1 }])
    expect(existing[0].message).toMatch(/già presente/)
    expect(existing[1].message).toMatch(/Duplicato nel file/)
    expect(existing[1].included).toBe(false)
  })
})

describe('confirmEpisodiDrafts', () => {
  const operaId = '11111111-1111-4111-8111-111111111111'

  function storeFor(options: {
    existing?: Array<{ numero_stagione: number; numero_episodio: number }>
    onInsert?: (row: EpisodeInsert) => { ok: true } | { ok: false; code?: string; message: string }
  } = {}) {
    const inserted: EpisodeInsert[] = []
    let lookedUp = false
    const store: EpisodiImportStore = {
      async getOpera() {
        lookedUp = true
        return { id: operaId, tipo: 'serie_tv', has_episodes: true }
      },
      async listEpisodeKeys() {
        return options.existing ?? []
      },
      async insertEpisode(row) {
        inserted.push(row)
        return options.onInsert ? options.onInsert(row) : { ok: true }
      },
    }
    return { store, inserted, wasLookedUp: () => lookedUp }
  }

  it('non inserisce una riga valida esclusa e ignora included su un duplicato o su un episodio già presente', async () => {
    const { store, inserted } = storeFor({
      existing: [{ numero_stagione: 1, numero_episodio: 8 }],
    })
    const result = await confirmEpisodiDrafts({
      store,
      operaId,
      rows: [
        { rowNumber: 2, included: false, draft: draft('2', '1', 'Esclusa') },
        { rowNumber: 3, included: true, draft: draft('1', '1', 'Prima') },
        { rowNumber: 4, included: true, draft: draft('1', '1', 'Duplicata') },
        { rowNumber: 5, included: true, draft: draft('1', '8', 'Gia presente') },
        { rowNumber: 6, included: true, draft: draft('1', '4', 'Corretta') },
      ],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(inserted.map((row) => row.numero_episodio)).toEqual([1, 4])
    expect(result.summary).toMatchObject({ imported: 2, excluded: 1, skipped: 2 })
    expect(result.rows.find((row) => row.rowNumber === 4)?.included).toBe(false)
    expect(result.alerts.map((alert) => alert.rowNumber)).toEqual([4, 5])
  })

  it('importa la seconda occorrenza se la prima è esclusa e la seconda è inclusa', async () => {
    const { store, inserted } = storeFor()
    const result = await confirmEpisodiDrafts({
      store,
      operaId,
      rows: [
        { rowNumber: 2, included: false, draft: draft('1', '1', 'Prima') },
        { rowNumber: 3, included: true, draft: draft('1', '1', 'Seconda') },
      ],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(inserted).toEqual([
      {
        opera_id: operaId,
        numero_stagione: 1,
        numero_episodio: 1,
        titolo_episodio: 'Seconda',
        titolo_episodio_originale: null,
        durata_minuti: null,
        data_prima_messa_in_onda: null,
      },
    ])
    expect(result.summary).toMatchObject({ imported: 1, excluded: 1, skipped: 0, valid: 2 })
    expect(result.rows[1]).toMatchObject({ status: 'valid', included: true, titolo: 'Seconda' })
  })

  it('salva il titolo originale distinto dal titolo italiano', async () => {
    const { store, inserted } = storeFor()
    const result = await confirmEpisodiDrafts({
      store,
      operaId,
      rows: [{
        rowNumber: 2,
        included: true,
        draft: draft('1', '3', 'Il quinto oboe', '', 'The Fifth Oboe'),
      }],
    })
    expect(result.ok).toBe(true)
    expect(inserted[0]).toMatchObject({
      titolo_episodio: 'Il quinto oboe',
      titolo_episodio_originale: 'The Fifth Oboe',
    })
  })

  it('trasforma un conflitto univoco in skip e blocca un permesso negato', async () => {
    const conflict = storeFor({
      onInsert: () => ({ ok: false, code: '23505', message: 'duplicate key' }),
    })
    const skipped = await confirmEpisodiDrafts({
      store: conflict.store,
      operaId,
      rows: [{ rowNumber: 2, included: true, draft: draft('3', '1', 'Corsa') }],
    })
    expect(skipped.ok).toBe(true)
    if (!skipped.ok) return
    expect(skipped.summary).toMatchObject({ imported: 0, skipped: 1, valid: 0 })
    expect(skipped.alerts[0].message).toMatch(/nessun aggiornamento/)

    const denied = storeFor({
      onInsert: () => ({ ok: false, code: '42501', message: 'permission denied for table episodi' }),
    })
    const forbidden = await confirmEpisodiDrafts({
      store: denied.store,
      operaId,
      rows: [{ rowNumber: 2, included: true, draft: draft('3', '2', 'No') }],
    })
    expect(forbidden).toMatchObject({ ok: false, status: 403 })
  })

  it('rifiuta bozze non testuali, inclusioni non booleane e numeri di riga duplicati senza leggere l’opera', async () => {
    const { store, inserted, wasLookedUp } = storeFor()
    const numeric = await confirmEpisodiDrafts({
      store,
      operaId,
      rows: [{
        rowNumber: 2,
        included: true,
        draft: { stagione: 1, episodio: '1', titolo: '', durataMinuti: '', dataPrimaMessaInOnda: '' },
      }],
    })
    const flag = await confirmEpisodiDrafts({
      store,
      operaId,
      rows: [{ rowNumber: 2, included: 'true', draft: draft('1', '1', 'A') }],
    })
    const duplicate = await confirmEpisodiDrafts({
      store,
      operaId,
      rows: [
        { rowNumber: 2, included: true, draft: draft('1', '1', 'A') },
        { rowNumber: 2, included: false, draft: draft('1', '2', 'B') },
      ],
    })
    expect(numeric).toMatchObject({ ok: false, status: 400 })
    expect(flag).toMatchObject({ ok: false, status: 400 })
    expect(duplicate).toMatchObject({ ok: false, status: 400, error: 'Numero di riga duplicato: 2.' })
    expect(inserted).toEqual([])
    expect(wasLookedUp()).toBe(false)
  })
})
