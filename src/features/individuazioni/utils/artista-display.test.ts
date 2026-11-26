import { formatArtistaIndividuazione } from './artista-display'

describe('formatArtistaIndividuazione', () => {
  it('mostra Cognome, Nome - Pseudonimo', () => {
    expect(formatArtistaIndividuazione({ nome: 'Paul', cognome: 'Reyes', nome_arte: 'Chico' }))
      .toBe('Reyes, Paul - Chico')
  })

  it('senza pseudonimo mostra Cognome, Nome', () => {
    expect(formatArtistaIndividuazione({ nome: 'Maurizio', cognome: 'Arcieri', nome_arte: null }))
      .toBe('Arcieri, Maurizio')
  })

  it('solo pseudonimo quando mancano nome e cognome', () => {
    expect(formatArtistaIndividuazione({ nome: '', cognome: null, nome_arte: 'Gipsy Kings' }))
      .toBe('Gipsy Kings')
  })

  it('non ripete uno pseudonimo uguale a nome e cognome', () => {
    expect(formatArtistaIndividuazione({ nome: 'Enrico', cognome: 'Brignano', nome_arte: 'Enrico Brignano' }))
      .toBe('Brignano, Enrico')
  })

  it('usa il fallback se non c’è artista', () => {
    expect(formatArtistaIndividuazione(null)).toBe('-')
    expect(formatArtistaIndividuazione(undefined, 'Artista')).toBe('Artista')
  })
})
