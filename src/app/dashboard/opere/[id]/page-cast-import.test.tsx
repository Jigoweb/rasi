import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import OperaDetailPage from './page'

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'uuid-opera' }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}))

jest.mock('@/shared/contexts/auth-context', () => ({
  useAuth: () => ({ isAdmin: false, userRole: 'operatore' }),
}))

jest.mock('@/features/opere/services/opere.service', () => ({
  getOperaById: jest.fn(async () => ({ data: { id: 'uuid-opera', codice_opera: 'OP001', titolo: 'Opera Test', titolo_originale: 'Originale', tipo: 'film', anno_produzione: 2020, imdb_tconst: null }, error: null })),
  getPartecipazioniByOperaId: jest.fn(async () => ({ data: [], error: null })),
  getEpisodiByOperaId: jest.fn(async () => ({ data: [], error: null })),
  getRuoliTipologie: jest.fn(async () => ({ data: [], error: null })),
}))

jest.mock('@/features/opere/services/cast-esterno.service', () => ({
  listCastEsterno: jest.fn(async () => ({ data: [], error: null })),
  listCastEsternoArtistiCorrispondenti: jest.fn(async () => ({ data: [], error: null })),
  createCastEsterno: jest.fn(),
  updateCastEsterno: jest.fn(),
  deleteCastEsterno: jest.fn(),
  replaceCastEsterno: jest.fn(),
}))

describe('OperaDetailPage cast import for operatore', () => {
  it('shows the template and import actions', async () => {
    const user = userEvent.setup()
    render(<OperaDetailPage />)
    expect(await screen.findByRole('button', { name: 'Cast' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cast' }))
    expect(await screen.findByRole('menuitem', { name: 'Scarica template cast' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Importa cast' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Opera Test')).toBeInTheDocument()
    })
  })
})
