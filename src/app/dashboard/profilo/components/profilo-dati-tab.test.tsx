import { render, screen } from '@testing-library/react'
import { ProfiloDatiTab } from './profilo-dati-tab'

jest.mock('@/features/artisti/services/artisti.service', () => ({
  updateArtista: jest.fn(),
}))

const AU_BR = 'Art. 73 - AU - BR BROADCASTING'
const AV_BR = 'Art 84 comma 2 - AV - BR BROADCASTING'
const LENDING_AL = 'Art. 72, comma 1, lett. c) Art. 80, comma 2, lett. f) - AL - LLE LENDING'
const RR = 'Art. 180-bis - ALL - RR RETRANSMISSION RIGHTS'

function badgeLabels(ambito: 'musica' | 'cinema' | 'entrambi' | null, diritti: string[]) {
  const { container } = render(
    <ProfiloDatiTab
      artista={{ id: 'a1', ambito, diritti_attivi: diritti, is_rasi: true }}
      onArtistaUpdated={jest.fn()}
    />,
  )
  const row = screen.getByText('Diritti attivi').parentElement
  return Array.from(row?.querySelectorAll('[data-slot="badge"]') ?? container.querySelectorAll('[data-slot="badge"]'))
    .map((badge) => badge.textContent)
}

describe('ProfiloDatiTab diritti order', () => {
  it('orders the artist area by musica and keeps the stored AL lending label', () => {
    expect(badgeLabels('musica', [RR, AV_BR, LENDING_AL, AU_BR])).toEqual([
      AU_BR,
      LENDING_AL,
      RR,
      AV_BR,
    ])
  })

  it('orders video (cinema) and leaves rights outside that list at the end', () => {
    expect(badgeLabels('cinema', [AU_BR, RR, AV_BR, LENDING_AL])).toEqual([
      AV_BR,
      LENDING_AL,
      RR,
      AU_BR,
    ])
  })

  it('orders interdisciplinare when both AU and AV are present and ambito is empty', () => {
    expect(badgeLabels(null, [AV_BR, AU_BR])).toEqual([AU_BR, AV_BR])
  })

  it('keeps the incoming order when ambito and AU/AV markers are both missing', () => {
    expect(badgeLabels(null, ['voce libera', 'ALL (Tutti i diritti)'])).toEqual([
      'voce libera',
      'ALL (Tutti i diritti)',
    ])
  })
})
