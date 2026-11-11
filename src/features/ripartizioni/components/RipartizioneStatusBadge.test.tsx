import { render, screen } from '@testing-library/react'
import { RipartizioneStatusBadge } from './RipartizioneStatusBadge'

describe('RipartizioneStatusBadge', () => {
  it('shows the Italian label for each database status', () => {
    const { rerender } = render(<RipartizioneStatusBadge stato="pianificata" />)
    expect(screen.getByText('Pianificata')).toBeInTheDocument()

    rerender(<RipartizioneStatusBadge stato="calcolata" />)
    expect(screen.getByText('Calcolata')).toBeInTheDocument()

    rerender(<RipartizioneStatusBadge stato="approvata" />)
    expect(screen.getByText('Approvata')).toBeInTheDocument()

    rerender(<RipartizioneStatusBadge stato="distribuita" />)
    expect(screen.getByText('Distribuita')).toBeInTheDocument()
  })

  it('renders an unknown status as plain text', () => {
    render(<RipartizioneStatusBadge stato="in_corso" />)
    expect(screen.getByText('in_corso')).toBeInTheDocument()
  })

  it('renders an empty status as sconosciuto', () => {
    render(<RipartizioneStatusBadge stato={null} />)
    expect(screen.getByText('Sconosciuto')).toBeInTheDocument()
  })
})
