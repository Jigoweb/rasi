import { personaKey } from './cast-esterno.service'

jest.mock('@/shared/lib/supabase-client', () => ({ supabase: {} }))

describe('personaKey (doppioni del cast esterno)', () => {
  it('ignora ordine dei nomi, accenti, maiuscole e punteggiatura', () => {
    expect(personaKey('Mario Rossi')).toBe(personaKey('ROSSI, Mario'))
    expect(personaKey('Nicolò  Bellè')).toBe(personaKey('belle nicolo'))
    expect(personaKey('Mario Rossi')).not.toBe(personaKey('Maria Rossi'))
    expect(personaKey('  ')).toBe('')
  })
})
