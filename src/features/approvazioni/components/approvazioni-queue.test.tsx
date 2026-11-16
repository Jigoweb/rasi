import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ApprovazioniQueue } from './approvazioni-queue'
import { approvaModifica, listProposteInAttesa, respingiModifica } from '@/features/approvazioni/services/proposte.service'

let mockStaff = true
jest.mock('@/shared/contexts/auth-context', () => ({
  useAuth: () => ({ isStaff: mockStaff, loading: false }),
}))

jest.mock('@/features/approvazioni/services/proposte.service', () => ({
  listProposteInAttesa: jest.fn(),
  approvaModifica: jest.fn(async () => ({ error: null })),
  respingiModifica: jest.fn(async () => ({ error: null })),
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

const proposta = {
  id: 'prop-1',
  entita: 'opera',
  entita_id: 'op-1',
  opera_id: 'op-1',
  operazione: 'update' as const,
  payload: {
    prima: { titolo: 'Vecchio' },
    dopo: { titolo: 'Nuovo' },
  },
  stato: 'in_attesa' as const,
  proposta_da: 'user-1',
  revisionata_da: null,
  nota_revisione: null,
  creata_il: '2026-11-13T10:00:00.000Z',
  revisionata_il: null,
}

beforeEach(() => {
  mockStaff = true
  jest.clearAllMocks()
  ;(listProposteInAttesa as jest.Mock).mockResolvedValue({ data: [proposta], error: null })
})

describe('ApprovazioniQueue', () => {
  it('mostra il diff e approva la proposta', async () => {
    const user = userEvent.setup()
    render(<ApprovazioniQueue />)

    expect(await screen.findByRole('heading', { name: 'Approvazioni' })).toBeInTheDocument()
    expect(screen.getByText('Titolo')).toBeInTheDocument()
    expect(screen.getByText('Vecchio')).toBeInTheDocument()
    expect(screen.getByText('Nuovo')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Approva' }))
    expect(approvaModifica).toHaveBeenCalledWith('prop-1', null)
  })

  it('respinge con la nota scritta', async () => {
    const user = userEvent.setup()
    render(<ApprovazioniQueue />)
    await screen.findByRole('button', { name: 'Respingi' })
    await user.type(screen.getByRole('textbox'), 'Titolo non conforme')
    await user.click(screen.getByRole('button', { name: 'Respingi' }))
    expect(respingiModifica).toHaveBeenCalledWith('prop-1', 'Titolo non conforme')
  })

  it('non mostra le azioni a chi non è admin o Operatore pro', async () => {
    mockStaff = false
    render(<ApprovazioniQueue />)
    expect(await screen.findByText(/Non hai i permessi/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approva' })).not.toBeInTheDocument()
    expect(listProposteInAttesa).not.toHaveBeenCalled()
  })

  it('dice quando la coda è vuota', async () => {
    ;(listProposteInAttesa as jest.Mock).mockResolvedValue({ data: [], error: null })
    render(<ApprovazioniQueue />)
    expect(await screen.findByText('Nessuna modifica in attesa.')).toBeInTheDocument()
  })
})