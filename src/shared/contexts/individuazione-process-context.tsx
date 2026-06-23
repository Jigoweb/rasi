'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import {
  processCampagnaIndividuazioneBatch,
  BatchProcessingProgress,
  FinalizeCampagnaResponse,
  findActiveWorkerJob,
  pollWorkerJob,
  getWorkerUrl,
} from '@/features/campagne-individuazione/services/campagne-individuazione.service'
import {
  CampagnaProgrammazione,
  getCampagneProgrammazione,
  getCampagnaProgrammazioneById,
  getProcessingProgress,
  isProcessingStale,
  minutesSinceProcessingActivity,
} from '@/features/programmazioni/services/programmazioni.service'

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
  startProcess: (campagna: CampagnaProgrammazione, options?: StartProcessOptions) => Promise<FinalizeCampagnaResponse>
  minimize: () => void
  maximize: () => void
  reset: () => void
  canStartNewProcess: boolean
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
  const [state, setState] = useState<IndividuazioneProcessState>(initialState)
  const [interrupted, setInterrupted] = useState<InterruptedCampagna[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const reattachAbortRef = useRef<AbortController | null>(null)

  // Idratazione da server: trova i job rimasti "in_corso" e stale (es. sistema
  // chiuso a metà) così riemergono globalmente su ogni pagina, anche dopo
  // riavvio. È la verità persistente (DB), non lo stato di sessione.
  const refreshInterrupted = useCallback(async () => {
    try {
      const { data: campagne, error } = await getCampagneProgrammazione()
      if (error || !campagne) return
      const inCorso = campagne.filter(c => c.stato === 'in_corso')
      const results = await Promise.all(
        inCorso.map(async (c) => {
          const { data: progress } = await getProcessingProgress(c.id)
          // Stale = nessuna attività da >10min → processo orfano/interrotto.
          if (!isProcessingStale(progress)) return null
          return {
            id: c.id,
            nome: c.nome,
            programmazioni_totali: progress?.programmazioni_totali ?? 0,
            individuazioni_create: progress?.individuazioni_create ?? 0,
            minutesSinceActivity: minutesSinceProcessingActivity(progress),
          } as InterruptedCampagna
        })
      )
      setInterrupted(results.filter((r): r is InterruptedCampagna => r !== null))
    } catch {
      // best-effort: l'idratazione non deve mai rompere l'app
    }
  }, [])

  // Se conosciamo già la campagna corrente, cerca un job attivo scoped su
  // quella campagna. Senza id non facciamo più lookup globali.
  const reattachToActiveJob = useCallback(async () => {
    if (!getWorkerUrl()) return
    const campagneProgrammazioneId = state.campagna?.id
    if (!campagneProgrammazioneId || state.status !== 'idle') return

    try {
      const active = await findActiveWorkerJob(campagneProgrammazioneId)
      if (!active) return

      const { data: campagna } = await getCampagnaProgrammazioneById(active.campagneProgrammazioneId)

      setState({
        status: 'processing',
        campagna: campagna ?? ({ id: active.campagneProgrammazioneId, nome: 'Campagna' } as CampagnaProgrammazione),
        progress: null,
        result: null,
        isMinimized: true,
      })
      setInterrupted(prev => prev.filter(c => c.id !== active.campagneProgrammazioneId))

      const controller = new AbortController()
      reattachAbortRef.current = controller

      const result = await pollWorkerJob(
        active.jobId,
        (progress) => { setState(prev => ({ ...prev, progress })) },
        Date.now(),
        controller.signal
      )

      if (controller.signal.aborted) return

      reattachAbortRef.current = null

      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          status: 'completed',
          result: {
            success: true,
            stats: result.data!.statistiche,
            campagneIndividuazioneId: (result.data!.statistiche as any).campagne_individuazione_id,
          },
        }))
      } else {
        setState(prev => ({
          ...prev,
          status: 'error',
          result: { success: false, error: result.error || 'Errore job' },
        }))
      }

      refreshInterrupted()
    } catch {
      // best-effort: non rompere l'app
    }
  }, [refreshInterrupted, state.campagna?.id, state.status])

  useEffect(() => {
    reattachToActiveJob()
    refreshInterrupted()
  }, [reattachToActiveJob, refreshInterrupted])

  // Warning before unload during processing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.status === 'processing') {
        e.preventDefault()
        e.returnValue = 'Processo di individuazione in corso. Sei sicuro di voler uscire?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [state.status])

  const startProcess = useCallback(async (
    campagna: CampagnaProgrammazione,
    options?: StartProcessOptions
  ): Promise<FinalizeCampagnaResponse> => {
    // Annulla l'eventuale re-attach in corso per evitare loop di polling doppi
    reattachAbortRef.current?.abort()
    reattachAbortRef.current = null

    setState({
      status: 'processing',
      campagna,
      progress: null,
      result: null,
      isMinimized: false,
    })
    // Il job non è più "interrotto": è ripartito.
    setInterrupted(prev => prev.filter(c => c.id !== campagna.id))

    try {
      const result = await processCampagnaIndividuazioneBatch(
        campagna.id,
        (progress) => {
          setState(prev => ({
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
        setState(prev => ({
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
        setState(prev => ({
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

      setState(prev => ({
        ...prev,
        status: 'error',
        result: {
          success: false,
          error: errorMessage
        }
      }))

      return {
        success: false,
        error: errorMessage
      }
    }
  }, [])

  const minimize = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: true }))
  }, [])

  const maximize = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: false }))
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

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

  const canStartNewProcess = state.status === 'idle' || state.status === 'completed' || state.status === 'error'

  const visibleInterrupted = interrupted.filter(c => !dismissedIds.has(c.id))

  const value: IndividuazioneProcessContextValue = {
    state,
    startProcess,
    minimize,
    maximize,
    reset,
    canStartNewProcess,
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




