import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import OperaDetailPage from './page'

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'uuid-opera' }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}))

jest.mock('@/features/opere/services/opere.service', () => ({
  getOperaById: jest.fn(async () => ({ data: { id: 'uuid-opera', codice_opera: 'OP001', titolo: 'Opera Test', titolo_originale: 'Originale', tipo: 'film', anno_produzione: 2020, imdb_tconst: null }, error: null })),
  getPartecipazioniByOperaId: jest.fn(async () => ({ data: [], error: null })),
  getEpisodiByOperaId: jest.fn(async () => ({ data: [], error: null })),
}))

describe('OperaDetailPage', () => {
  it('renders opera title', async () => {
    render(<OperaDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Opera Test')).toBeInTheDocument()
    })
  })
})

