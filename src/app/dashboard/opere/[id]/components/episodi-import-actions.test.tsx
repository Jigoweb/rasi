import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EpisodiImportActions } from './episodi-import-actions'

const useAuth = jest.fn()

jest.mock('@/shared/contexts/auth-context', () => ({
  useAuth: () => useAuth(),
}))

jest.mock('@/shared/lib/supabase-client', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'token-test' } } }),
    },
  },
}))

const preview = {
  ok: true,
  mode: 'preview',
  summary: { total: 2, valid: 1, skipped: 1, excluded: 0, imported: 0 },
  existingKeys: [{ numero_stagione: 1, numero_episodio: 1 }],
  rows: [
    {
      rowNumber: 2,
      status: 'skipped',
      message: 'Episodio già presente sull\'opera (stagione 1, episodio 1): riga ignorata, nessun aggiornamento',
      stagione: 1,
      episodio: 1,
      titolo: 'Vecchio',
      durataMinuti: 40,
      dataPrimaMessaInOnda: '2020-01-01',
    },
    {
      rowNumber: 3,
      status: 'valid',
      message: null,
      stagione: 1,
      episodio: 2,
      titolo: 'Nuovo',
      durataMinuti: null,
      dataPrimaMessaInOnda: null,
    },
  ],
  alerts: [
    {
      rowNumber: 2,
      message: 'Episodio già presente sull\'opera (stagione 1, episodio 1): riga ignorata, nessun aggiornamento',
    },
  ],
}

const confirmed = {
  ...preview,
  mode: 'confirm',
  summary: { total: 2, valid: 1, skipped: 1, excluded: 0, imported: 1 },
}

function renderActions(onImported = jest.fn()) {
  return {
    onImported,
    ...render(
      <EpisodiImportActions
        operaId="11111111-1111-4111-8111-111111111111"
        operaTitolo="Serie"
        episodi={[]}
        onImported={onImported}
      />,
    ),
  }
}

describe('EpisodiImportActions', () => {
  beforeEach(() => {
    useAuth.mockReset()
    global.fetch = jest.fn()
  })

  it('nasconde le azioni a chi non è admin o operatore', () => {
    useAuth.mockReturnValue({ isAdmin: false, isOperatore: false })
    renderActions()
    expect(screen.queryByRole('button', { name: 'Scarica template episodi' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Importa episodi' })).not.toBeInTheDocument()
  })

  it('mostra anteprima e, dopo la conferma, il riepilogo senza aggiornare gli esistenti', async () => {
    useAuth.mockReturnValue({ isAdmin: false, isOperatore: true })
    const user = userEvent.setup()
    const { onImported } = renderActions()
    ;(global.fetch as jest.Mock).mockImplementation(async (_url: string, init: RequestInit) => {
      const confirming = typeof init.body === 'string'
      return {
        ok: true,
        json: async () => (confirming ? confirmed : preview),
      }
    })

    expect(screen.getByRole('button', { name: 'Scarica template episodi' })).toBeInTheDocument()
    const file = new File(['stagione'], 'episodi.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText('File episodi'), file)

    expect(await screen.findByText('Anteprima importazione episodi')).toBeInTheDocument()
    expect(screen.getByText('1 episodio da importare, 1 riga ignorata su 2.')).toBeInTheDocument()
    expect(screen.getByText('Valida')).toBeInTheDocument()
    expect(screen.getByText('Ignorata')).toBeInTheDocument()
    expect(screen.getAllByText(/nessun aggiornamento/).length).toBeGreaterThan(0)
    expect(screen.getByRole('checkbox', { name: 'Includi riga 2' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Includi riga 3' })).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Conferma importazione' }))

    expect(await screen.findByText('Importazione completata')).toBeInTheDocument()
    expect(screen.getByText('1 episodio importato, 0 righe escluse, 1 riga ignorata.')).toBeInTheDocument()

    const confirmCall = (global.fetch as jest.Mock).mock.calls[1]
    expect(String(confirmCall[0])).toContain('/api/opere/11111111-1111-4111-8111-111111111111/episodi/import')
    expect(confirmCall[1].headers).toMatchObject({
      Authorization: 'Bearer token-test',
      'Content-Type': 'application/json',
    })
    const sent = JSON.parse(confirmCall[1].body as string) as {
      mode: string
      rows: Array<{ rowNumber: number; included: boolean; draft: { episodio: string } }>
    }
    expect(sent.mode).toBe('confirm')
    expect(sent.rows.find((row) => row.rowNumber === 3)).toMatchObject({ included: true, draft: { episodio: '2' } })
    expect(sent.rows.find((row) => row.rowNumber === 2)?.included).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    await waitFor(() => expect(onImported).toHaveBeenCalledTimes(1))
  })

  it('rivalida una riga segnalata e la include solo se l’operatore la spunta', async () => {
    useAuth.mockReturnValue({ isAdmin: true, isOperatore: false })
    const user = userEvent.setup()
    renderActions()
    ;(global.fetch as jest.Mock).mockImplementation(async (_url: string, init: RequestInit) => ({
      ok: true,
      json: async () => (typeof init.body === 'string' ? confirmed : preview),
    }))

    const file = new File(['stagione'], 'episodi.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText('File episodi'), file)
    const episode = await screen.findByRole('textbox', { name: 'Episodio riga 2' })
    expect(episode).toHaveValue('1')
    await user.clear(episode)
    await user.type(episode, '9')

    const include = screen.getByRole('checkbox', { name: 'Includi riga 2' })
    expect(include).toBeEnabled()
    expect(include).not.toBeChecked()
    expect(screen.getByText('1 episodio da importare, 0 righe ignorate, 1 riga esclusa su 2.')).toBeInTheDocument()
    await user.click(include)
    expect(screen.getByText('2 episodi da importare, 0 righe ignorate su 2.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Conferma importazione' }))
    await screen.findByText('Importazione completata')
    const sent = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body as string) as {
      rows: Array<{ rowNumber: number; included: boolean; draft: { episodio: string; titolo: string } }>
    }
    expect(sent.rows.find((row) => row.rowNumber === 2)).toMatchObject({
      included: true,
      draft: { episodio: '9', titolo: 'Vecchio' },
    })
  })

  it('libera il duplicato se si esclude la prima riga e lo include solo dopo la spunta', async () => {
    useAuth.mockReturnValue({ isAdmin: true, isOperatore: false })
    const user = userEvent.setup()
    renderActions()
    const duplicatePreview = {
      ok: true,
      mode: 'preview',
      summary: { total: 2, valid: 1, skipped: 1, excluded: 0, imported: 0 },
      existingKeys: [],
      rows: [
        {
          rowNumber: 2,
          status: 'valid',
          message: null,
          included: true,
          stagione: 1,
          episodio: 1,
          titolo: 'Prima',
          durataMinuti: null,
          dataPrimaMessaInOnda: null,
          draft: { stagione: '1', episodio: '1', titolo: 'Prima', durataMinuti: '', dataPrimaMessaInOnda: '' },
        },
        {
          rowNumber: 3,
          status: 'skipped',
          message: 'Duplicato nel file: stagione 1, episodio 1 è già alla riga 2',
          included: false,
          stagione: 1,
          episodio: 1,
          titolo: 'Seconda',
          durataMinuti: null,
          dataPrimaMessaInOnda: null,
          draft: { stagione: '1', episodio: '1', titolo: 'Seconda', durataMinuti: '', dataPrimaMessaInOnda: '' },
        },
      ],
      alerts: [
        { rowNumber: 3, message: 'Duplicato nel file: stagione 1, episodio 1 è già alla riga 2' },
      ],
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => duplicatePreview,
    })

    await user.upload(screen.getByLabelText('File episodi'), new File(['stagione'], 'episodi.csv', { type: 'text/csv' }))
    expect(await screen.findByRole('checkbox', { name: 'Includi riga 3' })).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: 'Includi riga 2' }))

    const second = screen.getByRole('checkbox', { name: 'Includi riga 3' })
    expect(second).toBeEnabled()
    expect(second).not.toBeChecked()
    expect(screen.getByText('0 episodi da importare, 0 righe ignorate, 2 righe escluse su 2.')).toBeInTheDocument()
    expect(screen.queryByText(/Duplicato nel file/)).not.toBeInTheDocument()

    await user.click(second)
    expect(screen.getByText('1 episodio da importare, 0 righe ignorate, 1 riga esclusa su 2.')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Includi riga 2' })).not.toBeChecked()
  })
})
