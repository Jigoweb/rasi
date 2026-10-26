import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import OperaDetailPage from './page'
import {
  getOperaById,
  getPartecipazioniByOperaId,
  updatePartecipazione,
} from '@/features/opere/services/opere.service'

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'uuid-opera' }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}))

jest.mock('@/features/opere/services/opere.service', () => ({
  getOperaById: jest.fn(async () => ({ data: { id: 'uuid-opera', codice_opera: 'OP001', titolo: 'Opera Test', titolo_originale: 'Originale', tipo: 'film', anno_produzione: 2020, imdb_tconst: null }, error: null })),
  getPartecipazioniByOperaId: jest.fn(async () => ({ data: [], error: null })),
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
})

describe('OperaDetailPage', () => {
  it('renders opera title', async () => {
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
    ;(getPartecipazioniByOperaId as jest.Mock).mockResolvedValue({
      data: [{
        id: 'p1',
        personaggio: null,
        note: null,
        ruolo_id: 'r1',
        artisti: { id: 'a1', nome: 'Anna', cognome: 'Neri' },
        ruoli_tipologie: { id: 'r1', nome: 'Attore' },
      }],
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
})

