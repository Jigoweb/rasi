import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import OperaDetailPage from './page'
import {
  getOperaById,
  listPartecipazioniByOpera,
  updatePartecipazione,
} from '@/features/opere/services/opere.service'

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'uuid-opera' }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}))

let mockRole = 'admin'
jest.mock('@/shared/contexts/auth-context', () => {
  const { getRolePermissions } = jest.requireActual('@/shared/lib/auth-permissions')
  return { useAuth: () => ({ userRole: mockRole, ...getRolePermissions(mockRole) }) }
})

jest.mock('@/features/opere/services/opere.service', () => ({
  getOperaById: jest.fn(async () => ({ data: { id: 'uuid-opera', codice_opera: 'OP001', titolo: 'Opera Test', titolo_originale: 'Originale', tipo: 'film', anno_produzione: 2020, imdb_tconst: null }, error: null })),
  PARTECIPAZIONI_PAGE_SIZE: 50,
  listPartecipazioniByOpera: jest.fn(async () => ({ data: [], total: 0, totalOpera: 0, error: null })),
  listAllPartecipazioniByOpera: jest.fn(async () => ({ data: [], error: null })),
  getEpisodiByOperaId: jest.fn(async () => ({ data: [], error: null })),
  getRuoliTipologie: jest.fn(async () => ({ data: [], error: null })),
  updatePartecipazione: jest.fn(async () => ({ error: null })),
}))

const operaFixture = {
  id: 'uuid-opera',
  codice_opera: 'OP001',
  titolo: 'Opera Test',
  titolo_originale: 'Originale',
  tipo: 'film',
  anno_produzione: 2020,
  imdb_tconst: null,
}

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn()
  window.HTMLElement.prototype.hasPointerCapture = jest.fn()
  window.HTMLElement.prototype.releasePointerCapture = jest.fn()
})

beforeEach(() => {
  jest.clearAllMocks()
  mockRole = 'admin'
})

describe('OperaDetailPage', () => {
  it('mostra titolo italiano e originale degli episodi', async () => {
    ;(getOperaById as jest.Mock).mockResolvedValueOnce({
      data: { ...operaFixture, tipo: 'serie_tv', has_episodes: true },
      error: null,
    })
    const { getEpisodiByOperaId } = jest.requireMock('@/features/opere/services/opere.service') as {
      getEpisodiByOperaId: jest.Mock
    }
    getEpisodiByOperaId.mockResolvedValueOnce({
      data: [{
        id: 'ep1',
        numero_stagione: 1,
        numero_episodio: 2,
        titolo_episodio: 'Il quinto oboe',
        titolo_episodio_originale: 'The Fifth Oboe',
        descrizione: null,
        durata_minuti: 40,
        data_prima_messa_in_onda: null,
        alias_titoli: null,
        imdb_tconst: null,
        codice_isan: null,
      }],
      error: null,
    })

    render(<OperaDetailPage />)
    expect(await screen.findByRole('columnheader', { name: 'Titolo italiano' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Titolo originale' })).toBeInTheDocument()
    expect(screen.getAllByText('Il quinto oboe').length).toBeGreaterThan(0)
    expect(screen.getAllByText('The Fifth Oboe').length).toBeGreaterThan(0)
    expect(screen.getByText('Stagione 1 · 1 episodio')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Stagione 1 · 1 episodio/ })).not.toBeInTheDocument()
  })

  it('raggruppa gli episodi per stagione con anteprima espandibile', async () => {
    const user = userEvent.setup()
    ;(getOperaById as jest.Mock).mockResolvedValueOnce({
      data: { ...operaFixture, tipo: 'serie_tv', has_episodes: true },
      error: null,
    })
    const { getEpisodiByOperaId } = jest.requireMock('@/features/opere/services/opere.service') as {
      getEpisodiByOperaId: jest.Mock
    }
    getEpisodiByOperaId.mockResolvedValueOnce({
      data: [
        {
          id: 'ep1',
          numero_stagione: 1,
          numero_episodio: 1,
          titolo_episodio: 'Pilota',
          titolo_episodio_originale: 'Pilot',
          descrizione: null,
          durata_minuti: 40,
          data_prima_messa_in_onda: null,
          imdb_tconst: null,
          codice_isan: null,
        },
        {
          id: 'ep2',
          numero_stagione: 1,
          numero_episodio: 2,
          titolo_episodio: 'Il quinto oboe',
          titolo_episodio_originale: 'The Fifth Oboe',
          descrizione: null,
          durata_minuti: 40,
          data_prima_messa_in_onda: null,
          imdb_tconst: null,
          codice_isan: null,
        },
      ],
      error: null,
    })

    render(<OperaDetailPage />)

    const toggle = await screen.findByRole('button', { name: /Stagione 1 · 2 episodi/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Espandi' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Espandi' }))
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('button', { name: 'Espandi' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Pilota').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Il quinto oboe').length).toBeGreaterThan(0)

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Espandi' })).toBeInTheDocument()
  })

  it('renders opera title', async () => {
    mockRole = 'collecting'
    render(<OperaDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Opera Test')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Importa cast' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Scarica template cast' })).not.toBeInTheDocument()
  })

  it('keeps the detail page mounted while the post-save refresh is in flight', async () => {
    let releaseRefresh: (value: unknown) => void = () => {}
    ;(getOperaById as jest.Mock)
      .mockImplementationOnce(async () => ({ data: operaFixture, error: null }))
      .mockImplementationOnce(() => new Promise((resolve) => {
        releaseRefresh = resolve
      }))
    ;(listPartecipazioniByOpera as jest.Mock).mockResolvedValue({
      data: [{
        id: 'p1',
        personaggio: null,
        note: null,
        ruolo_id: 'r1',
        artisti: { id: 'a1', nome: 'Anna', cognome: 'Neri' },
        ruoli_tipologie: { id: 'r1', nome: 'Attore' },
      }],
      total: 1,
      totalOpera: 1,
      error: null,
    })
    ;(updatePartecipazione as jest.Mock).mockResolvedValue({ error: null })

    const user = userEvent.setup()
    render(<OperaDetailPage />)

    const artist = await screen.findByRole('link', { name: 'Anna Neri' })
    const row = artist.closest('[class*="px-4"]')
    expect(row).not.toBeNull()
    await user.click(within(row as HTMLElement).getByRole('button'))
    await user.click(await screen.findByRole('menuitem', { name: /Modifica/ }))
    await user.click(await screen.findByRole('button', { name: 'Salva Modifiche' }))

    await waitFor(() => {
      expect(getOperaById).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByRole('heading', { name: 'Opera Test' })).toBeInTheDocument()
    expect(screen.queryByText('Caricamento...')).not.toBeInTheDocument()

    releaseRefresh({ data: operaFixture, error: null })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Opera Test' })).toBeInTheDocument()
    })
  })

  it('mostra il totale oltre 1000 e chiede la pagina successiva senza caricare tutte le righe', async () => {
    const user = userEvent.setup()
    const row = {
      id: 'p1',
      personaggio: null,
      note: null,
      ruolo_id: 'r1',
      artisti: { id: 'a1', nome: 'Anna', cognome: 'Neri' },
      ruoli_tipologie: { id: 'r1', nome: 'Attore' },
    }
    ;(listPartecipazioniByOpera as jest.Mock).mockResolvedValue({
      data: [row],
      total: 1551,
      totalOpera: 1551,
      error: null,
    })

    render(<OperaDetailPage />)

    expect(await screen.findByText(`${(1551).toLocaleString('it-IT')} artisti`)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Anna Neri' })).toBeInTheDocument()
    expect(screen.getByLabelText('Pagine partecipazioni')).toHaveTextContent(
      `1–50 di ${(1551).toLocaleString('it-IT')}`,
    )
    await waitFor(() => {
      expect(listPartecipazioniByOpera).toHaveBeenCalledTimes(1)
    })
    expect(listPartecipazioniByOpera).toHaveBeenCalledWith(expect.objectContaining({
      operaId: 'uuid-opera',
      page: 1,
    }))

    await user.click(screen.getByRole('button', { name: 'Successiva' }))

    await waitFor(() => {
      expect(listPartecipazioniByOpera).toHaveBeenCalledWith(expect.objectContaining({
        operaId: 'uuid-opera',
        page: 2,
      }))
    })
    expect(listPartecipazioniByOpera).toHaveBeenCalledTimes(2)
  })
  describe('restrizioni Operatore base e Tirocinante', () => {
    it.each(['operatore_base', 'tirocinante'])('%s: opera validata in sola lettura con banner', async (role) => {
      mockRole = role
      ;(getOperaById as jest.Mock).mockResolvedValue({
        data: { ...operaFixture, stato_validazione: 'validato' },
        error: null,
      })
      render(<OperaDetailPage />)

      expect(await screen.findByText(/Opera validata: solo un Operatore pro/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Modifica$/ })).toBeDisabled()
      expect(screen.getByRole('button', { name: /Importa da OMDb/ })).toBeDisabled()
      // né partecipazioni né cast esterno
      expect(screen.queryAllByRole('button', { name: /^Aggiungi$/ })).toHaveLength(0)
      expect(screen.getByRole('button', { name: 'Cambia tipo opera' })).toBeDisabled()
    })

    it.each(['operatore_base', 'tirocinante'])('%s: opera da validare modificabile, senza banner', async (role) => {
      mockRole = role
      ;(getOperaById as jest.Mock).mockResolvedValue({
        data: { ...operaFixture, stato_validazione: 'da_validare' },
        error: null,
      })
      render(<OperaDetailPage />)

      expect(await screen.findByRole('heading', { name: 'Opera Test' })).toBeInTheDocument()
      expect(screen.queryByText(/Opera validata: solo un Operatore pro/)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Modifica$/ })).toBeEnabled()
      // «Aggiungi» di partecipazioni e cast esterno
      expect(screen.getAllByRole('button', { name: /^Aggiungi$/ })).toHaveLength(2)
    })

    it('Operatore pro modifica anche un\'opera validata', async () => {
      mockRole = 'operatore'
      ;(getOperaById as jest.Mock).mockResolvedValue({
        data: { ...operaFixture, stato_validazione: 'validato' },
        error: null,
      })
      render(<OperaDetailPage />)

      expect(await screen.findByRole('heading', { name: 'Opera Test' })).toBeInTheDocument()
      expect(screen.queryByText(/Opera validata: solo un Operatore pro/)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Modifica$/ })).toBeEnabled()
    })
  })
})

