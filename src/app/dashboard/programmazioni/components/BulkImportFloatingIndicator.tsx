'use client'

import { CheckCircle, Loader2, X, XCircle } from 'lucide-react'
import type { BulkImportStep, BulkImportSummary } from '../hooks/useProgrammazioniBulkImport'

interface BulkImportFloatingIndicatorProps {
  step: BulkImportStep
  summary: BulkImportSummary
  onMaximize: () => void
  onDismiss: () => void
}

export function BulkImportFloatingIndicator({
  step,
  summary,
  onMaximize,
  onDismiss,
}: BulkImportFloatingIndicatorProps) {
  if (step !== 'running' && step !== 'done') return null

  const processed = summary.completed + summary.failed
  const percentage = summary.total > 0 ? Math.round((processed / summary.total) * 100) : 0
  const isRunning = step === 'running'
  const hasFailures = summary.failed > 0

  return (
    <div
      className="fixed bottom-4 left-4 z-40 animate-in slide-in-from-bottom-4 fade-in duration-300 pointer-events-auto lg:left-[calc(16rem+1rem)]"
      aria-live="polite"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onMaximize}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onMaximize()
          }
        }}
        className="flex items-center gap-3 bg-background border rounded-lg shadow-lg px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group pointer-events-auto max-w-sm"
      >
        <div className="relative shrink-0">
          {isRunning && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          {!isRunning && !hasFailures && <CheckCircle className="h-5 w-5 text-green-600" />}
          {!isRunning && hasFailures && <XCircle className="h-5 w-5 text-destructive" />}
        </div>

        <div className="text-left min-w-0">
          <p className="text-sm font-medium">
            {isRunning && 'Import bulk in corso...'}
            {!isRunning && !hasFailures && 'Import bulk completato'}
            {!isRunning && hasFailures && 'Import bulk terminato con errori'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {processed} di {summary.total} file
            {summary.failed > 0 ? ` · ${summary.failed} falliti` : ''}
          </p>
        </div>

        {isRunning && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground w-8">
              {percentage}%
            </span>
          </div>
        )}

        {!isRunning && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onDismiss()
            }}
            className="ml-1 p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Chiudi notifica import bulk"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  )
}
