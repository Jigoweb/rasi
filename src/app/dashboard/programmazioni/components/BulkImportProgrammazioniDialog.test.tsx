import { fireEvent, render, screen } from '@testing-library/react'
import BulkImportProgrammazioniDialog from './BulkImportProgrammazioniDialog'
import { useProgrammazioniBulkImport } from '../hooks/useProgrammazioniBulkImport'
import type { BulkImportRow } from '../hooks/useProgrammazioniBulkImport'

jest.mock('../hooks/useProgrammazioniBulkImport')

const mockUseBulkImport = useProgrammazioniBulkImport as jest.Mock

const emittenti = [
  { id: 'em-1', nome: 'Sky Uno' },
  { id: 'em-2', nome: 'Rai 1' },
]

function makeFile(name: string): File {
  return new File(['a,b\n1,2'], name, { type: 'text/csv' })
}

function makeRow(overrides: Partial<BulkImportRow>): BulkImportRow {
  return {
    id: overrides.id ?? `row-${Math.random()}`,
    file: makeFile('file.csv'),
    nome: 'Campagna Test',
    columnClass: 'ok',
    mappedRemoved: [],
    detail: null,
    campagnaId: null,
    jobId: null,
    runStatus: 'ok',
    progressDone: 0,
    progressTotal: 0,
    error: null,
    ...overrides,
  }
}

function baseHookState(overrides: Partial<ReturnType<typeof useProgrammazioniBulkImport>> = {}) {
  return {
    step: 'setup',
    setEmittenteId: jest.fn(),
    setAnno: jest.fn(),
    addFiles: jest.fn(),
    updateNome: jest.fn(),
    previewAll: jest.fn(),
    canStart: false,
    hasSafeWarnings: false,
    confirmedSafeWarnings: false,
    confirmSafeWarnings: jest.fn(),
    confirmSafeWarningsAndStart: jest.fn(),
    startImport: jest.fn(),
    retryRow: jest.fn(),
    retryFailedRows: jest.fn(),
    rows: [] as BulkImportRow[],
    summary: { total: 0, ok: 0, warningSafe: 0, error: 0, completed: 0, failed: 0 },
    reset: jest.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  mockUseBulkImport.mockReset()
})

describe('BulkImportProgrammazioniDialog', () => {
  it('renders dropzone accepting multiple files', () => {
    mockUseBulkImport.mockReturnValue(baseHookState())

    render(
      <BulkImportProgrammazioniDialog open onOpenChange={jest.fn()} emittenti={emittenti} />
    )

    const dropzone = screen.getByLabelText(/Area di caricamento/i)
    expect(dropzone).toBeInTheDocument()

    const fileInput = dropzone.querySelector('input[type="file"]')
    expect(fileInput).toHaveAttribute('multiple')
  })

  it('disables Avvia when any row is error', () => {
    mockUseBulkImport.mockReturnValue(baseHookState({
      step: 'review',
      canStart: false,
      rows: [
        makeRow({ id: 'r1', columnClass: 'ok', runStatus: 'ok' }),
        makeRow({ id: 'r2', columnClass: 'error', runStatus: 'error', detail: 'Mapping non configurato' }),
      ],
      summary: { total: 2, ok: 1, warningSafe: 0, error: 1, completed: 0, failed: 0 },
    }))

    render(
      <BulkImportProgrammazioniDialog open onOpenChange={jest.fn()} emittenti={emittenti} />
    )

    expect(screen.getByRole('button', { name: /Avvia/i })).toBeDisabled()
  })

  it('shows conferma unica when starting with warning_safe rows', () => {
    const confirmSafeWarningsAndStart = jest.fn()
    mockUseBulkImport.mockReturnValue(baseHookState({
      step: 'review',
      canStart: true,
      hasSafeWarnings: true,
      confirmedSafeWarnings: false,
      confirmSafeWarningsAndStart,
      rows: [
        makeRow({ id: 'r1', columnClass: 'ok', runStatus: 'ok' }),
        makeRow({ id: 'r2', columnClass: 'warning_safe', runStatus: 'warning_safe', detail: 'Colonne opzionali assenti: Numero Episodio' }),
      ],
      summary: { total: 2, ok: 1, warningSafe: 1, error: 0, completed: 0, failed: 0 },
    }))

    render(
      <BulkImportProgrammazioniDialog open onOpenChange={jest.fn()} emittenti={emittenti} />
    )

    fireEvent.click(screen.getByRole('button', { name: /^Avvia/i }))

    expect(screen.getByText(/colonne mappate assenti ma classificate come opzionali note/i)).toBeInTheDocument()

    const confirmButton = screen.getByRole('button', { name: /Procedi su tutti i warning safe/i })
    fireEvent.click(confirmButton)

    expect(confirmSafeWarningsAndStart).toHaveBeenCalledTimes(1)
  })

  it('does not show conferma when starting without warning_safe rows', () => {
    const startImport = jest.fn()
    mockUseBulkImport.mockReturnValue(baseHookState({
      step: 'review',
      canStart: true,
      hasSafeWarnings: false,
      startImport,
      rows: [makeRow({ id: 'r1', columnClass: 'ok', runStatus: 'ok' })],
      summary: { total: 1, ok: 1, warningSafe: 0, error: 0, completed: 0, failed: 0 },
    }))

    render(
      <BulkImportProgrammazioniDialog open onOpenChange={jest.fn()} emittenti={emittenti} />
    )

    fireEvent.click(screen.getByRole('button', { name: /^Avvia/i }))

    expect(screen.queryByText(/colonne mappate assenti ma classificate come opzionali note/i)).not.toBeInTheDocument()
    expect(startImport).toHaveBeenCalledTimes(1)
  })

  it('rifiuta un drop con formato non supportato nello step setup', () => {
    const addFiles = jest.fn()
    mockUseBulkImport.mockReturnValue(baseHookState({ addFiles }))

    render(
      <BulkImportProgrammazioniDialog open onOpenChange={jest.fn()} emittenti={emittenti} />
    )

    const dropzone = screen.getByLabelText(/Area di caricamento/i)
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [new File(['x'], 'note.txt', { type: 'text/plain' })] },
    })

    expect(addFiles).not.toHaveBeenCalled()
    expect(screen.getByText(/Formato non supportato/i)).toBeInTheDocument()
  })

  it('shows retry button for failed rows in the running step', async () => {
    const retryRow = jest.fn().mockResolvedValue(undefined)
    mockUseBulkImport.mockReturnValue(baseHookState({
      step: 'running',
      rows: [
        makeRow({ id: 'r1', columnClass: 'ok', runStatus: 'completed' }),
        makeRow({ id: 'r2', columnClass: 'ok', runStatus: 'failed', error: 'Errore upload' }),
      ],
      summary: { total: 2, ok: 2, warningSafe: 0, error: 0, completed: 1, failed: 1 },
      retryRow,
    }))

    render(
      <BulkImportProgrammazioniDialog open onOpenChange={jest.fn()} emittenti={emittenti} />
    )

    const retryButton = screen.getByRole('button', { name: /Riprova/i })
    fireEvent.click(retryButton)
    expect(retryRow).toHaveBeenCalledWith('r2')
    await screen.findByRole('button', { name: /Riprova/i })
  })

  it('hides dismiss controls while import is running', () => {
    const onOpenChange = jest.fn()
    const reset = jest.fn()
    mockUseBulkImport.mockReturnValue(baseHookState({
      step: 'running',
      reset,
      rows: [makeRow({ id: 'r1', runStatus: 'uploading' })],
      summary: { total: 1, ok: 1, warningSafe: 0, error: 0, completed: 0, failed: 0 },
    }))

    render(
      <BulkImportProgrammazioniDialog open onOpenChange={onOpenChange} emittenti={emittenti} />
    )

    expect(screen.queryByRole('button', { name: /^Close$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Annulla/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continua in background/i })).toBeInTheDocument()
    expect(reset).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('minimizes to floating toast and can reopen', () => {
    const onOpenChange = jest.fn()
    mockUseBulkImport.mockReturnValue(baseHookState({
      step: 'running',
      rows: [makeRow({ id: 'r1', runStatus: 'uploading' })],
      summary: { total: 3, ok: 3, warningSafe: 0, error: 0, completed: 1, failed: 0 },
    }))

    const { rerender } = render(
      <BulkImportProgrammazioniDialog open onOpenChange={onOpenChange} emittenti={emittenti} />
    )

    fireEvent.click(screen.getByRole('button', { name: /Continua in background/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)

    rerender(
      <BulkImportProgrammazioniDialog open={false} onOpenChange={onOpenChange} emittenti={emittenti} />
    )

    expect(screen.getByText(/Import bulk in corso/i)).toBeInTheDocument()
    expect(screen.getByText(/1 di 3 file/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText(/Import bulk in corso/i))
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('shows success summary in the done step without failures', () => {
    mockUseBulkImport.mockReturnValue(baseHookState({
      step: 'done',
      rows: [
        makeRow({ id: 'r1', runStatus: 'completed' }),
        makeRow({ id: 'r2', runStatus: 'completed' }),
      ],
      summary: { total: 2, ok: 2, warningSafe: 0, error: 0, completed: 2, failed: 0 },
    }))

    render(
      <BulkImportProgrammazioniDialog open onOpenChange={jest.fn()} emittenti={emittenti} />
    )

    expect(screen.getByText(/2 completate su 2/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Import completato/i).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /Riprova i/i })).not.toBeInTheDocument()
  })

  it('shows recovery UI with Riprova i N falliti when done has failures', async () => {
    const retryFailedRows = jest.fn().mockResolvedValue(undefined)
    mockUseBulkImport.mockReturnValue(baseHookState({
      step: 'done',
      rows: [
        makeRow({ id: 'r1', file: makeFile('ok.csv'), runStatus: 'completed' }),
        makeRow({
          id: 'r2',
          file: makeFile('fail.csv'),
          runStatus: 'failed',
          error: 'statement timeout',
        }),
      ],
      summary: { total: 2, ok: 2, warningSafe: 0, error: 0, completed: 1, failed: 1 },
      retryFailedRows,
    }))

    render(
      <BulkImportProgrammazioniDialog open onOpenChange={jest.fn()} emittenti={emittenti} />
    )

    expect(screen.getAllByText(/Import terminato con errori/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/1 completate su 2/i)).toBeInTheDocument()
    expect(screen.getByText('fail.csv')).toBeInTheDocument()
    expect(screen.queryByText('ok.csv')).not.toBeInTheDocument()
    expect(screen.getByText(/statement timeout/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Riprova i 1 falliti/i }))
    expect(retryFailedRows).toHaveBeenCalledTimes(1)
    await screen.findByRole('button', { name: /Riprova i 1 falliti/i })
  })

  it('allows per-row Riprova from the done recovery step', async () => {
    const retryRow = jest.fn().mockResolvedValue(undefined)
    mockUseBulkImport.mockReturnValue(baseHookState({
      step: 'done',
      rows: [
        makeRow({
          id: 'r2',
          file: makeFile('fail.csv'),
          runStatus: 'failed',
          error: 'statement timeout',
        }),
      ],
      summary: { total: 1, ok: 1, warningSafe: 0, error: 0, completed: 0, failed: 1 },
      retryRow,
    }))

    render(
      <BulkImportProgrammazioniDialog open onOpenChange={jest.fn()} emittenti={emittenti} />
    )

    fireEvent.click(screen.getByRole('button', { name: /^Riprova$/i }))
    expect(retryRow).toHaveBeenCalledWith('r2')
    await screen.findByRole('button', { name: /^Riprova$/i })
  })

  it('minimized toast with failures invites to manage and can reopen', () => {
    const onOpenChange = jest.fn()
    mockUseBulkImport.mockReturnValue(baseHookState({
      step: 'done',
      rows: [makeRow({ id: 'r1', runStatus: 'failed', error: 'boom' })],
      summary: { total: 1, ok: 1, warningSafe: 0, error: 0, completed: 0, failed: 1 },
    }))

    const { rerender } = render(
      <BulkImportProgrammazioniDialog open onOpenChange={onOpenChange} emittenti={emittenti} />
    )

    fireEvent.click(screen.getByRole('button', { name: /Continua in background/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)

    rerender(
      <BulkImportProgrammazioniDialog open={false} onOpenChange={onOpenChange} emittenti={emittenti} />
    )

    expect(screen.getByText(/Import bulk terminato con errori/i)).toBeInTheDocument()
    expect(screen.getByText(/Clicca per gestire/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText(/Import bulk terminato con errori/i))
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })
})
