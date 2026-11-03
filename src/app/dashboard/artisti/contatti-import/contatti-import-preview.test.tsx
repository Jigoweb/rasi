import { render, screen, fireEvent } from '@testing-library/react'
import { ContattiImportPreview } from './contatti-import-preview'
import type { ContattiImportRow } from '@/features/artisti/lib/contatti-import'

const ARTIST_ID = '11111111-1111-4111-8111-111111111111'

function row(overrides: Partial<ContattiImportRow> = {}): ContattiImportRow {
  return {
    rowNumber: 2,
    values: {
      cognome: 'Rossi',
      nome: 'Mario',
      email: 'nuova@example.com',
      via: '',
      cap: '',
      citta: '',
      provincia: '',
      telefono: '',
      codice_fiscale: '',
      partita_iva: '',
      regime: '',
      tassazione: '',
      dettagli_regime: '',
    },
    status: 'da_verificare',
    matchType: null,
    artistaId: null,
    artistaLabel: null,
    motivo: 'Più artisti hanno lo stesso nome e cognome',
    included: false,
    includibile: false,
    suggerimenti: [{ id: ARTIST_ID, label: 'Rossi Mario' }],
    fields: [
      {
        key: 'email',
        label: 'Email',
        incoming: 'nuova@example.com',
        current: 'vecchia@example.com',
        stato: 'conflitto',
        decision: 'tieni',
      },
    ],
    ...overrides,
  }
}

describe('ContattiImportPreview', () => {
  it('shows the review state in Italian and lets the operator pick an artist or keep a conflict', () => {
    const onArtistaChange = jest.fn()
    const onDecisionChange = jest.fn()
    render(
      <ContattiImportPreview
        rows={[row()]}
        artisti={[{ id: ARTIST_ID, nome: 'Mario', cognome: 'Rossi', codice_fiscale: null }]}
        onIncludedChange={jest.fn()}
        onValueChange={jest.fn()}
        onArtistaChange={onArtistaChange}
        onDecisionChange={onDecisionChange}
      />,
    )

    expect(screen.getByText('Da verificare')).toBeInTheDocument()
    expect(screen.getByText('Più artisti hanno lo stesso nome e cognome')).toBeInTheDocument()
    expect(screen.getByText('vecchia@example.com')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Rossi Mario' }))
    expect(onArtistaChange).toHaveBeenCalledWith(2, ARTIST_ID)

    fireEvent.change(screen.getByLabelText('Cerca artista riga 2'), { target: { value: 'rossi' } })
    const matches = screen.getAllByRole('button', { name: /Rossi Mario/ })
    fireEvent.click(matches[matches.length - 1])
    expect(onArtistaChange).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: 'Sostituisci Email riga 2' }))
    expect(onDecisionChange).toHaveBeenCalledWith(2, 'email', 'sostituisci')
  })
})
