'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

// ============================================
// TYPES
// ============================================

export type ExportStatus = 'idle' | 'exporting' | 'completed' | 'error' | 'cancelled'

export interface ExportProgress {
  fetched: number
  total: number
  percentage: number
  phase: 'fetching' | 'formatting' | 'generating' | 'done'
  estimatedTimeRemaining?: number // in seconds
}

export interface ExportProcessState {
  status: ExportStatus
  campagnaId: string | null
  campagnaNome: string | null
  format: 'csv' | 'xlsx' | null
  progress: ExportProgress | null
  error: string | null
  isMinimized: boolean
  canCancel: boolean
}

export interface ExportProcessContextValue {
  state: ExportProcessState
  startExport: (campagnaId: string, campagnaNome: string, format: 'csv' | 'xlsx', exportFn: (onProgress: (progress: ExportProgress) => void, signal: AbortSignal) => Promise<void>) => Promise<void>
  cancelExport: () => void
  minimize: () => void
  maximize: () => void
  reset: () => void
}

// ============================================
// CONTEXT
// ============================================

const ExportProcessContext = createContext<ExportProcessContextValue | null>(null)

// ============================================
// PROVIDER
// ============================================

const initialState: ExportProcessState = {
  status: 'idle',
  campagnaId: null,
  campagnaNome: null,
  format: null,
  progress: null,
  error: null,
  isMinimized: false,
  canCancel: false,
}

export function ExportProcessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ExportProcessState>(initialState)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  // Warning before unload during export
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.status === 'exporting') {
        e.preventDefault()
        e.returnValue = 'Esportazione in corso. Sei sicuro di voler uscire?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [state.status])

  const startExport = useCallback(async (
    campagnaId: string,
    campagnaNome: string,
    format: 'csv' | 'xlsx',
    exportFn: (onProgress: (progress: ExportProgress) => void, signal: AbortSignal) => Promise<void>
  ) => {
    // Create abort controller for cancellation
    const controller = new AbortController()
    setAbortController(controller)

    // Set initial state
    setState({
      status: 'exporting',
      campagnaId,
      campagnaNome,
      format,
      progress: {
        fetched: 0,
        total: 0,
        percentage: 0,
        phase: 'fetching'
      },
      error: null,
      isMinimized: false,
      canCancel: true,
    })

    try {
      await exportFn(
        (progress) => {
          // Check if cancelled
          if (controller.signal.aborted) {
            return
          }

          setState(prev => ({
            ...prev,
            progress,
          }))
        },
        controller.signal
      )

      // Check if cancelled
      if (controller.signal.aborted) {
        setState(prev => ({
          ...prev,
          status: 'cancelled',
          canCancel: false,
        }))
        return
      }

      setState(prev => ({
        ...prev,
        status: 'completed',
        progress: prev.progress ? { ...prev.progress, percentage: 100, phase: 'done' } : null,
        canCancel: false,
      }))
    } catch (error: any) {
      // Check if cancelled
      if (controller.signal.aborted || error.name === 'AbortError') {
        setState(prev => ({
          ...prev,
          status: 'cancelled',
          canCancel: false,
        }))
        return
      }

      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null
        ? JSON.stringify(error)
        : String(error)

      setState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
        canCancel: false,
      }))
    } finally {
      setAbortController(null)
    }
  }, [])

  const cancelExport = useCallback(() => {
    if (abortController) {
      abortController.abort()
    }
    setState(prev => ({
      ...prev,
      status: 'cancelled',
      canCancel: false,
    }))
  }, [abortController])

  const minimize = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: true }))
  }, [])

  const maximize = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: false }))
  }, [])

  const reset = useCallback(() => {
    if (abortController) {
      abortController.abort()
    }
    setState(initialState)
    setAbortController(null)
  }, [abortController])

  const value: ExportProcessContextValue = {
    state,
    startExport,
    cancelExport,
    minimize,
    maximize,
    reset,
  }

  return (
    <ExportProcessContext.Provider value={value}>
      {children}
    </ExportProcessContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export function useExportProcess() {
  const context = useContext(ExportProcessContext)
  if (!context) {
    throw new Error('useExportProcess must be used within ExportProcessProvider')
  }
  return context
}






