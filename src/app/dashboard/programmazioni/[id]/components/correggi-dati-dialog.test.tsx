import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { CorreggiDatiDialog } from './correggi-dati-dialog'
import {
  removeUploadedProgrammazioniFile,
  riprocessaCampiDaFile,
  uploadProgrammazioniFileToStorage,
} from '@/features/programmazioni/services/programmazioni-upload-worker.service'

jest.mock('@/features/programmazioni/services/programmazioni-upload-worker.service', () => ({
  uploadProgrammazioniFileToStorage: jest.fn(async () => ({ storagePath: 'u/c/f.xlsx', error: null })),
  riprocessaCampiDaFile: jest.fn(),
  removeUploadedProgrammazioniFile: jest.fn(async () => undefined),
}))

const esito = (applicato: boolean) => ({
  applicato,
  righe_file: 9512,
  righe_inviate: 9512,
  ritrovate: 9512,
  aggiornate: applicato ? 9512 : 0,
  individuazioni_riallineate: applicato ? 598 : 0,
  lettura: 'precedente' as const,
  cambi: { data_trasmissione: 0, ora_inizio: 9512, ora_fine: 0, titoli: 3 },
  esempi: [{ titolo_attuale: 'Gomorra', ora_attuale: null, ora_nuova: '21:00:00' }],
  valori_non_riconosciuti: {},
})

function renderDialog(onApplied = jest.fn()) {
  render(
    <CorreggiDatiDialog
      open
      onOpenChange={jest.fn()}
      campagnaId="cp-1"
      campagnaNome="SKY INVESTIGATION 2024"
      onApplied={onApplied}
    />,
  )
  return { onApplied }
}

beforeEach(() => jest.clearAllMocks())

describe('CorreggiDatiDialog', () => {
  it('mostra l\'anteprima senza scrivere e poi applica la correzione', async () => {
    ;(riprocessaCampiDaFile as jest.Mock)
      .mockResolvedValueOnce({ data: esito(false), error: null })
      .mockResolvedValueOnce({ data: esito(true), error: null })
    const user = userEvent.setup()
    const { onApplied } = renderDialog()

    await user.upload(screen.getByLabelText('File della campagna'), new File(['x'], 'SKY_INVESTIGATION_2024.xlsx'))
    await user.click(screen.getByRole('button', { name: 'Mostra anteprima' }))

    // Il separatore delle migliaia dipende dall'ICU dell'ambiente di test.
    expect(await screen.findByText(/Orari di inizio: 9\.?512/)).toBeInTheDocument()
    expect(screen.getByText('Gomorra')).toBeInTheDocument()
    expect(riprocessaCampiDaFile).toHaveBeenLastCalledWith(expect.objectContaining({ applica: false, storagePath: 'u/c/f.xlsx' }))

    await user.click(screen.getByRole('button', { name: 'Applica correzione' }))
    expect(await screen.findByText(/598 individuazioni riallineate/)).toBeInTheDocument()
    expect(riprocessaCampiDaFile).toHaveBeenLastCalledWith(expect.objectContaining({ applica: true }))
    expect(onApplied).toHaveBeenCalled()
    expect(uploadProgrammazioniFileToStorage).toHaveBeenCalledTimes(1)
  })

  it('avvisa se il file non è identico e rimuove il file se si annulla dopo l\'anteprima', async () => {
    ;(riprocessaCampiDaFile as jest.Mock).mockResolvedValueOnce({
      data: { ...esito(false), ritrovate: 100 },
      error: null,
    })
    const user = userEvent.setup()
    renderDialog()

    await user.upload(screen.getByLabelText('File della campagna'), new File(['x'], 'altro.xlsx'))
    await user.click(screen.getByRole('button', { name: 'Mostra anteprima' }))
    expect(await screen.findByText(/Non tutte le righe sono state ritrovate/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    await waitFor(() => expect(removeUploadedProgrammazioniFile).toHaveBeenCalledWith('u/c/f.xlsx'))
  })

  it('mostra l\'errore del worker e toglie il file caricato', async () => {
    ;(riprocessaCampiDaFile as jest.Mock).mockResolvedValueOnce({ data: null, error: 'Nessun caricamento completato per questa campagna' })
    const user = userEvent.setup()
    renderDialog()

    await user.upload(screen.getByLabelText('File della campagna'), new File(['x'], 'f.xlsx'))
    await user.click(screen.getByRole('button', { name: 'Mostra anteprima' }))
    expect(await screen.findByText('Nessun caricamento completato per questa campagna')).toBeInTheDocument()
    expect(removeUploadedProgrammazioniFile).toHaveBeenCalledWith('u/c/f.xlsx')
  })
})
