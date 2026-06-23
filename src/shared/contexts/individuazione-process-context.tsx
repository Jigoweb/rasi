'use client'

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react'
import {
  processCampagnaIndividuazioneBatch,
  BatchProcessingProgress,
  FinalizeCampagnaResponse,
} from '@/features/campagne-individuazione/services/campagne-individuazione.service'
import {
  CampagnaProgrammazione,
  getCampagneProgrammazione,
  getProcessingProgress,
  getLatestProcessingJobsForCampagne,
} from '@/features/programmazioni/services/programmazioni.service'
import { getLatestUploadJobsForCampagne } from '@/features/programmazioni/services/programmazioni-upload-worker.service'
import { createCoalescedOperationalSnapshotLoader } from '@/features/programmazioni/services/programmazioni-operational-snapshot.service'

// ============================================
// TYPES
// ============================================

export type ProcessStatus = 'idle' | 'processing' | 'completed' | 'error'

export interface IndividuazioneProcessState {
  status: ProcessStatus
  campagna: CampagnaProgrammazione | null
  progress: BatchProcessingProgress | null
  result: {
    success: boolean
    stats?: any
    error?: string
    error_code?: string  // 'LOCKED_BY_OTHER' if campaign is locked by another user
    locked_by?: string   // User ID who holds the lock
    locked_since?: string // When the lock was acquired
    campagneIndividuazioneId?: string
  } | null
  isMinimized: boolean
}

export interface StartProcessOptions {
  artistaIds?: string[] | null  // Filtro artisti opzionale
  descrizione?: string | null   // Descrizione pre-compilata dalla campagna programmazione
  resume?: boolean              // Riprende un processo interrotto (skip righe già processate)
}

/**
 * Job di individuazione rimasto "in_corso" e stale (es. sistema chiuso a metà),
 * idratato dal server al mount così riemerge proattivamente su ogni pagina.
 */
export interface InterruptedCampagna {
  id: string                       // campagne_programmazione_id
  nome: string
  programmazioni_totali: number
  individuazioni_create: number
  minutesSinceActivity: number | null
}

export interface IndividuazioneProcessContextValue {
  state: IndividuazioneProcessState
  processByCampagnaId: Record<string, IndividuazioneProcessState>
  activeProcesses: IndividuazioneProcessState[]
  startProcess: (campagna: CampagnaProgrammazione, options?: StartProcessOptions) => Promise<FinalizeCampagnaResponse>
  minimize: (campagneProgrammazioneId?: string) => void
  maximize: (campagneProgrammazioneId?: string) => void
  reset: (campagneProgrammazioneId?: string) => void
  canStartNewProcess: boolean
  canStartProcess: (campagneProgrammazioneId: string) => boolean
  isCampagnaProcessing: (campagneProgrammazioneId: string) => boolean
  /** Job interrotti (in_corso + stale) idratati dal server, mostrati globalmente. */
  interrupted: InterruptedCampagna[]
  /** Ricarica la lista dei job interrotti dal server. */
  refreshInterrupted: () => Promise<void>
  /** Riprende un job interrotto dato il suo campagne_programmazione_id. */
  resumeById: (campagneProgrammazioneId: string, nome?: string) => Promise<FinalizeCampagnaResponse>
  /** Nasconde una card "interrotto" senza riprenderla (solo lato UI). */
  dismissInterrupted: (campagneProgrammazioneId: string) => void
}

// ============================================
// CONTEXT
// ============================================

const IndividuazioneProcessContext = createContext<IndividuazioneProcessContextValue | null>(null)

// ============================================
// PROVIDER
// ============================================

const initialState: IndividuazioneProcessState = {
  status: 'idle',
  campagna: null,
  progress: null,
  result: null,
  isMinimized: false,
}

export function IndividuazioneProcessProvider({ children }: { children: ReactNode }) {
  const [processByCampagnaId, setProcessByCampagnaId] = useState<Record<string, IndividuazioneProcessState>>({})
  const [focusedCampagnaId, setFocusedCampagnaId] = useState<string | null>(null)
  const [interrupted, setInterrupted] = useState<InterruptedCampagna[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const operationalSnapshotLoaderRef = useRef(createCoalescedOperationalSnapshotLoader({
    workerMode: true,
    getCampagneProgrammazione,
    getLatestProcessingJobsForCampagne,
    getLatestUploadJobsForCampagne,
    getProcessingProgress,
  }))

  const activeProcesses = useMemo(
    () => Object.values(processByCampagnaId).filter(process => process.status === 'processing'),
    [processByCampagnaId]
  )

  const state = focusedCampagnaId
    ? processByCampagnaId[focusedCampagnaId] ?? initialState
    : initialState

  const updateProcessState = useCallback((
    campagneProgrammazioneId: string,
    updater: (prev: IndividuazioneProcessState) => IndividuazioneProcessState
  ) => {
    setProcessByCampagnaId(prev => ({
      ...prev,
      [campagneProgrammazioneId]: updater(prev[campagneProgrammazioneId] ?? initialState),
    }))
  }, [])

  // Idratazione da server: trova i job rimasti "in_corso" e stale (es. sistema
  // chiuso a metà) così riemergono globalmente su ogni pagina, anche dopo
  // riavvio. È la verità persistente (DB), non lo stato di sessione.
  const refreshInterrupted = useCallback(async () => {
    try {
      const snapshot = await operationalSnapshotLoaderRef.current.load()
      if (snapshot.error) return
      setInterrupted(snapshot.interrupted)
    } catch {
      // best-effort: l'idratazione non deve mai rompere l'app
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshInterrupted()
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [refreshInterrupted])

  // Warning before unload during processing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeProcesses.length > 0) {
        e.preventDefault()
        e.returnValue = 'Processo di individuazione in corso. Sei sicuro di voler uscire?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [activeProcesses.length])

  const startProcess = useCallback(async (
    campagna: CampagnaProgrammazione,
    options?: StartProcessOptions
  ): Promise<FinalizeCampagnaResponse> => {
    const existingProcess = processByCampagnaId[campagna.id]
    if (existingProcess?.status === 'processing') {
      return {
        success: false,
        error: 'Esiste già un job attivo per questa campagna',
      }
    }

    setFocusedCampagnaId(campagna.id)
    setProcessByCampagnaId(prev => ({
      ...prev,
      [campagna.id]: {
        status: 'processing',
        campagna,
        progress: null,
        result: null,
        isMinimized: false,
      },
    }))
    // Il job non è più "interrotto": è ripartito.
    setInterrupted(prev => prev.filter(c => c.id !== campagna.id))

    try {
      const result = await processCampagnaIndividuazioneBatch(
        campagna.id,
        (progress) => {
          updateProcessState(campagna.id, prev => ({
            ...prev,
            progress,
          }))
        },
        {
          chunkSize: 25,
          artistaIds: options?.artistaIds,  // Passa il filtro artisti
          descrizione: options?.descrizione || campagna.descrizione || undefined,  // Usa descrizione passata o quella della campagna
          resume: options?.resume,  // Riprende un processo interrotto
        }
      )

      if (result.success && result.data) {
        updateProcessState(campagna.id, prev => ({
          ...prev,
          status: 'completed',
          result: {
            success: true,
            stats: result.data?.statistiche,
            campagneIndividuazioneId: (result.data?.statistiche as any)?.campagne_individuazione_id
          }
        }))
      } else {
        // Check for lock error from init
        const anyResult = result as any
        updateProcessState(campagna.id, prev => ({
          ...prev,
          status: 'error',
          result: {
            success: false,
            error: anyResult.error || 'Errore sconosciuto',
            error_code: anyResult.error_code,
            locked_by: anyResult.locked_by,
            locked_since: anyResult.locked_since
          }
        }))
      }

      void refreshInterrupted()
      return result
    } catch (error: any) {
      // Estrai il messaggio di errore in modo più robusto
      let errorMessage = 'Errore inatteso'
      if (error?.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error?.error) {
        errorMessage = error.error
      } else if (typeof error === 'object') {
        errorMessage = JSON.stringify(error)
      }

      // Normalizza messaggi di errore comuni
      if (errorMessage.includes('schema cache') || errorMessage.includes('Could not query the database')) {
        errorMessage = 'Errore di connessione al database (schema cache). Il sistema sta tentando di riconnettersi automaticamente.'
      }

      updateProcessState(campagna.id, prev => ({
        ...prev,
        status: 'error',
        result: {
          success: false,
          error: errorMessage
        }
      }))

      void refreshInterrupted()
      return {
        success: false,
        error: errorMessage
      }
    }
  }, [processByCampagnaId, refreshInterrupted, updateProcessState])

  const minimize = useCallback((campagneProgrammazioneId?: string) => {
    const targetId = campagneProgrammazioneId ?? focusedCampagnaId
    if (!targetId) return
    updateProcessState(targetId, prev => ({ ...prev, isMinimized: true }))
  }, [focusedCampagnaId, updateProcessState])

  const maximize = useCallback((campagneProgrammazioneId?: string) => {
    const targetId = campagneProgrammazioneId ?? focusedCampagnaId
    if (!targetId) return
    setFocusedCampagnaId(targetId)
    updateProcessState(targetId, prev => ({ ...prev, isMinimized: false }))
  }, [focusedCampagnaId, updateProcessState])

  const reset = useCallback((campagneProgrammazioneId?: string) => {
    const targetId = campagneProgrammazioneId ?? focusedCampagnaId
    if (!targetId) return

    setProcessByCampagnaId(prev => {
      const next = { ...prev }
      delete next[targetId]
      return next
    })
    if (focusedCampagnaId === targetId) {
      setFocusedCampagnaId(null)
    }
  }, [focusedCampagnaId])

  const isCampagnaProcessing = useCallback((campagneProgrammazioneId: string) => (
    processByCampagnaId[campagneProgrammazioneId]?.status === 'processing'
  ), [processByCampagnaId])

  const canStartProcess = useCallback((campagneProgrammazioneId: string) => (
    !isCampagnaProcessing(campagneProgrammazioneId)
  ), [isCampagnaProcessing])

  // Riprende un job interrotto dato solo il suo campagne_programmazione_id.
  // Il resume route ha bisogno solo dell'id; nome è per il display.
  const resumeById = useCallback(async (
    campagneProgrammazioneId: string,
    nome?: string,
  ): Promise<FinalizeCampagnaResponse> => {
    const campagna = {
      id: campagneProgrammazioneId,
      nome: nome ?? 'Campagna',
      stato: 'in_corso',
    } as CampagnaProgrammazione
    const result = await startProcess(campagna, { resume: true })
    if (!result.success) {
      // resume fallito (es. lock di altro utente): risincronizza con il server
      refreshInterrupted()
    }
    return result
  }, [startProcess, refreshInterrupted])

  const dismissInterrupted = useCallback((campagneProgrammazioneId: string) => {
    setDismissedIds(prev => new Set(prev).add(campagneProgrammazioneId))
    setInterrupted(prev => prev.filter(c => c.id !== campagneProgrammazioneId))
  }, [])

  const canStartNewProcess = true

  const visibleInterrupted = interrupted.filter(c => !dismissedIds.has(c.id))

  const value: IndividuazioneProcessContextValue = {
    state,
    processByCampagnaId,
    activeProcesses,
    startProcess,
    minimize,
    maximize,
    reset,
    canStartNewProcess,
    canStartProcess,
    isCampagnaProcessing,
    interrupted: visibleInterrupted,
    refreshInterrupted,
    resumeById,
    dismissInterrupted,
  }

  return (
    <IndividuazioneProcessContext.Provider value={value}>
      {children}
    </IndividuazioneProcessContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export function useIndividuazioneProcess() {
  const context = useContext(IndividuazioneProcessContext)
  if (!context) {
    throw new Error('useIndividuazioneProcess must be used within IndividuazioneProcessProvider')
  }
  return context
}




