import { findUserByArtistaId } from './find-by-artista'

describe('findUserByArtistaId', () => {
  const users = [
    {
      id: 'u-admin',
      email: 'admin@example.com',
      invited_at: null,
      last_sign_in_at: '2026-01-01T00:00:00Z',
      user_metadata: { ruolo: 'admin' },
    },
    {
      id: 'u-art',
      email: 'art@example.com',
      invited_at: '2026-01-02T00:00:00Z',
      last_sign_in_at: null,
      user_metadata: { ruolo: 'artista', artista_id: 'art-1' },
    },
  ]

  it('returns null when no user linked to artista_id', () => {
    expect(findUserByArtistaId(users, 'missing')).toBeNull()
  })

  it('returns linked user summary when artista_id matches', () => {
    expect(findUserByArtistaId(users, 'art-1')).toEqual({
      id: 'u-art',
      email: 'art@example.com',
      ruolo: 'artista',
      invited_at: '2026-01-02T00:00:00Z',
      last_sign_in_at: null,
    })
  })
})
