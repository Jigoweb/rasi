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
  summary: { total: 2, valid: 1, skipped: 1, imported: 0 },
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
  summary: { total: 2, valid: 1, skipped: 1, imported: 1 },
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
      const mode = (init.body as FormData).get('mode')
      return {
        ok: true,
        json: async () => (mode === 'confirm' ? confirmed : preview),
      }
    })

    expect(screen.getByRole('button', { name: 'Scarica template episodi' })).toBeInTheDocument()
    const file = new File(['stagione'], 'episodi.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText('File episodi'), file)

    expect(await screen.findByText('Anteprima importazione episodi')).toBeInTheDocument()
    expect(screen.getByText('1 riga valida, 1 riga ignorata su 2.')).toBeInTheDocument()
    expect(screen.getByText('Valida')).toBeInTheDocument()
    expect(screen.getByText('Ignorata')).toBeInTheDocument()
    expect(screen.getByText(/nessun aggiornamento/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Conferma importazione' }))

    expect(await screen.findByText('Importazione completata')).toBeInTheDocument()
    expect(screen.getByText('1 episodio importato, 1 riga ignorata.')).toBeInTheDocument()

    const confirmCall = (global.fetch as jest.Mock).mock.calls[1]
    expect(String(confirmCall[0])).toContain('/api/opere/11111111-1111-4111-8111-111111111111/episodi/import')
    expect((confirmCall[1].headers as Record<string, string>).Authorization).toBe('Bearer token-test')
    expect((confirmCall[1].body as FormData).get('mode')).toBe('confirm')

    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    await waitFor(() => expect(onImported).toHaveBeenCalledTimes(1))
  })
})
