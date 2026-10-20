import { findUserByArtistaId } from './find-by-artista'

describe('findUserByArtistaId', () => {
  const users = [
    {
      id: 'u-admin',
      email: 'admin@example.com',
      invited_at: null,
      last_sign_in_at: '2026-01-01T00:00:00Z',
      app_metadata: { ruolo: 'admin' },
      user_metadata: { ruolo: 'operatore' },
    },
    {
      id: 'u-art',
      email: 'art@example.com',
      invited_at: '2026-01-02T00:00:00Z',
      last_sign_in_at: null,
      app_metadata: {
        ruolo: 'artista',
        artista_id: '11111111-1111-4111-8111-111111111111',
      },
      user_metadata: { ruolo: 'operatore', artista_id: '22222222-2222-4222-8222-222222222222' },
    },
  ]

  it('returns null when no user linked to artista_id', () => {
    expect(findUserByArtistaId(users, '33333333-3333-4333-8333-333333333333')).toBeNull()
  })

  it('ignores artista_id written only in user_metadata', () => {
    expect(
      findUserByArtistaId(users, '22222222-2222-4222-8222-222222222222')
    ).toBeNull()
  })

  it('returns linked user summary when app_metadata.artista_id matches', () => {
    expect(findUserByArtistaId(users, '11111111-1111-4111-8111-111111111111')).toEqual({
      id: 'u-art',
      email: 'art@example.com',
      ruolo: 'artista',
      invited_at: '2026-01-02T00:00:00Z',
      last_sign_in_at: null,
    })
  })

  it('does not escalate when user_metadata.ruolo is operatore', () => {
    expect(findUserByArtistaId(users, '11111111-1111-4111-8111-111111111111')?.ruolo).toBe('artista')
  })
})
