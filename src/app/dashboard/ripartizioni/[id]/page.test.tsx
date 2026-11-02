import { render, screen, waitFor } from '@testing-library/react'
import { supabase } from '@/shared/lib/supabase'
import RipartizioneDettaglioPage from './page'

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'camp-1' }),
}))

jest.mock('@/shared/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}))

function mockSingle(result: { data: unknown; error: { code?: string; message: string } | null }) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    single: () => Promise.resolve(result),
  }
  ;(supabase.from as jest.Mock).mockReturnValue(builder)
}

describe('RipartizioneDettaglioPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows a retryable error instead of a missing campaign when the read fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    mockSingle({ data: null, error: { code: '42501', message: 'permission denied for table campagne_ripartizione' } })

    render(<RipartizioneDettaglioPage />)

    expect(await screen.findByText('Non siamo riusciti a caricare la campagna')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument()
    expect(screen.queryByText('Campagna non trovata.')).not.toBeInTheDocument()
    consoleError.mockRestore()
  })

  it('shows not found when the campaign does not exist', async () => {
    mockSingle({ data: null, error: { code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object' } })

    render(<RipartizioneDettaglioPage />)

    expect(await screen.findByText('Campagna non trovata.')).toBeInTheDocument()
    expect(screen.queryByText('Non siamo riusciti a caricare la campagna')).not.toBeInTheDocument()
  })

  it('shows the database status label', async () => {
    mockSingle({
      data: {
        id: 'camp-1',
        nome: 'Riparto 2026',
        descrizione: null,
        periodo_riferimento_inizio: '2026-01-01',
        periodo_riferimento_fine: '2026-03-31',
        importo_totale_disponibile: 1000,
        configurazione_calcolo: null,
        stato: 'calcolata',
        created_at: '2026-02-01T10:00:00.000Z',
      },
      error: null,
    })

    render(<RipartizioneDettaglioPage />)

    expect(await screen.findByText('Calcolata')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByText('Riparto 2026').length).toBeGreaterThan(0)
    })
  })
})
