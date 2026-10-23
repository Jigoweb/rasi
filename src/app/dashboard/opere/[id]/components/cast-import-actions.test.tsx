import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { CastImportActions } from './cast-import-actions'

describe('CastImportActions', () => {
  it('shows the Italian actions and the preview rules', async () => {
    const user = userEvent.setup()
    render(<CastImportActions operaId="op1" onImported={() => undefined} />)

    expect(screen.getByRole('button', { name: 'Scarica template cast' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Importa cast' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('nome, cognome e IPN')
    expect(screen.getByRole('dialog')).toHaveTextContent('Non vengono creati episodi né schede artista')
    expect(screen.getByRole('button', { name: 'Importa righe valide' })).toBeDisabled()
  })
})
