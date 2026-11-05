const mockCreateClient = jest.fn((_url: string, _key: string, _options?: unknown) => ({
  from: jest.fn(),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: (url: string, key: string, options?: unknown) =>
    mockCreateClient(url, key, options),
}))

type ServerModule = {
  supabaseServer: { from?: unknown }
}

async function loadFresh(): Promise<ServerModule> {
  let loaded: ServerModule | undefined
  await jest.isolateModulesAsync(async () => {
    loaded = (await import('./supabase-server')) as ServerModule
  })
  if (!loaded) {
    throw new Error('supabase-server non caricato')
  }
  return loaded
}

describe('supabaseServer', () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const previousAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const previousService = process.env.SUPABASE_SERVICE_ROLE_KEY

  beforeEach(() => {
    mockCreateClient.mockClear()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NEXT_PHASE
  })

  const previousPhase = process.env.NEXT_PHASE

  afterAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnon
    if (previousService === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousService
    }
    if (previousPhase === undefined) {
      delete process.env.NEXT_PHASE
    } else {
      process.env.NEXT_PHASE = previousPhase
    }
  })

  it('rifiuta la chiave anon quando manca la service role', async () => {
    const { supabaseServer } = await loadFresh()

    expect(() => {
      void supabaseServer.from
    }).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('tratta una service role vuota come assente', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '   '
    const { supabaseServer } = await loadFresh()

    expect(() => {
      void supabaseServer.from
    }).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('segnala l’URL mancante prima della chiave', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    const { supabaseServer } = await loadFresh()

    expect(() => {
      void supabaseServer.from
    }).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('durante next build, senza service role, usa la chiave anon', async () => {
    process.env.NEXT_PHASE = 'phase-production-build'
    const { supabaseServer } = await loadFresh()

    expect(supabaseServer.from).toEqual(expect.any(Function))
    expect(mockCreateClient).toHaveBeenCalledWith(
      'http://localhost:54321',
      'test-anon-key',
      expect.any(Object)
    )
  })

  it('crea il client con la service role e ignora la chiave anon', async () => {
    process.env.NEXT_PHASE = 'phase-production-build'
    process.env.SUPABASE_SERVICE_ROLE_KEY = ' test-service-role-key '
    const { supabaseServer } = await loadFresh()

    expect(supabaseServer.from).toEqual(expect.any(Function))
    expect(mockCreateClient).toHaveBeenCalledTimes(1)
    expect(mockCreateClient).toHaveBeenCalledWith(
      'http://localhost:54321',
      'test-service-role-key',
      expect.objectContaining({
        auth: { autoRefreshToken: false, persistSession: false },
      })
    )
  })
})
