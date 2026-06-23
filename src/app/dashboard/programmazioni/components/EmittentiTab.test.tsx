import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import type { Emittente } from '../hooks/useProgrammazioniEmittenti'
import EmittentiTab from './EmittentiTab'

const emittente: Emittente = {
  id: 'emittente-1',
  codice: 'RAI1',
  nome: 'Rai 1',
  tipo: 'tv_generalista',
  paese: 'IT',
  attiva: true,
  configurazione: {},
  contatti: null,
  created_at: '2026-06-23T10:00:00.000Z',
  mapping_import: null,
  metadati: null,
  updated_at: null,
}

function renderTab(overrides: Partial<ComponentProps<typeof EmittentiTab>> = {}) {
  const props: ComponentProps<typeof EmittentiTab> = {
    emittenti: [emittente],
    loadingEmittenti: false,
    searchEmittentiQuery: '',
    debouncedSearchEmittentiQuery: '',
    filteredEmittenti: [emittente],
    selectedEmittente: null,
    showEmittenteDetails: false,
    showEmittenteForm: false,
    emittenteFormMode: 'create',
    emittenteFormData: {
      codice: 'EMT_2',
      nome: '',
      tipo: 'tv_generalista',
      paese: 'IT',
      attiva: true,
    },
    emittenteFormSaving: false,
    emittenteFormError: null,
    fetchEmittenti: jest.fn(),
    setSearchEmittentiQuery: jest.fn(),
    setShowEmittenteDetails: jest.fn(),
    setShowEmittenteForm: jest.fn(),
    setEmittenteFormData: jest.fn(),
    openCreateEmittente: jest.fn(),
    openEditEmittente: jest.fn(),
    handleSaveEmittente: jest.fn(),
    openManageEmittente: jest.fn(),
    ...overrides,
  }

  render(<EmittentiTab {...props} />)

  return props
}

describe('EmittentiTab', () => {
  it('renders emittente rows and counters', () => {
    renderTab()

    expect(screen.getAllByText('Rai 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RAI1').length).toBeGreaterThan(0)
    expect(screen.getByText('Mostrando 1 di 1 emittenti')).toBeInTheDocument()
  })

  it('delegates create and search actions', () => {
    const openCreateEmittente = jest.fn()
    const setSearchEmittentiQuery = jest.fn()
    renderTab({ openCreateEmittente, setSearchEmittentiQuery })

    fireEvent.click(screen.getByText('Nuova Emittente'))
    fireEvent.change(screen.getByPlaceholderText('Cerca per nome o codice emittente...'), {
      target: { value: 'rai' },
    })

    expect(openCreateEmittente).toHaveBeenCalled()
    expect(setSearchEmittentiQuery).toHaveBeenCalledWith('rai')
  })
})
