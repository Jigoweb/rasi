import {
  buildAuthInviteRedirectUrl,
  isAlreadyRegisteredInviteError,
  mergeArtistAccessMetadata,
  resolveAuthInviteOrigin,
  resolveResendAccessMethod,
  sendResendAccessEmail,
} from './resend-access'

describe('resolveResendAccessMethod', () => {
  it('uses invite for a never-confirmed pending invite', () => {
    expect(
      resolveResendAccessMethod({
        email_confirmed_at: null,
        last_sign_in_at: null,
      })
    ).toBe('invite')
  })

  it('uses recovery when the email is already registered (confirmed)', () => {
    expect(
      resolveResendAccessMethod({
        email_confirmed_at: '2026-01-01T00:00:00Z',
        last_sign_in_at: null,
      })
    ).toBe('recovery')
  })

  it('uses recovery when the user has already signed in', () => {
    expect(
      resolveResendAccessMethod({
        email_confirmed_at: '2026-01-01T00:00:00Z',
        last_sign_in_at: '2026-01-02T00:00:00Z',
      })
    ).toBe('recovery')
  })
})

describe('buildAuthInviteRedirectUrl', () => {
  it('points to the invite callback used by imposta-password', () => {
    expect(buildAuthInviteRedirectUrl('https://rasi.example')).toBe(
      'https://rasi.example/auth/callback?invite=true'
    )
  })

  it('strips a trailing slash from the origin', () => {
    expect(buildAuthInviteRedirectUrl('https://rasi.example/')).toBe(
      'https://rasi.example/auth/callback?invite=true'
    )
  })
})

describe('resolveAuthInviteOrigin', () => {
  it('prefers NEXT_PUBLIC_SITE_URL over the request origin', () => {
    expect(
      resolveAuthInviteOrigin('https://app.rasi.it', 'http://localhost:3000')
    ).toBe('https://app.rasi.it')
  })

  it('falls back to localhost when neither origin is set', () => {
    expect(resolveAuthInviteOrigin(undefined, null)).toBe('http://localhost:3000')
  })
})

describe('mergeArtistAccessMetadata', () => {
  it('preserves ruolo artista and artista_id', () => {
    expect(
      mergeArtistAccessMetadata({
        ruolo: 'artista',
        artista_id: '991c5dd5-8f08-4985-a973-6081ff68242a',
        extra: 'keep',
      })
    ).toEqual({
      ruolo: 'artista',
      artista_id: '991c5dd5-8f08-4985-a973-6081ff68242a',
      extra: 'keep',
    })
  })

  it('defaults ruolo to artista when missing', () => {
    expect(mergeArtistAccessMetadata({ artista_id: 'art-1' })).toEqual({
      artista_id: 'art-1',
      ruolo: 'artista',
    })
  })
})

describe('sendResendAccessEmail', () => {
  const pendingUser = {
    id: 'pending-user',
    email: 'pending-artist@example.com',
    email_confirmed_at: null,
    last_sign_in_at: null,
    user_metadata: { ruolo: 'artista', artista_id: 'art-pending' },
  }

  const registeredQaUser = {
    id: '95afd848-815b-4f63-8fe3-6c3ff0dda7d5',
    email: 'artist-registered@example.com',
    email_confirmed_at: '2026-03-01T00:00:00Z',
    last_sign_in_at: null,
    user_metadata: {
      ruolo: 'artista',
      artista_id: '991c5dd5-8f08-4985-a973-6081ff68242a',
    },
  }

  function mockAuth(overrides?: Partial<{
    inviteError: { message: string } | null
    recoveryError: { message: string } | null
    updateError: { message: string } | null
  }>) {
    const inviteUserByEmail = jest.fn().mockResolvedValue({
      error: overrides?.inviteError ?? null,
    })
    const resetPasswordForEmail = jest.fn().mockResolvedValue({
      error: overrides?.recoveryError ?? null,
    })
    const updateUserMetadata = jest.fn().mockResolvedValue({
      error: overrides?.updateError ?? null,
    })
    return { inviteUserByEmail, resetPasswordForEmail, updateUserMetadata }
  }

  it('resends a first-time invite without calling recovery', async () => {
    const auth = mockAuth()
    const result = await sendResendAccessEmail(
      pendingUser,
      'https://rasi.example',
      auth
    )

    expect(result).toEqual({ ok: true, method: 'invite' })
    expect(auth.inviteUserByEmail).toHaveBeenCalledWith(
      'pending-artist@example.com',
      {
        data: { ruolo: 'artista', artista_id: 'art-pending' },
        redirectTo: 'https://rasi.example/auth/callback?invite=true',
      }
    )
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('does not invite again when the email is already registered', async () => {
    const auth = mockAuth()
    const result = await sendResendAccessEmail(
      registeredQaUser,
      'https://rasi.example',
      auth
    )

    expect(result).toEqual({ ok: true, method: 'recovery' })
    expect(auth.inviteUserByEmail).not.toHaveBeenCalled()
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'artist-registered@example.com',
      { redirectTo: 'https://rasi.example/auth/callback?invite=true' }
    )
    expect(auth.updateUserMetadata).toHaveBeenCalledWith(
      registeredQaUser.id,
      registeredQaUser.user_metadata
    )
  })

  it('falls back to recovery if invite rejects an already registered email', async () => {
    const auth = mockAuth()
    auth.inviteUserByEmail.mockResolvedValue({
      error: { message: 'A user with this email address has already been registered.' },
    })

    const result = await sendResendAccessEmail(
      {
        ...registeredQaUser,
        email_confirmed_at: null,
        last_sign_in_at: null,
      },
      'https://rasi.example',
      auth
    )

    expect(result).toEqual({ ok: true, method: 'recovery' })
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'artist-registered@example.com',
      { redirectTo: 'https://rasi.example/auth/callback?invite=true' }
    )
  })

  it('recognizes the production invite rejection message', () => {
    expect(
      isAlreadyRegisteredInviteError(
        'A user with this email address has already been registered.'
      )
    ).toBe(true)
  })

  it('rejects users without email', async () => {
    const auth = mockAuth()
    const result = await sendResendAccessEmail(
      { ...pendingUser, email: null },
      'https://rasi.example',
      auth
    )
    expect(result).toEqual({ ok: false, status: 400, error: 'Utente senza email' })
    expect(auth.inviteUserByEmail).not.toHaveBeenCalled()
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('propagates invite errors that are not already-registered', async () => {
    const auth = mockAuth({ inviteError: { message: 'rate limited' } })
    const result = await sendResendAccessEmail(
      pendingUser,
      'https://rasi.example',
      auth
    )
    expect(result).toEqual({ ok: false, status: 500, error: 'rate limited' })
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('propagates recovery errors', async () => {
    const auth = mockAuth({ recoveryError: { message: 'smtp down' } })
    const result = await sendResendAccessEmail(
      registeredQaUser,
      'https://rasi.example',
      auth
    )
    expect(result).toEqual({ ok: false, status: 500, error: 'smtp down' })
  })
})
