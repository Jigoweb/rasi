import {
  getIndividuazioneProgressDisplay,
} from './individuazione-progress-display'

describe('getIndividuazioneProgressDisplay', () => {
  it('calcola percentuale e frazioni quando il totale è noto', () => {
    const display = getIndividuazioneProgressDisplay({
      programmazioni_totali: 1000,
      programmazioni_processate: 250,
      current_chunk: 5,
      total_chunks: 20,
    })

    expect(display.isIndeterminate).toBe(false)
    expect(display.percentage).toBe(25)
    expect(display.progressLabel).toBe('250/1.000')
    expect(display.remainingLabel).toBe('750 rimanenti')
    expect(display.chunksLabel).toBe('5/20')
  })

  it('evita N/0 e % a 0 quando totali è 0 ma ci sono processate (bug resume)', () => {
    const display = getIndividuazioneProgressDisplay({
      programmazioni_totali: 0,
      programmazioni_processate: 6473,
      current_chunk: 130,
      total_chunks: 0,
      phase: 'finalizing',
    })

    expect(display.isIndeterminate).toBe(true)
    expect(display.percentage).toBeNull()
    expect(display.progressLabel).toBe('6.473 processate')
    expect(display.remainingLabel).toBeNull()
    expect(display.chunksLabel).toBe('130')
  })

  it('mostra In avvio quando non ci sono ancora processate né totale', () => {
    const display = getIndividuazioneProgressDisplay({
      programmazioni_totali: 0,
      programmazioni_processate: 0,
      current_chunk: 0,
      total_chunks: 0,
      phase: 'init',
    })

    expect(display.isIndeterminate).toBe(true)
    expect(display.percentage).toBeNull()
    expect(display.progressLabel).toBe('In avvio…')
    expect(display.chunksLabel).toBe('—')
  })

  it('non mostra rimanenti negativi se processate > totali', () => {
    const display = getIndividuazioneProgressDisplay({
      programmazioni_totali: 100,
      programmazioni_processate: 150,
      current_chunk: 3,
      total_chunks: 2,
    })

    expect(display.percentage).toBe(100)
    expect(display.remainingLabel).toBe('0 rimanenti')
  })
})
