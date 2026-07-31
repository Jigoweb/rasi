import { useCallback, useMemo, useRef, useState } from 'react'
import {
  decideUploadPath,
  detectColumns,
  getMappingByEmittente,
  type ImportMappingConfig,
  type UploadDecision,
} from '@/features/programmazioni/services/import-mapping.service'
import {
  createCampagnaProgrammazione,
  updateCampagnaStatus,
  type CampagnaProgrammazione,
} from '@/features/programmazioni/services/programmazioni.service'
import {
  getUploadMappingSnapshot,
  pollUploadProgrammazioniJob,
  startUploadProgrammazioniJob,
  uploadProgrammazioniFileToStorage,
  type UploadMappingSnapshot,
} from '@/features/programmazioni/services/programmazioni-upload-worker.service'
import { suggestCampagnaNomeFromFilename } from '@/features/programmazioni/utils/bulk-import-naming'
import { classifyBulkColumnDiff, type BulkColumnClass } from '@/features/programmazioni/utils/bulk-import-classify'
import { runBulkImportQueue } from '@/features/programmazioni/utils/bulk-import-queue'

export type BulkImportStep = 'setup' | 'review' | 'running' | 'done'

export type BulkRowStatus =
  | 'pending_preview'
  | 'ok'
  | 'warning_safe'
  | 'error'
  | 'queued'
  | 'creating'
  | 'uploading'
  | 'completed'
  | 'failed'

export interface BulkImportRow {
  id: string
  file: File
  nome: string
  columnClass: BulkColumnClass | 'pending_preview'
  mappedRemoved: string[]
  detail: string | null
  campagnaId: string | null
  jobId: string | null
  runStatus: BulkRowStatus
  progressDone: number
  progressTotal: number
  error: string | null
}

export interface BulkImportSummary {
  total: number
  ok: number
  warningSafe: number
  error: number
  completed: number
  failed: number
}

function makeRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function makeInitialRow(file: File, anno: number): BulkImportRow {
  return {
    id: makeRowId(),
    file,
    nome: suggestCampagnaNomeFromFilename(file.name, anno),
    columnClass: 'pending_preview',
    mappedRemoved: [],
    detail: null,
    campagnaId: null,
    jobId: null,
    runStatus: 'pending_preview',
    progressDone: 0,
    progressTotal: 0,
    error: null,
  }
}

function buildPreviewDetail(
  columnClass: BulkColumnClass,
  decision: UploadDecision,
  mappedRemoved: string[],
): string | null {
  if (columnClass === 'ok') return null
  if (columnClass === 'warning_safe') {
    return mappedRemoved.length > 0
      ? `Colonne opzionali assenti: ${mappedRemoved.join(', ')}`
      : null
  }
  if (decision.kind === 'need_wizard') return 'Mapping non configurato per questa emittente'
  if (decision.kind === 'warn_format_changed') {
    return `Colonne mappate assenti: ${mappedRemoved.join(', ')}`
  }
  return 'Formato file non riconosciuto'
}

async function previewOneRow(
  file: File,
  emittenteId: string,
  mappingConfig: ImportMappingConfig | null,
): Promise<{ patch: Partial<BulkImportRow>; mappingSnapshot: UploadMappingSnapshot | null }> {
  try {
    const { columns } = await detectColumns(file)
    if (columns.length === 0) {
      const message = 'Nessuna colonna rilevata nel file'
      return {
        patch: { columnClass: 'error', runStatus: 'error', detail: message, error: message, mappedRemoved: [] },
        mappingSnapshot: null,
      }
    }

    const decision = await decideUploadPath(emittenteId, columns)
    const columnClass = classifyBulkColumnDiff(decision, mappingConfig)
    const mappedRemoved = decision.kind === 'warn_format_changed' ? decision.mappedRemoved : []
    const detail = buildPreviewDetail(columnClass, decision, mappedRemoved)

    return {
      patch: {
        columnClass,
        mappedRemoved,
        detail,
        runStatus: columnClass,
        error: columnClass === 'error' ? detail : null,
      },
      mappingSnapshot: getUploadMappingSnapshot(decision),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore lettura file'
    return {
      patch: { columnClass: 'error', runStatus: 'error', detail: message, error: message, mappedRemoved: [] },
      mappingSnapshot: null,
    }
  }
}

export function useProgrammazioniBulkImport() {
  const [emittenteId, setEmittenteId] = useState<string | null>(null)
  const [anno, setAnno] = useState<number | null>(null)
  const [step, setStep] = useState<BulkImportStep>('setup')
  const [confirmedSafeWarnings, setConfirmedSafeWarnings] = useState(false)
  const [rows, setRowsState] = useState<BulkImportRow[]>([])

  const rowsRef = useRef<BulkImportRow[]>([])
  const mappingSnapshotsRef = useRef<Map<string, UploadMappingSnapshot>>(new Map())

  const setRows = useCallback((updater: (prev: BulkImportRow[]) => BulkImportRow[]) => {
    setRowsState(prev => {
      const next = updater(prev)
      rowsRef.current = next
      return next
    })
  }, [])

  const updateRow = useCallback((id: string, patch: Partial<BulkImportRow>) => {
    setRows(prev => prev.map(row => (row.id === id ? { ...row, ...patch } : row)))
  }, [setRows])

  const addFiles = useCallback((files: File[]) => {
    const yearForName = anno ?? new Date().getFullYear()
    setRows(prev => [...prev, ...files.map(file => makeInitialRow(file, yearForName))])
  }, [anno, setRows])

  const updateNome = useCallback((id: string, nome: string) => {
    updateRow(id, { nome })
  }, [updateRow])

  const previewAll = useCallback(async () => {
    if (!emittenteId || rowsRef.current.length === 0) return

    setStep('review')
    const { data: mappingConfig } = await getMappingByEmittente(emittenteId)
    const targets = rowsRef.current

    await runBulkImportQueue(
      targets,
      async row => {
        const { patch, mappingSnapshot } = await previewOneRow(row.file, emittenteId, mappingConfig)
        if (mappingSnapshot) mappingSnapshotsRef.current.set(row.id, mappingSnapshot)
        updateRow(row.id, patch)
      },
      { concurrency: 3 },
    )
  }, [emittenteId, updateRow])

  const processRow = useCallback(async (id: string) => {
    const row = rowsRef.current.find(r => r.id === id)
    if (!row || !emittenteId || anno === null) return

    let campagnaId = row.campagnaId

    // Marks the row failed and, if a campagna was already created for it, flips its
    // DB status to 'error' so it doesn't stay stuck as 'uploading' (mirrors
    // useProgrammazioniUpload.ts's error path). No-op for pre-create failures since
    // there's no campagna yet to update.
    const failRow = async (message: string) => {
      updateRow(id, { runStatus: 'failed', error: message })
      if (campagnaId) {
        await updateCampagnaStatus(campagnaId, 'error')
      }
    }

    try {
      if (!campagnaId) {
        updateRow(id, { runStatus: 'creating', error: null })
        const { data, error } = await createCampagnaProgrammazione({
          emittente_id: emittenteId,
          anno,
          nome: row.nome.trim(),
        })
        const campagna = data as unknown as CampagnaProgrammazione | null
        if (error || !campagna?.id) {
          await failRow(error?.message || 'Errore creazione campagna')
          return
        }
        campagnaId = campagna.id
        updateRow(id, { campagnaId })
      }

      // Clears any previous error even on a retry where the campagna already exists.
      updateRow(id, { runStatus: 'uploading', error: null })
      await updateCampagnaStatus(campagnaId, 'uploading')

      const { storagePath, error: storageError } = await uploadProgrammazioniFileToStorage(row.file, campagnaId)
      if (storageError) {
        await failRow(storageError.message)
        return
      }

      const mappingSnapshot = mappingSnapshotsRef.current.get(id) ?? { kind: 'legacy_template' as const }
      const startResult = await startUploadProgrammazioniJob({
        campagneProgrammazioneId: campagnaId,
        emittenteId,
        storagePath,
        fileName: row.file.name,
        fileType: row.file.type || 'application/octet-stream',
        mappingSnapshot,
      })
      if (!startResult.success || !startResult.jobId) {
        await failRow(startResult.error || 'Errore avvio upload')
        return
      }
      updateRow(id, { jobId: startResult.jobId })

      const pollResult = await pollUploadProgrammazioniJob(startResult.jobId, job => {
        updateRow(id, {
          progressDone: job.righe_processate,
          progressTotal: Math.max(job.righe_totali, job.righe_processate, 1),
        })
      })

      if (!pollResult.success) {
        await failRow(pollResult.error || 'Upload terminato con errore')
        return
      }

      await updateCampagnaStatus(campagnaId, 'in_review')
      updateRow(id, { runStatus: 'completed', error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore import'
      await failRow(message)
    }
  }, [emittenteId, anno, updateRow])

  const hasSafeWarnings = useMemo(() => rows.some(row => row.columnClass === 'warning_safe'), [rows])

  const canStart = useMemo(() => {
    if (rows.length === 0 || !emittenteId || anno === null) return false
    return !rows.some(row => row.columnClass === 'pending_preview' || row.columnClass === 'error')
  }, [rows, emittenteId, anno])

  // Mirrors `confirmedSafeWarnings` state synchronously so `confirmSafeWarningsAndStart`
  // can confirm-then-run in a single call without waiting for a React re-render
  // (setState is async/batched, so reading the `confirmedSafeWarnings` state variable
  // right after calling its setter would see the stale pre-confirmation value).
  const confirmedSafeWarningsRef = useRef(false)

  const setConfirmed = useCallback((value: boolean) => {
    confirmedSafeWarningsRef.current = value
    setConfirmedSafeWarnings(value)
  }, [])

  const confirmSafeWarnings = useCallback(() => {
    setConfirmed(true)
  }, [setConfirmed])

  // Reads rows/eligibility fresh from `rowsRef` (not the memoized `canStart`/`hasSafeWarnings`)
  // so it can't no-op due to stale state either.
  const runImport = useCallback(async (confirmed: boolean) => {
    const currentRows = rowsRef.current
    if (currentRows.length === 0 || !emittenteId || anno === null) return
    if (currentRows.some(row => row.columnClass === 'pending_preview' || row.columnClass === 'error')) return

    const hasWarnings = currentRows.some(row => row.columnClass === 'warning_safe')
    if (hasWarnings && !confirmed) return

    const eligible = currentRows.filter(row => (
      row.columnClass === 'ok' || (row.columnClass === 'warning_safe' && confirmed)
    ))
    if (eligible.length === 0) return

    setStep('running')
    await runBulkImportQueue(eligible, row => processRow(row.id), { concurrency: 3 })
    setStep('done')
  }, [emittenteId, anno, processRow])

  const startImport = useCallback(async () => {
    await runImport(confirmedSafeWarningsRef.current)
  }, [runImport])

  // For Task 5: confirms the safe-warnings banner and starts the import in the same
  // user action, avoiding a second click that would otherwise be needed to work
  // around the stale-closure issue above.
  const confirmSafeWarningsAndStart = useCallback(async () => {
    setConfirmed(true)
    await runImport(true)
  }, [runImport, setConfirmed])

  const retryRow = useCallback(async (id: string) => {
    await processRow(id)
  }, [processRow])

  const reset = useCallback(() => {
    setEmittenteId(null)
    setAnno(null)
    setStep('setup')
    setConfirmed(false)
    mappingSnapshotsRef.current.clear()
    setRows(() => [])
  }, [setRows, setConfirmed])

  const summary = useMemo<BulkImportSummary>(() => {
    let ok = 0
    let warningSafe = 0
    let error = 0
    let completed = 0
    let failed = 0
    for (const row of rows) {
      if (row.columnClass === 'ok') ok += 1
      else if (row.columnClass === 'warning_safe') warningSafe += 1
      else if (row.columnClass === 'error') error += 1
      if (row.runStatus === 'completed') completed += 1
      if (row.runStatus === 'failed') failed += 1
    }
    return { total: rows.length, ok, warningSafe, error, completed, failed }
  }, [rows])

  return {
    step,
    setEmittenteId,
    setAnno,
    addFiles,
    updateNome,
    previewAll,
    canStart,
    hasSafeWarnings,
    confirmedSafeWarnings,
    confirmSafeWarnings,
    confirmSafeWarningsAndStart,
    startImport,
    retryRow,
    rows,
    summary,
    reset,
  }
}
