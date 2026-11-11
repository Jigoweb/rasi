import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ProfiloArtistaPage from './page'
import { getArtistaById, getPartecipazioniByArtistaId } from '@/features/artisti/services/artisti.service'

jest.mock('@/shared/contexts/auth-context', () => ({
  useAuth: () => ({ artistaId: 'art-1', loading: false }),
}))

jest.mock('@/shared/lib/supabase-client', () => ({
  supabase: { from: jest.fn() },
}))

jest.mock('@/features/artisti/services/artisti.service', () => ({
  getArtistaById: jest.fn(async () => ({
    data: {
      id: 'art-1',
      nome: 'Ada',
      cognome: 'Lovelace',
      stato: 'attivo',
      nome_arte: null,
      codice_ipn: null,
      territorio: null,
    },
    error: null,
  })),
  getPartecipazioniByArtistaId: jest.fn(async () => ({
    data: [{
      id: 'p1',
      personaggio: 'Se stessa',
      note: 'SEGRETO STAFF',
      opere: { titolo: 'Opera nascosta', tipo: 'film', anno_produzione: 2020 },
      ruoli_tipologie: { nome: 'Attrice' },
      episodi: null,
    }],
    error: null,
  })),
}))

jest.mock('./components/profilo-dati-tab', () => ({
  ProfiloDatiTab: () => <div>Dati personali</div>,
}))

describe('ProfiloArtistaPage repertorio', () => {
  it('does not show partecipazione notes in the artist area', async () => {
    const user = userEvent.setup()
    render(<ProfiloArtistaPage />)

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Repertorio/ }))

    expect(await screen.findByText('Opera nascosta')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Ruolo' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Note' })).not.toBeInTheDocument()
    expect(screen.queryByText('SEGRETO STAFF')).not.toBeInTheDocument()
    expect(getArtistaById).toHaveBeenCalledWith('art-1')
    expect(getPartecipazioniByArtistaId).toHaveBeenCalledWith('art-1')
  })
})
