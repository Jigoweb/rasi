import { render, screen } from '@testing-library/react'
import DeleteIndividuazioneDialog from './DeleteIndividuazioneDialog'

describe('DeleteIndividuazioneDialog', () => {
  it('renders delete info when open', () => {
    render(
      <DeleteIndividuazioneDialog
        open
        campagna={{ nome: 'Individuazione Rai' } as any}
        deleteInfo={{
          individuazioni_count: 12,
          campagne_programmazione_nome: 'Programmazione Rai',
        } as any}
        isLoading={false}
        isDeleting={false}
        deleteProgress={null}
        onOpenChange={jest.fn()}
        onConfirm={jest.fn()}
      />
    )

    expect(screen.getByText('Elimina Campagna Individuazione')).toBeInTheDocument()
    expect(screen.getByText(/12/)).toBeInTheDocument()
  })
})
