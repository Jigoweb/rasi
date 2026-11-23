import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { NuovaRipartizioneDialog } from './nuova-ripartizione-dialog'
import { listaIndividuazioniDisponibili, salvaCampagnaRipartizione } from '../services/ripartizioni.service'

jest.mock('../services/ripartizioni.service', () => ({
  listaEmittenti: jest.fn(async () => []),
  listaIndividuazioniDisponibili: jest.fn(async () => [
    { id: 'ci-1', nome: 'Individuazione A', anno: 2024, campagnaProgrammazione: null, individuazioni: 1200, inclusaIn: null },
    { id: 'ci-2', nome: 'Individuazione B', anno: 2024, campagnaProgrammazione: null, individuazioni: 30, inclusaIn: { id: 'altra', nome: 'Netflix 2024 bis' } },
  ]),
  salvaCampagnaRipartizione: jest.fn(async () => 'cr-9'),
}))

describe('NuovaRipartizioneDialog', () => {
  it('in modifica propone le sorgenti, blocca quelle già usate altrove e salva', async () => {
    const onSaved = jest.fn()
    const user = userEvent.setup()
    render(
      <NuovaRipartizioneDialog
        open
        onOpenChange={jest.fn()}
        onSaved={onSaved}
        campagna={{
          id: 'cr-9',
          nome: 'Netflix 2024',
          emittenteId: 'em-1',
          anno: 2024,
          fondo: 35000,
          modalita: null,
          sorgenti: ['ci-1'],
          descrizione: null,
        }}
      />,
    )
    const lista = await screen.findByRole('list', { name: 'Campagne di individuazione' })
    expect(listaIndividuazioniDisponibili).toHaveBeenCalledWith('em-1', 2024)
    expect(within(lista).getByRole('checkbox', { name: 'Individuazione A' })).toBeChecked()
    expect(within(lista).getByRole('checkbox', { name: 'Individuazione B' })).toBeDisabled()
    expect(within(lista).getByText(/Già inclusa in «Netflix 2024 bis»/)).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Fondo da ripartire (€)'))
    await user.type(screen.getByLabelText('Fondo da ripartire (€)'), '20.000,50')
    await user.click(screen.getByRole('button', { name: 'Salva modifiche' }))
    await waitFor(() =>
      expect(salvaCampagnaRipartizione).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cr-9', fondo: 20000.5, sorgenti: ['ci-1'], modalita: null, anno: 2024 }),
      ),
    )
    expect(onSaved).toHaveBeenCalledWith('cr-9')
  })
})
