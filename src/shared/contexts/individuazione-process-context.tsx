'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { 
  processCampagnaIndividuazioneBatch, 
  BatchProcessingProgress,
  FinalizeCampagnaResponse
} from '@/features/campagne-individuazione/services/campagne-individuazione.service'
import { CampagnaProgrammazione } from '@/features/programmazioni/services/programmazioni.service'

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
}

export interface IndividuazioneProcessContextValue {
  state: IndividuazioneProcessState
  startProcess: (campagna: CampagnaProgrammazione, options?: StartProcessOptions) => Promise<FinalizeCampagnaResponse>
  minimize: () => void
  maximize: () => void
  reset: () => void
  canStartNewProcess: boolean
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
    // Set initial state
    setState({
      status: 'processing',
      campagna,
      progress: null,
      result: null,
      isMinimized: false,
    })

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
      setState(prev => ({
        ...prev,
        status: 'error',
        result: {
          success: false,
          error: error.message || 'Errore inatteso'
        }
      }))

      return {
        success: false,
        error: error.message || 'Errore inatteso'
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

  const canStartNewProcess = state.status === 'idle' || state.status === 'completed' || state.status === 'error'

  const value: IndividuazioneProcessContextValue = {
    state,
    startProcess,
    minimize,
    maximize,
    reset,
    canStartNewProcess,
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




