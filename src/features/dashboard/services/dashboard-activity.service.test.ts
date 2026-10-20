import {
  attachUsersToActivities,
  buildArtistaActivity,
  buildCampagnaIndividuazioneActivity,
  buildCampagnaProgrammazioneActivity,
  buildCastEsternoActivity,
  buildOperaActivity,
  buildPartecipazioneActivity,
  loadActivityFeed,
  mergeAndSortActivities,
  resolveActivityUserEmails,
} from './dashboard-activity.service'

describe('dashboard activity builders', () => {
  it('builds create activity for a new artista', () => {
    const item = buildArtistaActivity({
      id: 'a1',
      nome: 'Mario',
      cognome: 'Rossi',
      created_at: '2026-10-01T10:00:00.000Z',
      updated_at: '2026-10-01T10:00:00.000Z',
      created_by: 'user-1',
      updated_by: 'user-1',
    })

    expect(item).toMatchObject({
      tipo: 'artista',
      label: 'Nuovo artista registrato',
      dettaglio: 'Mario Rossi',
      href: '/dashboard/artisti/a1',
      utenteId: 'user-1',
      timestamp: '2026-10-01T10:00:00.000Z',
    })
  })

  it('builds update activity when updated_at is later', () => {
    const item = buildArtistaActivity({
      id: 'a1',
      nome: 'Mario',
      cognome: 'Rossi',
      created_at: '2026-10-01T10:00:00.000Z',
      updated_at: '2026-10-02T12:30:00.000Z',
      created_by: 'user-1',
      updated_by: 'user-2',
    })

    expect(item).toMatchObject({
      label: 'Artista aggiornato',
      timestamp: '2026-10-02T12:30:00.000Z',
      utenteId: 'user-2',
      href: '/dashboard/artisti/a1',
    })
  })

  it('builds opera and campagna activities with destination hrefs', () => {
    expect(
      buildOperaActivity({
        id: 'o1',
        titolo: 'Film X',
        created_at: '2026-10-01T10:00:00.000Z',
        created_by: 'user-1',
      })
    ).toMatchObject({
      href: '/dashboard/opere/o1',
      label: 'Nuova opera catalogata',
    })

    expect(
      buildCampagnaIndividuazioneActivity({
        id: 'ci1',
        nome: 'Run A',
        updated_at: '2026-10-03T08:00:00.000Z',
        created_by: 'user-3',
      })
    ).toMatchObject({
      href: '/dashboard/individuazioni/ci1',
      utenteId: 'user-3',
    })

    expect(
      buildCampagnaProgrammazioneActivity({
        id: 'cp1',
        nome: 'Prog B',
        created_at: '2026-10-04T09:00:00.000Z',
        created_by: 'user-4',
      })
    ).toMatchObject({
      href: '/dashboard/programmazioni/cp1',
      utenteId: 'user-4',
    })
  })

  it('builds partecipazione and cast esterno activities linked to the opera', () => {
    expect(
      buildPartecipazioneActivity({
        id: 'p1',
        opera_id: 'o1',
        created_at: '2026-10-01T10:00:00.000Z',
        updated_at: '2026-10-06T11:00:00.000Z',
        created_by: 'user-1',
        updated_by: 'user-5',
        artisti: { nome: 'Mario', cognome: 'Rossi' },
        opere: { id: 'o1', titolo: 'Film X' },
      })
    ).toMatchObject({
      tipo: 'partecipazione',
      label: 'Partecipazione aggiornata',
      dettaglio: 'Mario Rossi — Film X',
      href: '/dashboard/opere/o1',
      utenteId: 'user-5',
      timestamp: '2026-10-06T11:00:00.000Z',
    })

    expect(
      buildCastEsternoActivity({
        id: 'c1',
        nome: 'Anna Verdi',
        ruolo: 'doppiatore',
        primarieta: 'primario',
        opera_id: 'o1',
        created_at: '2026-10-06T12:00:00.000Z',
        opere: [{ titolo: 'Film X' }],
      })
    ).toMatchObject({
      tipo: 'cast_esterno',
      label: 'Cast esterno aggiunto',
      dettaglio: 'Anna Verdi — Doppiatore primario — Film X',
      href: '/dashboard/opere/o1',
      utenteId: null,
      timestamp: '2026-10-06T12:00:00.000Z',
    })

    expect(
      buildPartecipazioneActivity({
        id: 'p2',
        created_at: '2026-10-01T10:00:00.000Z',
        artisti: null,
        opere: null,
      })
    ).toBeNull()
  })

  it('merges and sorts by timestamp descending', () => {
    const merged = mergeAndSortActivities(
      [
        {
          id: '1',
          tipo: 'artista',
          label: 'old',
          dettaglio: 'a',
          timestamp: '2026-10-01T10:00:00.000Z',
          href: '/dashboard/artisti/1',
          utenteId: null,
        },
        {
          id: '2',
          tipo: 'opera',
          label: 'new',
          dettaglio: 'b',
          timestamp: '2026-10-05T10:00:00.000Z',
          href: '/dashboard/opere/2',
          utenteId: null,
        },
      ],
      1
    )

    expect(merged).toHaveLength(1)
    expect(merged[0].id).toBe('2')
  })

  it('attaches resolved user emails onto activities', () => {
    const items = attachUsersToActivities(
      [
        {
          id: '1',
          tipo: 'artista',
          label: 'Artista aggiornato',
          dettaglio: 'Mario Rossi',
          timestamp: '2026-10-02T12:30:00.000Z',
          href: '/dashboard/artisti/1',
          utenteId: 'user-2',
        },
      ],
      new Map([['user-2', 'operatore@rasi.local']])
    )

    expect(items[0].utente).toBe('operatore@rasi.local')
  })

  it('loads artisti, opere, partecipazioni, cast esterno and campagne', async () => {
    const tables: string[] = []
    const query = (table: string) => {
      const chain: any = {
        select: () => chain,
        order: () => chain,
        eq: () => chain,
        limit: () => chain,
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve({ data: rowsFor(table), error: null }).then(resolve, reject),
      }
      return chain
    }
    const rowsFor = (table: string) => {
      if (table === 'artisti') {
        return [{
          id: 'a1',
          nome: 'Mario',
          cognome: 'Rossi',
          created_at: '2026-10-01T10:00:00.000Z',
          updated_at: '2026-10-01T10:00:00.000Z',
          created_by: 'user-1',
          updated_by: 'user-1',
        }]
      }
      if (table === 'opere') {
        return [{
          id: 'o1',
          titolo: 'Film X',
          created_at: '2026-10-02T10:00:00.000Z',
          created_by: 'user-1',
        }]
      }
      if (table === 'partecipazioni') {
        return [{
          id: 'p1',
          opera_id: 'o1',
          created_at: '2026-10-04T10:00:00.000Z',
          created_by: 'user-2',
          artisti: { nome: 'Lucia', cognome: 'Bianchi' },
          opere: { id: 'o1', titolo: 'Film X' },
        }]
      }
      if (table === 'cast_esterno') {
        return [{
          id: 'c1',
          nome: 'Anna Verdi',
          ruolo: 'attore',
          primarieta: 'comprimario',
          opera_id: 'o1',
          created_at: '2026-10-05T10:00:00.000Z',
          opere: { titolo: 'Film X' },
        }]
      }
      if (table === 'campagne_individuazione') {
        return [{
          id: 'ci1',
          nome: 'Run A',
          updated_at: '2026-10-03T08:00:00.000Z',
          created_by: 'user-3',
          stato: 'completata',
        }]
      }
      return [{
        id: 'cp1',
        nome: 'Prog B',
        created_at: '2026-10-06T09:00:00.000Z',
        created_by: 'user-4',
      }]
    }

    const supabase = {
      from: (table: string) => {
        tables.push(table)
        return query(table)
      },
      rpc: jest.fn().mockResolvedValue({ data: 'operatore@rasi.local', error: null }),
    } as any

    const feed = await loadActivityFeed(supabase, { limit: 10, perSourceLimit: 5 })

    expect(tables).toEqual([
      'artisti',
      'opere',
      'partecipazioni',
      'cast_esterno',
      'campagne_individuazione',
      'campagne_programmazione',
    ])
    expect(feed.map(item => item.tipo)).toEqual([
      'campagna_programmazione',
      'cast_esterno',
      'partecipazione',
      'campagna_individuazione',
      'opera',
      'artista',
    ])
    expect(feed[1]).toMatchObject({
      dettaglio: 'Anna Verdi — Attore comprimario — Film X',
      href: '/dashboard/opere/o1',
      utente: null,
    })
    expect(feed[2]).toMatchObject({
      dettaglio: 'Lucia Bianchi — Film X',
      href: '/dashboard/opere/o1',
      utente: 'operatore@rasi.local',
    })
    expect(feed[5].utente).toBe('operatore@rasi.local')
  })

  it('resolves unique user emails via RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 'operatore@rasi.local', error: null })
    const supabase = { rpc } as any

    const map = await resolveActivityUserEmails(supabase, ['user-1', 'user-1', null])

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('get_user_email_by_id', { user_id: 'user-1' })
    expect(map.get('user-1')).toBe('operatore@rasi.local')
  })
})
