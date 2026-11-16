import { confermaRipristino, describeModifica } from './approvazioni-display'

describe('describeModifica', () => {
  it('mostra cosa è cambiato, chi e quando, senza i campi interni', () => {
    const vista = describeModifica({
      id: 7,
      occurred_at: '2026-11-16T10:30:00Z',
      user_email: 'base@example.invalid',
      user_ruolo: 'operatore_base',
      azione: 'UPDATE',
      tabella: 'episodi',
      record_label: 'S1E2 – Pilota',
      campi_modificati: ['titolo_episodio', 'opera_id'],
      old_data: { titolo_episodio: 'Pilot', opera_id: 'x' },
      new_data: { titolo_episodio: 'Pilota', opera_id: 'y' },
      esito: null,
    })
    expect(vista.titolo).toBe('Modifica · Episodi · S1E2 – Pilota')
    expect(vista.sottotitolo).toMatch(/^base@example\.invalid \(Operatore base\) · /)
    expect(vista.diff).toEqual([{ campo: 'titolo_episodio', prima: 'Pilot', dopo: 'Pilota', kind: 'modified' }])
    expect(vista.esito).toBe('in_attesa')
  })

  it('per creazioni ed eliminazioni elenca i campi della riga e riporta l\'esito', () => {
    const vista = describeModifica({
      id: 8,
      occurred_at: '2026-11-16T10:30:00Z',
      user_email: null,
      user_ruolo: 'tirocinante',
      azione: 'DELETE',
      tabella: 'cast_esterno',
      record_label: 'Mario Rossi',
      campi_modificati: null,
      old_data: { id: 'c1', nome: 'Mario Rossi', personaggio: null, opera_id: 'o1' },
      new_data: null,
      esito: 'ripristinata',
    })
    expect(vista.diff).toEqual([{ campo: 'nome', prima: 'Mario Rossi', dopo: '—', kind: 'removed' }])
    expect(vista.esito).toBe('ripristinata')
    expect(vista.sottotitolo).toMatch(/^utente sconosciuto \(Tirocinante\)/)
  })
})

describe('confermaRipristino', () => {
  it('spiega l\'effetto del ripristino in base all\'azione', () => {
    expect(confermaRipristino('INSERT')).toMatch(/eliminata/)
    expect(confermaRipristino('DELETE')).toMatch(/reinserita/)
    expect(confermaRipristino('UPDATE')).toMatch(/valori precedenti/)
  })
})
