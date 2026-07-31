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

const campagnaBozza: CampagnaProgrammazione = {
  ...campagna,
  id: 'campagna-2',
  nome: 'Campagna Bozza',
  stato: 'bozza',
  programmazioni_count: 0,
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
    onEdit: jest.fn(),
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
    expect(screen.queryByRole('columnheader', { name: 'Anno' })).not.toBeInTheDocument()
    expect(screen.getAllByText('23/06/2026').length).toBeGreaterThan(0)
  })

  it('keeps primary workflow clicks from triggering row navigation', () => {
    const onStartIndividuazioni = jest.fn()
    renderTable({ onStartIndividuazioni })

    fireEvent.click(screen.getByText('Crea Individuazioni'))

    expect(onStartIndividuazioni).toHaveBeenCalledWith(campagna)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('navigates to the detail page from the row keyboard shortcut', () => {
    renderTable()

    const row = screen.getAllByText('Campagna Test')[0].closest('tr')
    expect(row).not.toBeNull()

    fireEvent.keyDown(row!, { key: 'Enter' })

    expect(pushMock).toHaveBeenCalledWith('/dashboard/programmazioni/campagna-1')
  })

  it('supports select-all and bulk create/delete actions', () => {
    const onSelectionChange = jest.fn()
    const onBulkCreateIndividuazioni = jest.fn()
    const onBulkDelete = jest.fn()
    const selectedIds = new Set(['campagna-1', 'campagna-2'])

    renderTable({
      campagne: [campagna, campagnaBozza],
      selectedIds,
      onSelectionChange,
      onBulkCreateIndividuazioni,
      onBulkDelete,
    })

    expect(screen.getByText('2 selezionate')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Crea individuazioni \(1\)/i }))
    expect(onBulkCreateIndividuazioni).toHaveBeenCalledWith([campagna])

    fireEvent.click(screen.getByRole('button', { name: /Elimina \(2\)/i }))
    expect(onBulkDelete).toHaveBeenCalledWith([campagna, campagnaBozza])

    fireEvent.click(screen.getByLabelText('Seleziona tutte le programmazioni visibili'))
    expect(onSelectionChange).toHaveBeenCalled()
  })

  it('does not navigate when toggling a row checkbox', () => {
    const onSelectionChange = jest.fn()
    renderTable({
      selectedIds: new Set(),
      onSelectionChange,
    })

    fireEvent.click(screen.getAllByLabelText('Seleziona Campagna Test')[0])

    expect(onSelectionChange).toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })
})
