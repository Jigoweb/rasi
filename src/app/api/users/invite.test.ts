import { validateUserInvite } from './invite'

describe('validateUserInvite', () => {
  it('defaults omitted ruolo to artista and requires artista_id', () => {
    const result = validateUserInvite({
      actorIsAdmin: true,
      email: 'artista@example.com',
      ruolo: undefined,
      artista_id: 'art-1',
    })
    expect(result).toEqual({
      ok: true,
      email: 'artista@example.com',
      ruolo: 'artista',
      artistaId: 'art-1',
    })
  })

  it('allows admin to invite another admin with email only', () => {
    const result = validateUserInvite({
      actorIsAdmin: true,
      email: 'admin@example.com',
      ruolo: 'admin',
    })
    expect(result).toEqual({
      ok: true,
      email: 'admin@example.com',
      ruolo: 'admin',
      artistaId: null,
    })
  })

  it('allows admin to invite an operatore with email only', () => {
    const result = validateUserInvite({
      actorIsAdmin: true,
      email: 'op@example.com',
      ruolo: 'operatore',
    })
    expect(result).toEqual({
      ok: true,
      email: 'op@example.com',
      ruolo: 'operatore',
      artistaId: null,
    })
  })

  it('allows operatore to invite another operatore', () => {
    const result = validateUserInvite({
      actorIsAdmin: false,
      email: 'op2@example.com',
      ruolo: 'operatore',
    })
    expect(result).toEqual({
      ok: true,
      email: 'op2@example.com',
      ruolo: 'operatore',
      artistaId: null,
    })
  })

  it('allows operatore to invite an artista with artista_id', () => {
    const result = validateUserInvite({
      actorIsAdmin: false,
      email: 'artista@example.com',
      ruolo: 'artista',
      artista_id: 'art-9',
    })
    expect(result).toEqual({
      ok: true,
      email: 'artista@example.com',
      ruolo: 'artista',
      artistaId: 'art-9',
    })
  })

  it('blocks operatore from inviting an admin', () => {
    const result = validateUserInvite({
      actorIsAdmin: false,
      email: 'admin@example.com',
      ruolo: 'admin',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(403)
      expect(result.error).toMatch(/admin/i)
    }
  })

  it('rejects artista invite without artista_id', () => {
    const result = validateUserInvite({
      actorIsAdmin: true,
      email: 'artista@example.com',
      ruolo: 'artista',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(400)
      expect(result.error).toMatch(/artista_id/)
    }
  })

  it('rejects missing email', () => {
    const result = validateUserInvite({
      actorIsAdmin: true,
      email: '',
      ruolo: 'operatore',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(400)
    }
  })

  it('rejects invalid ruolo', () => {
    const result = validateUserInvite({
      actorIsAdmin: true,
      email: 'user@example.com',
      ruolo: 'superuser',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(400)
    }
  })

  it('rejects collecting as invitable role', () => {
    const result = validateUserInvite({
      actorIsAdmin: true,
      email: 'col@example.com',
      ruolo: 'collecting',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(403)
    }
  })

  it('trims email', () => {
    const result = validateUserInvite({
      actorIsAdmin: true,
      email: '  op@example.com  ',
      ruolo: 'operatore',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.email).toBe('op@example.com')
    }
  })
})
