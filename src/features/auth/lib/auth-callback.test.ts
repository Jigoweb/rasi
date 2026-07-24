import { getAuthCallbackDestination } from './auth-callback'

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
