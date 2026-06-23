import { render, screen } from '@testing-library/react'
import IndividuazioniDetailTable from './IndividuazioniDetailTable'

describe('IndividuazioniDetailTable', () => {
  it('renders individuazione rows with key match fields', () => {
    render(
      <IndividuazioniDetailTable
        individuazioni={[{
          id: 'individuazione-1',
          titolo: 'Film della sera',
          data_trasmissione: '2026-06-23',
          ora_inizio: '21:10:00',
          ora_fine: '22:40:00',
          punteggio_matching: 0.92,
          stato: 'validato',
          artisti: { nome: 'Mario', cognome: 'Rossi', nome_arte: 'Mario R' },
          opere: { titolo: 'Opera matchata' },
          ruoli_tipologie: { nome: 'Attore' },
        } as any]}
        loadingData={false}
        searchTerm=""
        page={1}
        pageSize={50}
        totalPages={1}
        totalCount={1}
        onPageChange={jest.fn()}
      />
    )

    expect(screen.getByText('Film della sera')).toBeInTheDocument()
    expect(screen.getByText('Mario R')).toBeInTheDocument()
    expect(screen.getByText('Opera matchata')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('Validato')).toBeInTheDocument()
  })
})
