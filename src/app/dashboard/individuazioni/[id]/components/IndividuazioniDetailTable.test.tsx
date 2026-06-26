import { render, screen } from '@testing-library/react'
import IndividuazioniDetailTable from './IndividuazioniDetailTable'
import type { Individuazione } from '@/features/individuazioni/services/individuazioni.service'

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
          punteggio_matching: 80.39,
          stato: 'validato',
          numero_stagione: null,
          numero_episodio: 2008,
          titolo_episodio_originale: 'Stranger Things 2: "Chapter Eight: The Mind Flayer"',
          dettagli_matching: {
            episode_normalization_fallback: {
              confidence: 'high',
              numero_stagione: 2,
              numero_episodio: 8,
            },
          },
          artisti: { nome: 'Mario', cognome: 'Rossi', nome_arte: 'Mario R' },
          opere: { titolo: 'Opera matchata' },
          ruoli_tipologie: { nome: 'Attore' },
        } as unknown as Individuazione]}
        loadingData={false}
        loadingMore={false}
        searchTerm=""
        totalCount={1}
        hasMore={false}
        onLoadMore={jest.fn()}
      />
    )

    expect(screen.getByText('Film della sera')).toBeInTheDocument()
    expect(screen.getByText('S2E8: Stranger Things 2: "Chapter Eight: The Mind Flayer"')).toBeInTheDocument()
    expect(screen.getByText('Mario R')).toBeInTheDocument()
    expect(screen.getByText('Opera matchata')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('normalizzato')).toBeInTheDocument()
    expect(screen.getByText('Validato')).toBeInTheDocument()
    expect(screen.getByText('Ordine: da rivedere prima')).toBeInTheDocument()
  })

  it('groups rows by database status labels', () => {
    render(
      <IndividuazioniDetailTable
        individuazioni={[{
          id: 'individuazione-2',
          titolo: 'Serie da controllare',
          data_trasmissione: '2026-06-24',
          ora_inizio: '20:00:00',
          ora_fine: '20:45:00',
          punteggio_matching: 0.66,
          stato: 'dubbioso',
          artisti: { nome: 'Anna', cognome: 'Verdi' },
          opere: { titolo: 'Opera dubbia' },
          ruoli_tipologie: { nome: 'Doppiatrice' },
        } as unknown as Individuazione]}
        loadingData={false}
        loadingMore={false}
        searchTerm=""
        totalCount={1}
        hasMore={false}
        groupBy="stato"
        onLoadMore={jest.fn()}
      />
    )

    expect(screen.getAllByText('In revisione').length).toBeGreaterThan(0)
    expect(screen.getByText('(1)')).toBeInTheDocument()
    expect(screen.getByText('Serie da controllare')).toBeInTheDocument()
  })
})
