import { completeAuthCallback, getAuthCallbackDestination, parseImplicitAuthHash } from './auth-callback'

describe('getAuthCallbackDestination', () => {
  const origin = 'https://rasi.example'

  it('sends successful invite to imposta-password', () => {
    expect(
      getAuthCallbackDestination({ origin, invite: true, success: true })
    ).toBe('https://rasi.example/auth/imposta-password')
  })

  it('sends successful non-invite to dashboard', () => {
    expect(
      getAuthCallbackDestination({ origin, invite: false, success: true })
    ).toBe('https://rasi.example/dashboard')
  })

  it('sends failed invite to link-errore with tipo=invito', () => {
    expect(
      getAuthCallbackDestination({ origin, invite: true, success: false })
    ).toBe('https://rasi.example/auth/link-errore?tipo=invito')
  })

  it('sends failed non-invite to link-errore with tipo=auth', () => {
    expect(
      getAuthCallbackDestination({ origin, invite: false, success: false })
    ).toBe('https://rasi.example/auth/link-errore?tipo=auth')
  })

  it('strips trailing slash from origin', () => {
    expect(
      getAuthCallbackDestination({
        origin: 'https://rasi.example/',
        invite: false,
        success: true,
      })
    ).toBe('https://rasi.example/dashboard')
  })
})

describe('parseImplicitAuthHash', () => {
  it('reads recovery tokens from a GoTrue verify redirect', () => {
    expect(
      parseImplicitAuthHash(
        '#access_token=tok&expires_in=3600&refresh_token=ref&token_type=bearer&type=recovery'
      )
    ).toEqual({
      access_token: 'tok',
      refresh_token: 'ref',
      type: 'recovery',
    })
  })

  it('returns null when tokens are missing', () => {
    expect(parseImplicitAuthHash('#type=recovery')).toBeNull()
    expect(parseImplicitAuthHash('')).toBeNull()
  })
})

describe('completeAuthCallback', () => {
  const origin = 'https://rasi.example'

  it('exchanges a PKCE code and sends invite users to imposta-password', async () => {
    const exchangeCode = jest.fn().mockResolvedValue({ error: null })
    const setSession = jest.fn()
    await expect(
      completeAuthCallback({
        origin,
        invite: true,
        code: 'pkce-code',
        hash: '',
        exchangeCode,
        setSession,
      })
    ).resolves.toBe('https://rasi.example/auth/imposta-password')
    expect(exchangeCode).toHaveBeenCalledWith('pkce-code')
    expect(setSession).not.toHaveBeenCalled()
  })

  it('sets a session from implicit hash tokens used by recovery emails', async () => {
    const exchangeCode = jest.fn()
    const setSession = jest.fn().mockResolvedValue({ error: null })
    await expect(
      completeAuthCallback({
        origin,
        invite: true,
        code: null,
        hash: '#access_token=tok&refresh_token=ref&type=recovery',
        exchangeCode,
        setSession,
      })
    ).resolves.toBe('https://rasi.example/auth/imposta-password')
    expect(exchangeCode).not.toHaveBeenCalled()
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'tok',
      refresh_token: 'ref',
    })
  })

  it('fails invite callback when neither code nor hash tokens are present', async () => {
    await expect(
      completeAuthCallback({
        origin,
        invite: true,
        code: null,
        hash: '',
        exchangeCode: jest.fn(),
        setSession: jest.fn(),
      })
    ).resolves.toBe('https://rasi.example/auth/link-errore?tipo=invito')
  })
})
