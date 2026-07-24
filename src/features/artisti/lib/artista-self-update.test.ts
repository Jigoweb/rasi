import {
  validateArtistaSelfUpdate,
  buildArtistaSelfUpdatePayload,
  type ArtistaSelfUpdateForm,
} from './artista-self-update'

const baseForm = (): ArtistaSelfUpdateForm => ({
  nome: 'Mario',
  cognome: 'Rossi',
  nome_arte: 'MR',
  codice_fiscale: 'RSSMRA80A01H501U',
  data_nascita: '1980-01-01',
  luogo_nascita: 'Roma',
  tipologia: 'AIE',
  email: 'mario@example.com',
  telefono: '3331234567',
  via: 'Via Roma',
  civico: '1',
  cap: '00100',
  citta: 'Roma',
  provincia: 'RM',
})

describe('validateArtistaSelfUpdate', () => {
  it('accepts a valid form', () => {
    expect(validateArtistaSelfUpdate(baseForm())).toEqual({ ok: true })
  })

  it('requires nome and cognome', () => {
    expect(validateArtistaSelfUpdate({ ...baseForm(), nome: '' }).ok).toBe(false)
    expect(validateArtistaSelfUpdate({ ...baseForm(), cognome: '  ' }).ok).toBe(false)
  })

  it('rejects invalid email when present', () => {
    const result = validateArtistaSelfUpdate({ ...baseForm(), email: 'not-an-email' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/email/i)
  })

  it('allows empty email', () => {
    expect(validateArtistaSelfUpdate({ ...baseForm(), email: '' })).toEqual({ ok: true })
  })

  it('rejects invalid codice fiscale when present', () => {
    const result = validateArtistaSelfUpdate({ ...baseForm(), codice_fiscale: 'ABC' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/fiscale/i)
  })

  it('allows empty codice fiscale', () => {
    expect(validateArtistaSelfUpdate({ ...baseForm(), codice_fiscale: '' })).toEqual({
      ok: true,
    })
  })
})

describe('buildArtistaSelfUpdatePayload', () => {
  it('includes only whitelist fields', () => {
    const payload = buildArtistaSelfUpdatePayload(baseForm())
    expect(Object.keys(payload).sort()).toEqual(
      [
        'codice_fiscale',
        'cognome',
        'contatti',
        'data_nascita',
        'indirizzo',
        'luogo_nascita',
        'nome',
        'nome_arte',
        'tipologia',
      ].sort()
    )
    expect(payload).not.toHaveProperty('stato')
    expect(payload).not.toHaveProperty('codice_ipn')
    expect(payload).not.toHaveProperty('ragione_sociale')
  })

  it('strips forbidden keys even if passed on form bag', () => {
    const dirty = {
      ...baseForm(),
      stato: 'attivo',
      codice_ipn: 'IPN',
    } as ArtistaSelfUpdateForm & { stato: string; codice_ipn: string }
    const payload = buildArtistaSelfUpdatePayload(dirty)
    expect(payload).not.toHaveProperty('stato')
    expect(payload).not.toHaveProperty('codice_ipn')
  })

  it('merges contatti and indirizzo with existing JSON', () => {
    const payload = buildArtistaSelfUpdatePayload(baseForm(), {
      contatti: { email: 'old@example.com', pec: 'keep@pec.it' },
      indirizzo: { via: 'Old', nazione: 'IT' },
    })
    expect(payload.contatti).toEqual({
      email: 'mario@example.com',
      telefono: '3331234567',
      pec: 'keep@pec.it',
    })
    expect(payload.indirizzo).toEqual({
      via: 'Via Roma',
      civico: '1',
      cap: '00100',
      citta: 'Roma',
      provincia: 'RM',
      nazione: 'IT',
    })
  })

  it('normalizes CF to uppercase and empty strings to null for optional scalars', () => {
    const payload = buildArtistaSelfUpdatePayload({
      ...baseForm(),
      codice_fiscale: 'rssmra80a01h501u',
      nome_arte: '',
      data_nascita: '',
      luogo_nascita: '',
      tipologia: '',
    })
    expect(payload.codice_fiscale).toBe('RSSMRA80A01H501U')
    expect(payload.nome_arte).toBeNull()
    expect(payload.data_nascita).toBeNull()
    expect(payload.luogo_nascita).toBeNull()
    expect(payload.tipologia).toBeNull()
  })
})
