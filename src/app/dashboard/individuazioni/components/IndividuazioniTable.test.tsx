import { fireEvent, render, screen } from '@testing-library/react'
import IndividuazioniTable from './IndividuazioniTable'

const baseProps = {
  loading: false,
  searchTerm: '',
  processingProgressMap: {},
  loadingProgressMap: {},
  resumingId: null,
  canStartProcess: () => true,
  onOpenDetail: jest.fn(),
  onOpenEdit: jest.fn(),
  onOpenDelete: jest.fn(),
  onResume: jest.fn(),
  onFetchProcessingProgress: jest.fn(),
}

const campagna = {
  id: 'campagna-1',
  nome: 'Individuazione Rai',
  emittente_id: 'rai',
  campagne_programmazione_id: 'programmazione-1',
  anno: 2026,
  stato: 'completata' as const,
  created_at: '2026-06-23T10:00:00.000Z',
  emittenti: { nome: 'RAI' },
  statistiche: { individuazioni_create: 12, artisti_distinti: 3, opere_distinte: 4 },
}

describe('IndividuazioniTable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders campaign rows', () => {
    render(
      <IndividuazioniTable
        {...baseProps}
        campagne={[campagna as any]}
      />
    )

    expect(screen.getAllByText('Individuazione Rai').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/RAI/).length).toBeGreaterThan(0)
  })

  it('supports select-all and bulk export/delete actions', () => {
    const onSelectionChange = jest.fn()
    const onBulkExport = jest.fn()
    const onBulkDelete = jest.fn()
    const selectedIds = new Set(['campagna-1'])

    render(
      <IndividuazioniTable
        {...baseProps}
        campagne={[
          campagna as any,
          {
            ...campagna,
            id: 'campagna-2',
            nome: 'Individuazione Sky',
            campagne_programmazione_id: 'programmazione-2',
            statistiche: { individuazioni_create: 0 },
          } as any,
        ]}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        onBulkExport={onBulkExport}
        onBulkDelete={onBulkDelete}
      />
    )

    expect(screen.getByText(/1 selezionata/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Export XLSX/i }))
    expect(onBulkExport).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'campagna-1' }),
    ])

    fireEvent.click(screen.getByRole('button', { name: /Elimina/i }))
    expect(onBulkDelete).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'campagna-1' }),
    ])

    fireEvent.click(screen.getByRole('checkbox', { name: /Seleziona tutte/i }))
    expect(onSelectionChange).toHaveBeenCalled()
  })

  it('does not navigate when toggling a row checkbox', () => {
    const onOpenDetail = jest.fn()
    const onSelectionChange = jest.fn()

    render(
      <IndividuazioniTable
        {...baseProps}
        onOpenDetail={onOpenDetail}
        campagne={[campagna as any]}
        selectedIds={new Set()}
        onSelectionChange={onSelectionChange}
      />
    )

    fireEvent.click(screen.getAllByRole('checkbox', { name: /Seleziona Individuazione Rai/i })[0])
    expect(onSelectionChange).toHaveBeenCalled()
    expect(onOpenDetail).not.toHaveBeenCalled()
  })
})
