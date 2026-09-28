import {
  describeProgrammazioniHealthError,
  isBlankProgrammazioniHealthError,
  isProgrammazioniHealthTimeoutError,
  toProgrammazioniHealthError,
} from './health-error'

describe('programmazioni health error messages', () => {
  it('maps postgres statement timeout code to a targeted Italian message', () => {
    expect(describeProgrammazioniHealthError({ code: '57014', message: 'canceling statement due to statement timeout' }, 'conteggi'))
      .toMatch(/Timeout sui conteggi/i)
  })

  it('treats empty HEAD count errors as timeouts for count/field stages', () => {
    expect(isBlankProgrammazioniHealthError({ message: '' })).toBe(true)
    expect(isProgrammazioniHealthTimeoutError({ message: '' })).toBe(false)
    expect(describeProgrammazioniHealthError({ message: '' }, 'conteggi'))
      .toMatch(/Timeout sui conteggi/i)
    expect(describeProgrammazioniHealthError({ message: '' }, 'campi'))
      .toMatch(/Timeout sul calcolo dei campi mancanti/i)
  })

  it('does not assume timeout for blank campagna errors', () => {
    expect(describeProgrammazioniHealthError({ message: '' }, 'campagna'))
      .toBe('Impossibile caricare il profilo copertura dell’emittente.')
  })

  it('keeps useful raw messages when they are not timeouts', () => {
    expect(describeProgrammazioniHealthError({ message: 'column does not exist' }, 'campi'))
      .toBe('column does not exist')
  })

  it('wraps errors as Error with cause for the service layer', () => {
    const cause = { message: '' }
    const error = toProgrammazioniHealthError(cause, 'conteggi')
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toMatch(/Timeout sui conteggi/i)
    expect((error as Error & { cause?: unknown }).cause).toBe(cause)
  })
})
