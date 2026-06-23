import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import type { CampagnaProgrammazione } from '@/features/programmazioni/services/programmazioni.service'
import ProgrammazioniTable from './ProgrammazioniTable'

const pushMock = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const campagna: CampagnaProgrammazione = {
  id: 'campagna-1',
  emittente_id: 'emittente-1',
  anno: 2026,
  nome: 'Campagna Test',
  descrizione: 'Note campagna',
  stato: 'in_review',
  created_at: '2026-06-23T10:00:00.000Z',
  created_by: 'user-1',
  emittenti: { nome: 'Rai 1' },
  programmazioni_count: 12,
}

function renderTable(overrides: Partial<ComponentProps<typeof ProgrammazioniTable>> = {}) {
  const props: ComponentProps<typeof ProgrammazioniTable> = {
    campagne: [campagna],
    uploadProgress: {},
    deleteProgress: {},
    processingProgressMap: {},
    processingJobMap: {},
    loadingProgressMap: {},
    isCampagnaProcessing: jest.fn(() => false),
    canStartProcess: jest.fn(() => true),
    fetchProcessingProgress: jest.fn(),
    onUpload: jest.fn(),
    onStartIndividuazioni: jest.fn(),
    onResumeIndividuazioni: jest.fn(),
    onDelete: jest.fn(),
    ...overrides,
  }

  render(<ProgrammazioniTable {...props} />)

  return props
}

describe('ProgrammazioniTable', () => {
  beforeEach(() => {
    pushMock.mockClear()
  })

  it('renders desktop and mobile campaign summaries', () => {
    renderTable()

    expect(screen.getAllByText('Campagna Test').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Rai 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2026').length).toBeGreaterThan(0)
  })

  it('keeps upload clicks from triggering row navigation', () => {
    const onUpload = jest.fn()
    renderTable({ onUpload })

    fireEvent.click(screen.getByText('Carica Dati'))

    expect(onUpload).toHaveBeenCalledWith(campagna)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('navigates to the detail page from the row keyboard shortcut', () => {
    renderTable()

    const row = screen.getAllByText('Campagna Test')[0].closest('tr')
    expect(row).not.toBeNull()

    fireEvent.keyDown(row!, { key: 'Enter' })

    expect(pushMock).toHaveBeenCalledWith('/dashboard/programmazioni/campagna-1')
  })
})
