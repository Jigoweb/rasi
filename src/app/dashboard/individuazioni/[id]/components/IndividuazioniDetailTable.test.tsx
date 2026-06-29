import { fireEvent, render, screen } from '@testing-library/react'
import IndividuazioniDetailTable from './IndividuazioniDetailTable'
import type { Individuazione } from '@/features/individuazioni/services/individuazioni.service'

describe('IndividuazioniDetailTable', () => {
  it('renders individuazione rows with key match fields', () => {
    const onSortChange = jest.fn()

    render(
      <IndividuazioniDetailTable
        individuazioni={[{
          id: 'individuazione-1',
          artista_id: 'artista-1',
          opera_id: 'opera-1',
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
        sortBy="punteggio_matching"
        sortDirection="asc"
        onSortChange={onSortChange}
        onLoadMore={jest.fn()}
      />
    )

    expect(screen.getByText('Film della sera')).toBeInTheDocument()
    expect(screen.getByText('S2E8: Stranger Things 2: "Chapter Eight: The Mind Flayer"')).toBeInTheDocument()
    expect(screen.getByText('Mario R')).toBeInTheDocument()
    expect(screen.getByText('Opera matchata')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Apri scheda artista Mario R' })).toHaveAttribute('href', '/dashboard/artisti/artista-1')
    expect(screen.getByRole('link', { name: 'Apri scheda opera Opera matchata' })).toHaveAttribute('href', '/dashboard/opere/opera-1')
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('normalizzato')).toBeInTheDocument()
    expect(screen.getByText('Validato')).toBeInTheDocument()
    expect(screen.getByText('Vista: match più bassi')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ordina per match percentuale: match più alti' }))
    expect(onSortChange).toHaveBeenCalledWith('punteggio_matching:desc')
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
          dettagli_matching: {
            episodio_mancante: true,
          },
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
    expect(screen.queryByText('score basso')).not.toBeInTheDocument()
    expect(screen.getAllByText('episodio mancante').length).toBeGreaterThan(0)
    expect(screen.queryByText('revisione senza motivo tracciato')).not.toBeInTheDocument()
    expect(screen.getByText('(1)')).toBeInTheDocument()
    expect(screen.getByText('Serie da controllare')).toBeInTheDocument()
  })
})
