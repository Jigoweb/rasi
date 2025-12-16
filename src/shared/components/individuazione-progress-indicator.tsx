'use client'

import { useRouter } from 'next/navigation'
import { useIndividuazioneProcess } from '@/shared/contexts/individuazione-process-context'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { 
  Loader2, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Minimize2,
  X
} from 'lucide-react'

// ============================================
// FLOATING INDICATOR (minimized view)
// ============================================

export function FloatingProgressIndicator() {
  const { state, maximize, reset } = useIndividuazioneProcess()

  // Don't show if idle or not minimized
  if (state.status === 'idle' || !state.isMinimized) {
    return null
  }

  const progress = state.progress
  const percentage = progress && progress.programmazioni_totali > 0
    ? Math.round((progress.programmazioni_processate / progress.programmazioni_totali) * 100)
    : 0

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
          {state.status === 'processing' && (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          {state.status === 'completed' && (
            <CheckCircle className="h-5 w-5 text-green-600" />
          )}
          {state.status === 'error' && (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
        </div>

        {/* Content */}
        <div className="text-left">
          <p className="text-sm font-medium">
            {state.status === 'processing' && 'Individuazione in corso...'}
            {state.status === 'completed' && 'Individuazione completata'}
            {state.status === 'error' && 'Errore individuazione'}
          </p>
          <p className="text-xs text-muted-foreground">
            {state.campagna?.nome}
          </p>
        </div>

        {/* Progress bar (only during processing) */}
        {state.status === 'processing' && (
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

        {/* Close button for completed/error */}
        {(state.status === 'completed' || state.status === 'error') && (
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

export function IndividuazioneProgressDialog() {
  const router = useRouter()
  const { state, minimize, reset } = useIndividuazioneProcess()

  // Show dialog only when not idle and not minimized
  const isOpen = state.status !== 'idle' && !state.isMinimized

  // Don't render at all when idle to avoid any DOM pollution
  if (state.status === 'idle') {
    return null
  }

  const handleClose = () => {
    if (state.status === 'processing') {
      // During processing, minimize instead of closing
      minimize()
    } else {
      // After completion/error, reset
      reset()
    }
  }

  const progress = state.progress
  const percentage = progress && progress.programmazioni_totali > 0
    ? Math.round((progress.programmazioni_processate / progress.programmazioni_totali) * 100)
    : 0

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {state.status === 'completed' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : state.status === 'error' ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            {state.status === 'completed' 
              ? 'Individuazioni Completate' 
              : state.status === 'error'
                ? 'Errore Processamento'
                : 'Crea Individuazioni'
            }
          </DialogTitle>
          {state.status === 'processing' && (
            <DialogDescription>
              Questa operazione creerà le individuazioni per tutte le programmazioni della campagna <span className="font-medium text-foreground">{state.campagna?.nome}</span>.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Processing State */}
        {state.status === 'processing' && progress && (
          <div className="py-6 space-y-4">
            {/* Progress header */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {progress.phase === 'init' && 'Inizializzazione...'}
                  {progress.phase === 'processing' && 'Processamento in corso...'}
                  {progress.phase === 'finalizing' && 'Finalizzazione...'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {progress.phase === 'processing' && (
                    <>Chunk {progress.current_chunk}/{progress.total_chunks}</>
                  )}
                  {progress.phase === 'init' && 'Preparazione dati...'}
                  {progress.phase === 'finalizing' && 'Calcolo statistiche finali...'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">
                  {progress.programmazioni_processate.toLocaleString()}/{progress.programmazioni_totali.toLocaleString()}
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
                <span>
                  {(progress.programmazioni_totali - progress.programmazioni_processate).toLocaleString()} rimanenti
                </span>
              </div>
            </div>

            {/* Live stats */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">
                  {progress.individuazioni_create.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Individuazioni create</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">
                  {progress.current_chunk}/{progress.total_chunks}
                </p>
                <p className="text-xs text-muted-foreground">Chunk processati</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800 text-center">
                ⚠️ Non chiudere questa finestra. Il processo potrebbe richiedere diversi minuti.
              </p>
            </div>
          </div>
        )}

        {/* Completed State */}
        {state.status === 'completed' && state.result?.success && state.result.stats && (
          <div className="py-4 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium">
                Il processo di individuazione è stato completato con successo.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {(state.result.stats.individuazioni_create || 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Individuazioni create</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {(state.result.stats.programmazioni_con_match || 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Programmazioni con match</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {(state.result.stats.artisti_distinti || 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Artisti individuati</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {(state.result.stats.opere_distinte || 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Opere distinte</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <div className="flex justify-between">
                <span>Programmazioni totali:</span>
                <span>{(state.result.stats.programmazioni_totali || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Programmazioni processate:</span>
                <span>{(state.result.stats.programmazioni_processate || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Senza match:</span>
                <span>{(state.result.stats.programmazioni_senza_match || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Tempo processamento:</span>
                <span>{(() => {
                  const totalSeconds = (state.result.stats.tempo_processamento_ms || 0) / 1000
                  if (totalSeconds < 60) {
                    return `${totalSeconds.toFixed(1)} secondi`
                  } else if (totalSeconds < 3600) {
                    const minutes = Math.floor(totalSeconds / 60)
                    const seconds = Math.round(totalSeconds % 60)
                    return `${minutes} min${seconds > 0 ? ` ${seconds}s` : ''}`
                  } else {
                    const hours = Math.floor(totalSeconds / 3600)
                    const minutes = Math.round((totalSeconds % 3600) / 60)
                    return `${hours} or${hours === 1 ? 'a' : 'e'}${minutes > 0 ? ` ${minutes} min` : ''}`
                  }
                })()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {state.status === 'error' && (
          <div className="py-4 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-1">
                Si è verificato un errore durante il processamento.
              </p>
              <p className="text-xs text-red-600 font-mono">
                {state.result?.error}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {/* Processing - can minimize */}
          {state.status === 'processing' && (
            <Button variant="outline" onClick={minimize}>
              <Minimize2 className="mr-2 h-4 w-4" />
              Continua in background
            </Button>
          )}

          {/* Completed */}
          {state.status === 'completed' && (
            <>
              <Button variant="outline" onClick={reset}>
                Chiudi
              </Button>
              <Button onClick={() => {
                reset()
                router.push(`/dashboard/individuazioni/${state.result?.campagneIndividuazioneId}`)
              }}>
                <Eye className="mr-2 h-4 w-4" />
                Visualizza Individuazioni
              </Button>
            </>
          )}

          {/* Error */}
          {state.status === 'error' && (
            <Button variant="outline" onClick={reset}>
              Chiudi
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// PROCESS BLOCKED DIALOG
// ============================================

interface ProcessBlockedDialogProps {
  open: boolean
  onClose: () => void
}

export function ProcessBlockedDialog({ open, onClose }: ProcessBlockedDialogProps) {
  const { state, maximize } = useIndividuazioneProcess()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Processo già in corso
          </DialogTitle>
          <DialogDescription>
            Non puoi avviare un nuovo processo di individuazione mentre ce n&apos;è uno in corso.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Campagna in elaborazione:</p>
            <p className="text-sm text-muted-foreground">{state.campagna?.nome}</p>
            {state.progress && (
              <div className="pt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>
                    {Math.round((state.progress.programmazioni_processate / state.progress.programmazioni_totali) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ 
                      width: `${(state.progress.programmazioni_processate / state.progress.programmazioni_totali) * 100}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={() => {
            onClose()
            maximize()
          }}>
            <Eye className="mr-2 h-4 w-4" />
            Visualizza Progresso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

