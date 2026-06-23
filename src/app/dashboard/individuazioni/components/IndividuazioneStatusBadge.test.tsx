import { render, screen } from '@testing-library/react'
import IndividuazioneStatusBadge from './IndividuazioneStatusBadge'

describe('IndividuazioneStatusBadge', () => {
  it('shows interrupted for stale in_corso progress', () => {
    render(
      <IndividuazioneStatusBadge
        stato="in_corso"
        progress={{ last_activity_at: '2026-06-23T10:00:00.000Z', job_stato: null } as any}
        now={Date.parse('2026-06-23T10:20:00.000Z')}
      />
    )

    expect(screen.getByText('Interrotto')).toBeInTheDocument()
  })
})
