import {
  attachUsersToActivities,
  buildArtistaActivity,
  buildCampagnaIndividuazioneActivity,
  buildCampagnaProgrammazioneActivity,
  buildOperaActivity,
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

  it('resolves unique user emails via RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 'operatore@rasi.local', error: null })
    const supabase = { rpc } as any

    const map = await resolveActivityUserEmails(supabase, ['user-1', 'user-1', null])

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('get_user_email_by_id', { user_id: 'user-1' })
    expect(map.get('user-1')).toBe('operatore@rasi.local')
  })
})
