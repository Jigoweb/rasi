/** @jest-environment node */
import { NextRequest } from 'next/server'

const CP_ID = '145f50bb-58e2-42df-8f2d-01c2c3f58592'
const CI_ID = 'ca798a60-8de0-4930-8004-d3eeef9ae4fa'

type Call = { table: string; select?: string; options?: unknown }
const calls: Call[] = []
let mockProgrammazioniCount: number | null = 100000

function builder(table: string) {
  const call: Call = { table }
  calls.push(call)
  const result = () => {
    if (table === 'campagne_programmazione') {
      return { data: { programmazioni_count: mockProgrammazioniCount }, error: null }
    }
    if (table === 'campagne_individuazione') return { data: { id: CI_ID }, error: null }
    if (table === 'programmazioni') return { count: 76081, error: null }
    return { data: null, error: null }
  }
  const chain: Record<string, unknown> = {
    select: (cols: string, options?: unknown) => {
      call.select = cols
      call.options = options
      return chain
    },
    update: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => result(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
  }
  return chain
}

jest.mock('@/shared/lib/supabase-server', () => ({
  supabaseServer: {
    from: (table: string) => builder(table),
    rpc: jest.fn(async () => ({ data: { success: true }, error: null })),
  },
}))

jest.mock('../auth', () => ({
  requireCampagneIndividuazioneAuth: jest.fn(async () => ({
    authenticated: true,
    userId: 'user-1',
    userRole: 'operatore',
  })),
  requireCampagnaProgrammazioneAccess: jest.fn(async () => ({
    authorized: true,
    campagneProgrammazioneId: CP_ID,
  })),
}))

import { POST } from './route'

function request() {
  return new NextRequest('http://localhost/api/campagne-individuazione/resume', {
    method: 'POST',
    body: JSON.stringify({ campagne_programmazione_id: CP_ID, campagne_individuazione_id: CI_ID }),
  })
}

beforeEach(() => {
  calls.length = 0
  mockProgrammazioniCount = 100000
})

describe('POST /api/campagne-individuazione/resume', () => {
  it('usa il contatore della campagna e non conta le programmazioni (evita lo statement timeout)', async () => {
    const res = await POST(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual({
      campagne_individuazione_id: CI_ID,
      programmazioni_totali: 100000,
      campagne_programmazione_id: CP_ID,
    })
    expect(calls.some((c) => c.table === 'programmazioni')).toBe(false)
  })

  it('conta le programmazioni solo se il contatore manca', async () => {
    mockProgrammazioniCount = null
    const res = await POST(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.programmazioni_totali).toBe(76081)
    expect(calls.find((c) => c.table === 'programmazioni')?.options).toEqual({ count: 'exact', head: true })
  })
})
