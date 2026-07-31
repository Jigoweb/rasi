import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import EpisodeAlertPanel from './EpisodeAlertPanel'
import { getCampagnaIndividuazioneEpisodeAlerts } from '@/features/individuazioni/services/individuazioni.service'

jest.mock('@/features/individuazioni/services/individuazioni.service', () => ({
  getCampagnaIndividuazioneEpisodeAlerts: jest.fn(),
}))

describe('EpisodeAlertPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('expands into a review queue with deep links', async () => {
    ;(getCampagnaIndividuazioneEpisodeAlerts as jest.Mock).mockResolvedValue({
      data: [{
        id: 'alert-1',
        tipoAlert: 'catalog_episode_not_censito',
        programmazioneId: 'prog-1',
        operaId: 'opera-1',
        campagneProgrammazioneId: 'camp-prog-1',
        numeroStagione: 1,
        numeroEpisodio: 2,
        titolo: 'MOZART IN THE JUNGLE',
        titoloOriginale: null,
        titoloEpisodio: 'Pilot',
        operaTitolo: 'Mozart in the Jungle',
        dataTrasmissione: '2015-01-10',
        oraInizio: '21:00',
      }],
      error: null,
    })

    render(
      <EpisodeAlertPanel
        campagnaId="campagna-1"
        summary={{
          totale: 2,
          catalogEpisodeNotCensito: 2,
          programmazioneEpisodeDataInvalid: 0,
          programmazioniCoinvolte: 2,
          opereCoinvolte: 1,
          topOpere: [{ titolo: 'MOZART IN THE JUNGLE', tipoAlert: 'catalog_episode_not_censito', count: 2 }],
        }}
      />
    )

    expect(screen.getByText(/Alert episodi esclusi/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Apri coda revisione/i }))

    await waitFor(() => {
      expect(getCampagnaIndividuazioneEpisodeAlerts).toHaveBeenCalledWith('campagna-1')
    })

    expect(await screen.findByText('MOZART IN THE JUNGLE')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Apri opera/i })).toHaveAttribute('href', '/dashboard/opere/opera-1')
    expect(screen.getByRole('link', { name: /Apri programmazione/i })).toHaveAttribute(
      'href',
      '/dashboard/programmazioni/camp-prog-1?q=MOZART%20IN%20THE%20JUNGLE'
    )
  })

  it('renders nothing without alerts', () => {
    const { container } = render(
      <EpisodeAlertPanel
        campagnaId="campagna-1"
        summary={{
          totale: 0,
          catalogEpisodeNotCensito: 0,
          programmazioneEpisodeDataInvalid: 0,
          programmazioniCoinvolte: 0,
          opereCoinvolte: 0,
          topOpere: [],
        }}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
