'use client'

import { useState } from 'react'
import { useExportProcess } from '@/shared/contexts/export-process-context'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { 
  Loader2, 
  Download, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Minimize2,
  X,
  AlertTriangle
} from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'

// ============================================
// FLOATING INDICATOR (minimized view)
// ============================================

export function FloatingExportIndicator() {
  const { state, maximize, reset, cancelExport } = useExportProcess()

  // Don't show if idle or not minimized
  if (state.status === 'idle' || !state.isMinimized) {
    return null
  }

  const progress = state.progress
  const percentage = progress ? progress.percentage : 0

  const formatTime = (seconds?: number) => {
    if (!seconds) return ''
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <div 
      className="fixed bottom-4 right-4 z-40 animate-in slide-in-from-bottom-4 fade-in duration-300 pointer-events-auto"
    >
      <div
        onClick={maximize}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && maximize()}
        className="flex items-center gap-3 bg-background border rounded-lg shadow-lg px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group pointer-events-auto"
      >
        {/* Icon */}
        <div className="relative">
          {state.status === 'exporting' && (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          {state.status === 'completed' && (
            <CheckCircle className="h-5 w-5 text-green-600" />
          )}
          {(state.status === 'error' || state.status === 'cancelled') && (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
        </div>

        {/* Content */}
        <div className="text-left">
          <p className="text-sm font-medium">
            {state.status === 'exporting' && 'Esportazione in corso...'}
            {state.status === 'completed' && 'Esportazione completata'}
            {state.status === 'error' && 'Errore esportazione'}
            {state.status === 'cancelled' && 'Esportazione annullata'}
          </p>
          <p className="text-xs text-muted-foreground">
            {state.campagnaNome}
          </p>
        </div>

        {/* Progress bar (only during exporting) */}
        {state.status === 'exporting' && progress && (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground w-8">
              {percentage}%
            </span>
          </div>
        )}

        {/* Close button for completed/error/cancelled */}
        {(state.status === 'completed' || state.status === 'error' || state.status === 'cancelled') && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              reset()
            }}
            className="ml-2 p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================
// EXPANDED DIALOG
// ============================================

export function ExportProgressDialog() {
  const { state, minimize, reset, cancelExport } = useExportProcess()
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  // Show dialog only when not idle and not minimized
  const isOpen = state.status !== 'idle' && !state.isMinimized

  // Don't render at all when idle to avoid any DOM pollution
  if (state.status === 'idle') {
    return null
  }

  const handleClose = () => {
    if (state.status === 'exporting') {
      // During export, minimize instead of closing
      minimize()
    } else {
      // After completion/error/cancelled, reset
      reset()
    }
  }

  const progress = state.progress
  const percentage = progress ? progress.percentage : 0

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'Calcolo...'
    if (seconds < 60) return `~${seconds} secondi`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (secs === 0) return `~${mins} minuto${mins > 1 ? 'i' : ''}`
    return `~${mins}m ${secs}s`
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {state.status === 'exporting' && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Esportazione in corso
                </>
              )}
              {state.status === 'completed' && (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Esportazione completata
                </>
              )}
              {state.status === 'error' && (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Errore esportazione
                </>
              )}
              {state.status === 'cancelled' && (
                <>
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  Esportazione annullata
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {state.campagnaNome && (
                <span className="font-medium">{state.campagnaNome}</span>
              )}
              {state.format && (
                <span className="ml-2">• {state.format.toUpperCase()}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {state.status === 'exporting' && progress && (
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {progress.phase === 'fetching' && 'Caricamento dati...'}
                    {progress.phase === 'formatting' && 'Formattazione dati...'}
                    {progress.phase === 'generating' && 'Generazione file...'}
                    {progress.phase === 'done' && 'Completato'}
                  </span>
                  <span className="font-medium">
                    {progress.fetched.toLocaleString()}/{progress.total.toLocaleString()}
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{percentage}% completato</span>
                  {progress.estimatedTimeRemaining && (
                    <span>Tempo stimato: {formatTime(progress.estimatedTimeRemaining)}</span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-sm text-muted-foreground">
                  {progress.total - progress.fetched > 0 && (
                    <>{(progress.total - progress.fetched).toLocaleString()} record rimanenti</>
                  )}
                </p>
              </div>
            </div>
          )}

          {state.status === 'completed' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-900">
                  File esportato con successo!
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Il download dovrebbe essere iniziato automaticamente.
                </p>
              </div>
            </div>
          )}

          {state.status === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900 mb-1">
                      Errore durante l'esportazione
                    </p>
                    <p className="text-xs text-red-700 font-mono break-all">
                      {state.error}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {state.status === 'cancelled' && (
            <div className="space-y-4">
              <div className="bg-muted/50 border rounded-lg p-4 text-center">
                <XCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">
                  Esportazione annullata
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            {state.status === 'exporting' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => minimize()}
                >
                  <Minimize2 className="h-4 w-4 mr-2" />
                  Minimizza
                </Button>
                {state.canCancel && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    Annulla
                  </Button>
                )}
              </>
            )}
            {(state.status === 'completed' || state.status === 'error' || state.status === 'cancelled') && (
              <Button onClick={reset}>
                Chiudi
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annullare l'esportazione?</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler annullare l'esportazione? I dati caricati finora verranno persi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, continua</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCancelDialog(false)
                cancelExport()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sì, annulla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

