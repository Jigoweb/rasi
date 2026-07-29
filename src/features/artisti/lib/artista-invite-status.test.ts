import { deriveArtistaInviteStatus } from './artista-invite-status'

describe('deriveArtistaInviteStatus', () => {
  it('returns non_invitato when no linked user', () => {
    expect(deriveArtistaInviteStatus(null)).toEqual({
      status: 'non_invitato',
      label: 'Non invitato',
      user: null,
    })
  })

  it('returns in_attesa when linked user never signed in', () => {
    const user = {
      id: 'u1',
      email: 'a@example.com',
      invited_at: '2026-01-01T00:00:00Z',
      last_sign_in_at: null,
    }
    expect(deriveArtistaInviteStatus(user)).toEqual({
      status: 'in_attesa',
      label: 'Invito in attesa',
      user,
    })
  })

  it('returns attivo when linked user has signed in', () => {
    const user = {
      id: 'u1',
      email: 'a@example.com',
      invited_at: '2026-01-01T00:00:00Z',
      last_sign_in_at: '2026-01-02T00:00:00Z',
    }
    expect(deriveArtistaInviteStatus(user)).toEqual({
      status: 'attivo',
      label: 'Attivo',
      user,
    })
  })
})
