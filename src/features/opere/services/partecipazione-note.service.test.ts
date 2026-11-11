import { supabase } from '@/shared/lib/supabase-client'
import {
  createPartecipazione,
  createPartecipazioniMultiple,
  getPartecipazioniByOperaId,
  savePartecipazioneNote,
  updatePartecipazione,
} from './opere.service'

type Call = { table: string; op: string; payload?: unknown }
type Result = { data: unknown; error: { code?: string; message: string } | null }

const calls: Call[] = []
const results: Result[] = []

function take(): Result {
  return results.shift() ?? { data: null, error: null }
}

function builder(table: string) {
  const api: Record<string, unknown> = {}
  const chain = () => api
  api.select = jest.fn((payload?: unknown) => {
    calls.push({ table, op: 'select', payload })
    return api
  })
  api.insert = jest.fn((payload?: unknown) => {
    calls.push({ table, op: 'insert', payload })
    return api
  })
  api.update = jest.fn((payload?: unknown) => {
    calls.push({ table, op: 'update', payload })
    return api
  })
  api.upsert = jest.fn((payload?: unknown) => {
    calls.push({ table, op: 'upsert', payload })
    return api
  })
  api.delete = jest.fn(() => {
    calls.push({ table, op: 'delete' })
    return api
  })
  api.eq = jest.fn(chain)
  api.order = jest.fn(() => Promise.resolve(take()))
  api.single = jest.fn(() => Promise.resolve(take()))
  api.then = (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) => (
    Promise.resolve(take()).then(resolve, reject)
  )
  return api
}

jest.mock('@/shared/lib/supabase-client', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}))

describe('partecipazione note writes', () => {
  beforeEach(() => {
    calls.length = 0
    results.length = 0
    jest.clearAllMocks()
    ;(supabase.from as jest.Mock).mockImplementation((table: string) => builder(table))
  })

  it('loads opera cast notes through list_partecipazioni_opera', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: {
        total: 1,
        total_opera: 1,
        rows: [{ id: 'p1', personaggio: 'Ada', note: 'staff' }],
      },
      error: null,
    })

    const { data } = await getPartecipazioniByOperaId('opera-1')

    expect(supabase.rpc).toHaveBeenCalledWith(
      'list_partecipazioni_opera',
      expect.objectContaining({ p_opera_id: 'opera-1' }),
    )
    expect(data).toEqual([expect.objectContaining({ id: 'p1', personaggio: 'Ada', note: 'staff' })])
  })

  it('updates the partecipazione without the note column and upserts the note', async () => {
    results.push({ data: { id: 'p1', personaggio: 'Ada' }, error: null })
    results.push({ data: null, error: null })

    const { error } = await updatePartecipazione('p1', {
      personaggio: 'Ada',
      note: 'riservata',
    })

    expect(error).toBeNull()
    expect(calls).toEqual([
      { table: 'partecipazioni', op: 'update', payload: { personaggio: 'Ada' } },
      { table: 'partecipazioni', op: 'select', payload: '*' },
      {
        table: 'partecipazioni_note',
        op: 'upsert',
        payload: { partecipazione_id: 'p1', note: 'riservata' },
      },
    ])
  })

  it('deletes the note row when staff clears it', async () => {
    results.push({ data: { id: 'p1', personaggio: 'Ada' }, error: null })
    results.push({ data: null, error: null })

    await updatePartecipazione('p1', { personaggio: 'Ada', note: null })

    expect(calls.map((call) => `${call.table}:${call.op}`)).toEqual([
      'partecipazioni:update',
      'partecipazioni:select',
      'partecipazioni_note:delete',
    ])
    expect(calls[0]?.payload).toEqual({ personaggio: 'Ada' })
  })

  it('inserts a new partecipazione and then its note', async () => {
    results.push({ data: { id: 'p1', artista_id: 'a1' }, error: null })
    results.push({ data: null, error: null })

    const { data, error } = await createPartecipazione({
      artista_id: 'a1',
      opera_id: 'o1',
      ruolo_id: 'r1',
      note: 'da import',
    })

    expect(error).toBeNull()
    expect(calls[0]).toEqual({
      table: 'partecipazioni',
      op: 'insert',
      payload: { artista_id: 'a1', opera_id: 'o1', ruolo_id: 'r1' },
    })
    expect(calls.some((call) => call.table === 'partecipazioni_note' && call.op === 'upsert')).toBe(true)
    expect(data).toMatchObject({ id: 'p1', note: 'da import' })
  })

  it('keeps note off the batch insert used by cast creation', async () => {
    results.push({
      data: [{ id: 'p1', artista_id: 'a1', opera_id: 'o1', ruolo_id: 'r1', episodio_id: null }],
      error: null,
    })
    results.push({ data: null, error: null })

    await createPartecipazioniMultiple([{
      artista_id: 'a1',
      opera_id: 'o1',
      ruolo_id: 'r1',
      episodio_id: null,
      note: 'batch',
    }])

    expect(calls[0]?.payload).toEqual([{
      artista_id: 'a1',
      opera_id: 'o1',
      ruolo_id: 'r1',
      episodio_id: null,
    }])
    expect(calls.some((call) => (
      call.table === 'partecipazioni_note'
      && call.op === 'upsert'
      && Array.isArray(call.payload)
      && call.payload[0]?.note === 'batch'
    ))).toBe(true)
  })

  it('removes a stored note by partecipazione id', async () => {
    results.push({ data: null, error: null })
    const { error } = await savePartecipazioneNote('p1', null)
    expect(error).toBeNull()
    expect(calls).toEqual([{ table: 'partecipazioni_note', op: 'delete' }])
  })
})
