import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import RevisioneOperaPage from './page'
import {
  approvaModificheOpera,
  listModificheOpera,
  ripristinaModifica,
} from '@/features/approvazioni/services/approvazioni.service'

const push = jest.fn()
jest.mock('next/navigation', () => ({
  useParams: () => ({ operaId: 'op-1' }),
  useRouter: () => ({ push }),
}))

let mockRole = 'operatore'
jest.mock('@/shared/contexts/auth-context', () => {
  const { getRolePermissions } = jest.requireActual('@/shared/lib/auth-permissions')
  return { useAuth: () => ({ userRole: mockRole, loading: false, ...getRolePermissions(mockRole) }) }
})

jest.mock('@/shared/lib/toast', () => ({
  notifySuccess: jest.fn(),
  getErrorMessage: (error: { message?: string }) => error?.message ?? 'errore',
}))

jest.mock('@/features/approvazioni/services/approvazioni.service', () => ({
  listModificheOpera: jest.fn(),
  ripristinaModifica: jest.fn(async () => ({ error: null })),
  approvaModificheOpera: jest.fn(async () => ({ data: { approvate: 2, validata: true }, error: null })),
}))

const modifiche = [
  {
    id: 11,
    occurred_at: '2026-11-16T10:00:00Z',
    user_email: 'base@example.invalid',
    user_ruolo: 'operatore_base',
    azione: 'UPDATE',
    tabella: 'opere',
    record_id: 'op-1',
    record_label: 'Gomorra',
    campi_modificati: ['titolo'],
    old_data: { titolo: 'Gomora' },
    new_data: { titolo: 'Gomorra' },
    esito: null,
    revisionata_il: null,
  },
  {
    id: 12,
    occurred_at: '2026-11-16T10:05:00Z',
    user_email: 'tiro@example.invalid',
    user_ruolo: 'tirocinante',
    azione: 'INSERT',
    tabella: 'cast_esterno',
    record_id: 'c-1',
    record_label: 'Mario Rossi',
    campi_modificati: null,
    old_data: null,
    new_data: { nome: 'Mario Rossi' },
    esito: null,
    revisionata_il: null,
  },
]

beforeEach(() => {
  jest.clearAllMocks()
  mockRole = 'operatore'
  ;(listModificheOpera as jest.Mock).mockResolvedValue({ data: modifiche, error: null })
})

describe('RevisioneOperaPage', () => {
  it('mostra prima e dopo di ogni modifica con l\'autore', async () => {
    render(<RevisioneOperaPage />)
    const titolo = await screen.findByText('Modifica · Opere · Gomorra')
    const card = titolo.closest('[data-slot="card"]') as HTMLElement
    expect(within(card).getByText('Gomora')).toBeInTheDocument()
    expect(within(card).getByText(/base@example\.invalid \(Operatore base\)/)).toBeInTheDocument()
    expect(screen.getByText('Creazione · Cast esterno · Mario Rossi')).toBeInTheDocument()
    expect(screen.getByText(/2 da rivedere/)).toBeInTheDocument()
  })

  it('ripristina una singola modifica dopo la conferma', async () => {
    const user = userEvent.setup()
    render(<RevisioneOperaPage />)
    const titolo = await screen.findByText('Creazione · Cast esterno · Mario Rossi')
    const card = titolo.closest('[data-slot="card"]') as HTMLElement
    await user.click(within(card).getByRole('button', { name: /Ripristina/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/La riga creata verrà eliminata/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Ripristina' }))
    await waitFor(() => expect(ripristinaModifica).toHaveBeenCalledWith(12))
    expect(listModificheOpera).toHaveBeenCalledTimes(2)
  })

  it('approva e valida l\'opera e torna all\'elenco', async () => {
    const user = userEvent.setup()
    render(<RevisioneOperaPage />)
    await screen.findByText('Modifica · Opere · Gomorra')
    await user.click(screen.getByRole('button', { name: /Approva e valida/ }))
    await waitFor(() => expect(approvaModificheOpera).toHaveBeenCalledWith('op-1', true))
    expect(push).toHaveBeenCalledWith('/dashboard/approvazioni')
  })

  it('non è accessibile all\'Operatore base', async () => {
    mockRole = 'operatore_base'
    render(<RevisioneOperaPage />)
    expect(screen.getByText(/Solo amministratori e Operatori pro/)).toBeInTheDocument()
    expect(listModificheOpera).not.toHaveBeenCalled()
  })
})
