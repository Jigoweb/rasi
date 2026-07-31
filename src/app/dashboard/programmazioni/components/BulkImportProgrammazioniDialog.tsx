'use client'

import { useCallback, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { AlertTriangle, CheckCircle, FileSpreadsheet, Loader2, RotateCcw, XCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { cn } from '@/shared/lib/utils'
import type { ImportMappingStatus } from '@/features/programmazioni/services/import-mapping.service'
import {
  useProgrammazioniBulkImport,
  type BulkImportRow,
  type BulkRowStatus,
} from '../hooks/useProgrammazioniBulkImport'

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls']
const SOFT_FILE_LIMIT = 150

function isAcceptedUploadFile(file: File): boolean {
  const lower = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some(ext => lower.endsWith(ext))
}

export interface BulkImportEmittenteOption {
  id: string
  nome: string
  /** Se assente, si assume che il chiamante abbia già filtrato la lista. */
  mappingStatus?: ImportMappingStatus
}

interface BulkImportProgrammazioniDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  emittenti: BulkImportEmittenteOption[]
  onImportComplete?: () => void
}

const STEP_TITLES: Record<string, string> = {
  setup: 'Import bulk programmazioni',
  review: 'Verifica file da importare',
  running: 'Import in corso',
  done: 'Import completato',
}

const STEP_DESCRIPTIONS: Record<string, string> = {
  setup: 'Seleziona emittente, anno e i file da importare in blocco.',
  review: 'Controlla il nome campagna e lo stato delle colonne per ogni file, poi avvia l\'import.',
  running: 'Le campagne vengono create e i file caricati in sequenza.',
  done: 'Riepilogo dell\'import.',
}

function ColumnStatusBadge({ columnClass }: { columnClass: BulkImportRow['columnClass'] }) {
  if (columnClass === 'pending_preview') {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Verifica
      </Badge>
    )
  }
  if (columnClass === 'ok') {
    return <Badge variant="secondary">OK</Badge>
  }
  if (columnClass === 'warning_safe') {
    return (
      <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700">
        Warning
      </Badge>
    )
  }
  return <Badge variant="destructive">Errore</Badge>
}

function RunStatusBadge({ status }: { status: BulkRowStatus }) {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Completato
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Fallito
        </Badge>
      )
    case 'creating':
    case 'uploading':
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {status === 'creating' ? 'Creazione campagna' : 'Caricamento'}
        </Badge>
      )
    case 'queued':
      return <Badge variant="outline">In coda</Badge>
    default:
      return <Badge variant="outline">In attesa</Badge>
  }
}

export default function BulkImportProgrammazioniDialog({
  open,
  onOpenChange,
  emittenti,
  onImportComplete,
}: BulkImportProgrammazioniDialogProps) {
  const {
    step,
    setEmittenteId,
    setAnno,
    addFiles,
    updateNome,
    previewAll,
    canStart,
    hasSafeWarnings,
    confirmedSafeWarnings,
    confirmSafeWarningsAndStart,
    startImport,
    retryRow,
    rows,
    summary,
    reset,
  } = useProgrammazioniBulkImport()

  const [emittenteValue, setEmittenteValue] = useState('')
  const [annoValue, setAnnoValue] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)
  const [showWarningConfirm, setShowWarningConfirm] = useState(false)
  const [isActionPending, setIsActionPending] = useState(false)
  const [retryingRowId, setRetryingRowId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const isRunning = step === 'running'

  const availableEmittenti = useMemo(
    () => emittenti.filter(e => e.mappingStatus == null || e.mappingStatus === 'configured'),
    [emittenti],
  )

  const handleEmittenteChange = useCallback((value: string) => {
    setEmittenteValue(value)
    setEmittenteId(value)
  }, [setEmittenteId])

  const handleAnnoChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value
    setAnnoValue(raw)
    const parsed = raw.trim() === '' ? null : Number(raw)
    setAnno(parsed !== null && Number.isFinite(parsed) ? parsed : null)
  }, [setAnno])

  const handleFilesAdded = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    const accepted = files.filter(isAcceptedUploadFile)
    const rejectedCount = files.length - accepted.length

    setDropError(rejectedCount > 0
      ? 'Formato non supportato. Usa CSV o Excel (.xlsx, .xls) per tutti i file.'
      : null)

    if (accepted.length > 0) {
      addFiles(accepted)
    }
  }, [addFiles])

  const dropDisabled = step !== 'setup'

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (dropDisabled) return
    setIsDragging(true)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (dropDisabled) return
    event.dataTransfer.dropEffect = 'copy'
    setIsDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
    if (dropDisabled) return

    const files = event.dataTransfer.files
    if (!files || files.length === 0) return
    handleFilesAdded(files)
  }

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFilesAdded(event.target.files)
    }
    event.target.value = ''
  }

  const handleCancel = useCallback(() => {
    if (isRunning || isActionPending) return
    reset()
    setEmittenteValue('')
    setAnnoValue('')
    setDropError(null)
    setIsActionPending(false)
    setRetryingRowId(null)
    onOpenChange(false)
  }, [reset, onOpenChange, isRunning, isActionPending])

  const canContinueToReview = Boolean(emittenteValue) && annoValue.trim() !== '' && rows.length > 0

  const handleContinue = useCallback(async () => {
    if (isActionPending) return
    setIsActionPending(true)
    try {
      await previewAll()
    } finally {
      setIsActionPending(false)
    }
  }, [previewAll, isActionPending])

  const handleAvviaClick = useCallback(async () => {
    if (isActionPending) return
    if (hasSafeWarnings && !confirmedSafeWarnings) {
      setShowWarningConfirm(true)
      return
    }
    setIsActionPending(true)
    try {
      await startImport()
    } finally {
      setIsActionPending(false)
    }
  }, [hasSafeWarnings, confirmedSafeWarnings, startImport, isActionPending])

  const handleConfirmWarnings = useCallback(async () => {
    if (isActionPending) return
    setShowWarningConfirm(false)
    setIsActionPending(true)
    try {
      await confirmSafeWarningsAndStart()
    } finally {
      setIsActionPending(false)
    }
  }, [confirmSafeWarningsAndStart, isActionPending])

  const handleRetryRow = useCallback(async (id: string) => {
    if (retryingRowId) return
    setRetryingRowId(id)
    try {
      await retryRow(id)
    } finally {
      setRetryingRowId(null)
    }
  }, [retryRow, retryingRowId])

  const handleDone = useCallback(() => {
    reset()
    setEmittenteValue('')
    setAnnoValue('')
    setDropError(null)
    setIsActionPending(false)
    setRetryingRowId(null)
    onImportComplete?.()
    onOpenChange(false)
  }, [reset, onImportComplete, onOpenChange])

  const runningProcessed = summary.completed + summary.failed
  const runningPercentage = summary.total > 0 ? Math.round((runningProcessed / summary.total) * 100) : 0

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) handleCancel()
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[85vh] overflow-y-auto"
          showCloseButton={!isRunning}
          onEscapeKeyDown={(event) => {
            if (isRunning || isActionPending) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (isRunning || isActionPending) event.preventDefault()
          }}
          onInteractOutside={(event) => {
            if (isRunning || isActionPending) event.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>{STEP_TITLES[step]}</DialogTitle>
            <DialogDescription>{STEP_DESCRIPTIONS[step]}</DialogDescription>
          </DialogHeader>

          {step === 'setup' && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="bulk-import-emittente">Emittente</label>
                  <Select value={emittenteValue} onValueChange={handleEmittenteChange}>
                    <SelectTrigger id="bulk-import-emittente" className="w-full">
                      <SelectValue placeholder="Seleziona emittente" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEmittenti.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableEmittenti.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nessuna emittente con mapping configurato. Configura il mapping prima di procedere.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="bulk-import-anno">Anno</label>
                  <Input
                    id="bulk-import-anno"
                    type="number"
                    value={annoValue}
                    onChange={handleAnnoChange}
                    placeholder="Es. 2015"
                  />
                </div>
              </div>

              <div
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                  dropDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-gray-50',
                  isDragging ? 'border-primary bg-primary/5' : 'border-gray-200',
                )}
                onClick={() => { if (!dropDisabled) fileInputRef.current?.click() }}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                aria-label="Area di caricamento file: clicca o trascina uno o più file"
              >
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInputChange}
                />
                <FileSpreadsheet className={cn('mb-4 h-10 w-10', isDragging ? 'text-primary' : 'text-gray-400')} />
                <p className="text-sm font-medium">
                  {isDragging ? 'Rilascia i file qui' : 'Trascina i file qui oppure clicca per selezionarli'}
                </p>
                <p className="mt-1 text-xs text-gray-500">Formati supportati: CSV, Excel (.xlsx, .xls) · selezione multipla</p>
                <Button variant="outline" className="mt-4" type="button">
                  Seleziona File
                </Button>
              </div>

              {dropError && (
                <div className="text-sm text-red-600">{dropError}</div>
              )}

              {rows.length > 0 && (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-sm font-medium">{rows.length} file selezionati</p>
                  <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {rows.map(row => (
                      <li key={row.id} className="truncate">{row.file.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {rows.length > SOFT_FILE_LIMIT && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Hai selezionato {rows.length} file, oltre il limite consigliato di {SOFT_FILE_LIMIT} per sessione.
                    Puoi procedere comunque oppure suddividere l&apos;import in più batch.
                  </span>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" disabled={isActionPending} onClick={handleCancel}>Annulla</Button>
                <Button disabled={!canContinueToReview || isActionPending} onClick={() => void handleContinue()}>
                  {isActionPending ? 'Verifica…' : 'Continua'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4 py-2">
              <div className="max-h-80 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Nome campagna</TableHead>
                      <TableHead>Colonne</TableHead>
                      <TableHead>Dettaglio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow key={row.id}>
                        <TableCell className="max-w-[140px] truncate" title={row.file.name}>
                          {row.file.name}
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            value={row.nome}
                            onChange={(event) => updateNome(row.id, event.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <ColumnStatusBadge columnClass={row.columnClass} />
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground" title={row.detail ?? undefined}>
                          {row.detail}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="text-sm text-muted-foreground">
                {summary.ok} ok · {summary.warningSafe} warning · {summary.error} errori · {summary.total} totali
              </p>

              <DialogFooter>
                <Button variant="outline" disabled={isActionPending} onClick={handleCancel}>Annulla</Button>
                <Button disabled={!canStart || isActionPending} onClick={() => void handleAvviaClick()}>
                  {isActionPending ? 'Avvio…' : 'Avvia import'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 'running' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2 text-center">
                <p className="text-sm text-muted-foreground">
                  Import in corso: {runningProcessed} di {summary.total}
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(100, runningPercentage)}%` }}
                  />
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Dettaglio</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow key={row.id}>
                        <TableCell className="max-w-[140px] truncate" title={row.file.name}>
                          {row.file.name}
                        </TableCell>
                        <TableCell>
                          <RunStatusBadge status={row.runStatus} />
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground" title={row.error ?? undefined}>
                          {row.error}
                        </TableCell>
                        <TableCell>
                          {row.runStatus === 'failed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={retryingRowId !== null}
                              onClick={() => void handleRetryRow(row.id)}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              {retryingRowId === row.id ? 'Riprovo…' : 'Riprova'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4 py-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">Import completato</h3>
                <p className="text-sm text-gray-500">
                  {summary.completed} completate su {summary.total} · {summary.failed} fallite
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleDone}>Resta sulla lista</Button>
                <Button onClick={handleDone}>Chiudi</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showWarningConfirm} onOpenChange={setShowWarningConfirm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conferma import con colonne opzionali assenti</DialogTitle>
            <DialogDescription>
              {summary.warningSafe} file hanno colonne mappate assenti ma classificate come opzionali note (es. Numero Episodio, Numero/Anno Stagione).
              Procedendo quei campi resteranno vuoti; il resto del mapping verrà applicato.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={isActionPending} onClick={() => setShowWarningConfirm(false)}>Annulla</Button>
            <Button disabled={isActionPending} onClick={() => void handleConfirmWarnings()}>
              {isActionPending ? 'Avvio…' : 'Procedi su tutti i warning safe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
