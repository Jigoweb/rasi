import { useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react'
import {
  applyMapping,
  buildLegacyPayload,
  decideUploadPath,
  detectColumns,
  readAllRows,
  saveMapping,
  type ColumnDiff,
  type ImportMappingConfig,
  type UploadDecision,
} from '@/features/programmazioni/services/import-mapping.service'
import {
  type CampagnaProgrammazione,
  type ProgrammazionePayload,
  updateCampagnaStatus,
  uploadProgrammazioni,
} from '@/features/programmazioni/services/programmazioni.service'
import {
  computeImportRowUid,
  getUploadMappingSnapshot,
  pollUploadProgrammazioniJob,
  startUploadProgrammazioniJob,
  type UploadJobSnapshot,
  uploadProgrammazioniFileToStorage,
} from '@/features/programmazioni/services/programmazioni-upload-worker.service'
import { getErrorMessage, notifyError } from '@/shared/lib/toast'
import { getIndividuazioneRuntimeMode } from '@/features/campagne-individuazione/services/campagne-individuazione.service'

type ImportRow = Record<string, unknown>
type UploadProgressMap = Record<string, { done: number; total: number }>

interface UseProgrammazioniUploadOptions {
  selectedCampagna: CampagnaProgrammazione | null
  updateCampagne: Dispatch<SetStateAction<CampagnaProgrammazione[]>>
  refreshCampagne: () => Promise<void> | void
  refreshEmittenti: () => Promise<void> | void
  closeModal: () => void
}

export function useProgrammazioniUpload({
  selectedCampagna,
  updateCampagne,
  refreshCampagne,
  refreshEmittenti,
  closeModal,
}: UseProgrammazioniUploadOptions) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadPollingJobsRef = useRef<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([])
  const [parsedRowCount, setParsedRowCount] = useState(0)
  const [parsedColumns, setParsedColumns] = useState<string[]>([])
  const [uploadDecision, setUploadDecision] = useState<UploadDecision | null>(null)
  const [headerError, setHeaderError] = useState<string | null>(null)
  const [isUploadReady, setIsUploadReady] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isPreparingUpload, setIsPreparingUpload] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgressMap>({})
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [mappingWizardOpen, setMappingWizardOpen] = useState(false)
  const [mappingWizardInitial, setMappingWizardInitial] = useState<ImportMappingConfig | null>(null)
  const [formatWarning, setFormatWarning] = useState<{
    mapping: ImportMappingConfig
    diff: ColumnDiff
    mappedRemoved: string[]
  } | null>(null)

  const resetUploadState = () => {
    setSelectedFile(null)
    setParsedRows([])
    setParsedRowCount(0)
    setParsedColumns([])
    setUploadDecision(null)
    setIsUploadReady(false)
    setHeaderError(null)
    setUploadError(null)
    setMappingWizardOpen(false)
    setMappingWizardInitial(null)
    setFormatWarning(null)
    setIsPreparingUpload(false)
  }

  const clearUploadProgress = (campagnaId: string) => {
    setUploadProgress(prev => {
      const next = { ...prev }
      delete next[campagnaId]
      return next
    })
  }

  const applyUploadJobSnapshot = (job: UploadJobSnapshot, fallbackTotal = 0) => {
    if (job.stato === 'completed') {
      updateCampagne(prev => prev.map(c => (
        c.id === job.campagna_programmazione_id ? { ...c, stato: 'in_review' } : c
      )))
      clearUploadProgress(job.campagna_programmazione_id)
      return
    }

    if (job.stato === 'error' || job.stato === 'cancelled') {
      const errorMessage = job.error || 'Upload programmazioni terminato con errore'
      updateCampagne(prev => prev.map(c => (
        c.id === job.campagna_programmazione_id
          ? { ...c, stato: 'error', last_error: errorMessage }
          : c
      )))
      clearUploadProgress(job.campagna_programmazione_id)
      return
    }

    const total = Math.max(
      job.righe_totali || 0,
      job.righe_processate || 0,
      fallbackTotal,
      1
    )
    setUploadProgress(prev => ({
      ...prev,
      [job.campagna_programmazione_id]: {
        done: job.righe_processate,
        total,
      },
    }))
  }

  const attachUploadJobPolling = (job: UploadJobSnapshot, fallbackTotal = 0) => {
    if (uploadPollingJobsRef.current.has(job.id)) return
    uploadPollingJobsRef.current.add(job.id)

    applyUploadJobSnapshot(job, fallbackTotal)

    void pollUploadProgrammazioniJob(job.id, (nextJob) => {
      applyUploadJobSnapshot(nextJob, fallbackTotal)
    }).then((result) => {
      uploadPollingJobsRef.current.delete(job.id)
      if (result.success && result.job) {
        applyUploadJobSnapshot(result.job, fallbackTotal)
        void refreshCampagne()
        return
      }

      if (result.job) {
        applyUploadJobSnapshot(result.job, fallbackTotal)
      } else {
        setUploadError(result.error || 'Errore polling upload programmazioni')
        clearUploadProgress(job.campagna_programmazione_id)
      }
    })
  }

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedCampagna) return

    setIsPreparingUpload(true)
    setSelectedFile(file)

    try {
      const workerMode = getIndividuazioneRuntimeMode() === 'worker'
      const { columns, preview } = await detectColumns(file)
      const rows = workerMode ? [] : await readAllRows(file)
      const rowCount = workerMode ? preview.length : rows.length

      if (rowCount === 0) {
        setHeaderError('Il file non contiene righe.')
        setParsedRows([])
        setParsedRowCount(0)
        setParsedColumns([])
        setUploadDecision(null)
        setIsUploadReady(false)
        return
      }

      setParsedRows(rows)
      setParsedRowCount(rowCount)
      setParsedColumns(columns)

      const decision = await decideUploadPath(selectedCampagna.emittente_id, columns)
      setUploadDecision(decision)

      if (decision.kind === 'need_wizard') {
        setHeaderError(null)
        setIsUploadReady(false)
        setMappingWizardInitial(null)
        setMappingWizardOpen(true)
      } else if (decision.kind === 'warn_format_changed') {
        setHeaderError(null)
        setIsUploadReady(false)
        setFormatWarning({
          mapping: decision.mapping,
          diff: decision.diff,
          mappedRemoved: decision.mappedRemoved,
        })
      } else {
        setHeaderError(null)
        setIsUploadReady(true)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      notifyError('Lettura file non riuscita', error)
    } finally {
      setIsPreparingUpload(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleWizardSave = async (config: ImportMappingConfig) => {
    if (!selectedCampagna) return
    const { error } = await saveMapping(selectedCampagna.emittente_id, config)
    if (error) throw new Error(error.message ?? 'Errore salvataggio mapping')
    setUploadDecision({ kind: 'apply_existing', mapping: config })
    setIsUploadReady(true)
    await refreshEmittenti()
    setMappingWizardOpen(false)
  }

  const proceedDespiteFormatChange = () => {
    if (!formatWarning) return
    setUploadDecision({ kind: 'apply_existing', mapping: formatWarning.mapping })
    setIsUploadReady(true)
    setFormatWarning(null)
  }

  const updateMappingFromWarning = () => {
    if (!formatWarning) return
    setMappingWizardInitial(formatWarning.mapping)
    setFormatWarning(null)
    setMappingWizardOpen(true)
  }

  const handleUploadDatabase = async () => {
    const workerMode = getIndividuazioneRuntimeMode() === 'worker'
    const campagna = selectedCampagna
    if (!campagna || !uploadDecision) return
    if (workerMode && !selectedFile) return
    if (!workerMode && parsedRows.length === 0) return

    setIsUploading(true)
    try {
      const file = selectedFile
      updateCampagne(prev => prev.map(c => c.id === campagna.id ? { ...c, stato: 'uploading' } : c))
      setUploadProgress(prev => ({
        ...prev,
        [campagna.id]: { done: 0, total: workerMode ? parsedRowCount : parsedRows.length },
      }))
      await updateCampagnaStatus(campagna.id, 'uploading')

      if (workerMode && file) {
        const { storagePath, error: storageError } = await uploadProgrammazioniFileToStorage(file, campagna.id)
        if (storageError) throw storageError

        const startResult = await startUploadProgrammazioniJob({
          campagneProgrammazioneId: campagna.id,
          emittenteId: campagna.emittente_id,
          storagePath,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          mappingSnapshot: getUploadMappingSnapshot(uploadDecision),
          chunkSize: 500,
        })
        if (!startResult.success || !startResult.jobId) {
          throw new Error(startResult.error || 'Errore avvio upload su Railway')
        }

        closeModal()
        setIsUploading(false)

        attachUploadJobPolling({
          id: startResult.jobId,
          campagna_programmazione_id: campagna.id,
          stato: 'queued',
          fase: 'queued',
          righe_totali: 0,
          righe_processate: 0,
          righe_inserite: 0,
          righe_duplicate_saltate: 0,
          current_chunk: 0,
          total_chunks: 0,
          error: null,
          quality_report: null,
        }, parsedRowCount)

        return
      }

      const ctx = {
        campagnaProgrammazioneId: campagna.id,
        emittenteId: campagna.emittente_id,
      }
      const buildAll = (rows: ImportRow[]): ProgrammazionePayload[] => {
        if (uploadDecision.kind === 'apply_existing') {
          return applyMapping(rows, uploadDecision.mapping.mapping, ctx, uploadDecision.mapping.rules, uploadDecision.mapping.transforms)
        }
        return buildLegacyPayload(rows, ctx)
      }
      const chunkSize = 500
      for (let i = 0; i < parsedRows.length; i += chunkSize) {
        const chunk = parsedRows.slice(i, i + chunkSize)
        const programmazioni = await Promise.all(
          buildAll(chunk).map(async (programmazione, index) => ({
            ...programmazione,
            import_row_uid: await computeImportRowUid(campagna.id, i + index + 1, chunk[index]),
          }))
        )
        const { error } = await uploadProgrammazioni(programmazioni)
        if (error) {
          const startRow = i + 2
          const endRow = Math.min(i + chunkSize, parsedRows.length) + 1
          throw new Error(`Errore nelle righe ${startRow}-${endRow}: ${error.message || JSON.stringify(error)}`)
        }
        setUploadProgress(prev => {
          const current = prev[campagna.id]
          const done = (current?.done || 0) + chunk.length
          return { ...prev, [campagna.id]: { done, total: parsedRows.length } }
        })
      }

      if (uploadDecision.kind === 'apply_existing' && parsedColumns.length > 0) {
        const updated: ImportMappingConfig = {
          ...uploadDecision.mapping,
          version: 1,
          colonne_rilevate: parsedColumns,
          ultimo_upload: new Date().toISOString(),
        }
        await saveMapping(campagna.emittente_id, updated).catch(err => {
          console.warn('Errore aggiornamento ultimo_upload mapping:', err)
        })
      }

      await updateCampagnaStatus(campagna.id, 'in_review')
      updateCampagne(prev => prev.map(c => c.id === campagna.id ? { ...c, stato: 'in_review' } : c))
      closeModal()
      clearUploadProgress(campagna.id)
      await refreshCampagne()
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      console.error('Error uploading database:', errorMessage, error)
      setUploadError(errorMessage)
      notifyError('Caricamento dati non riuscito', error)
      await updateCampagnaStatus(campagna.id, 'error')
      updateCampagne(prev => prev.map(c => (
        c.id === campagna.id ? { ...c, stato: 'error', last_error: errorMessage } : c
      )))
      clearUploadProgress(campagna.id)
    } finally {
      setIsUploading(false)
    }
  }

  return {
    fileInputRef,
    selectedFile,
    parsedRows,
    parsedRowCount,
    parsedColumns,
    uploadDecision,
    headerError,
    isUploadReady,
    isUploading,
    isPreparingUpload,
    uploadProgress,
    uploadError,
    mappingWizardOpen,
    mappingWizardInitial,
    formatWarning,
    setSelectedFile,
    setUploadError,
    setFormatWarning,
    setMappingWizardOpen,
    resetUploadState,
    clearUploadProgress,
    applyUploadJobSnapshot,
    attachUploadJobPolling,
    handleFileUpload,
    handleWizardSave,
    proceedDespiteFormatChange,
    updateMappingFromWarning,
    handleUploadDatabase,
  }
}
