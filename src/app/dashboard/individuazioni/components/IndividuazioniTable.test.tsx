import { render, screen } from '@testing-library/react'
import IndividuazioniTable from './IndividuazioniTable'

describe('IndividuazioniTable', () => {
  it('renders campaign rows', () => {
    render(
      <IndividuazioniTable
        campagne={[{
          id: 'campagna-1',
          nome: 'Individuazione Rai',
          emittente_id: 'rai',
          campagne_programmazione_id: 'programmazione-1',
          anno: 2026,
          stato: 'completata',
          created_at: '2026-06-23T10:00:00.000Z',
          emittenti: { nome: 'RAI' },
        } as any]}
        loading={false}
        searchTerm=""
        processingProgressMap={{}}
        loadingProgressMap={{}}
        resumingId={null}
        canStartProcess={() => true}
        onOpenDetail={jest.fn()}
        onOpenDelete={jest.fn()}
        onResume={jest.fn()}
        onFetchProcessingProgress={jest.fn()}
      />
    )

    expect(screen.getByText('Individuazione Rai')).toBeInTheDocument()
    expect(screen.getByText('RAI')).toBeInTheDocument()
  })
})
