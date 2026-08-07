import type { ChangeEvent, ReactNode, RefObject } from 'react'
import { CheckCircle, FileSpreadsheet, Loader2, XCircle } from 'lucide-react'
import type { CampagnaProgrammazione } from '@/features/programmazioni/services/programmazioni.service'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'

interface UploadProgrammazioniDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  step: number
  isResumingUpload: boolean
  detailsForm: ReactNode
  selectedCampagna: CampagnaProgrammazione | null
  selectedFile: File | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void
  isPreparingUpload: boolean
  isUploading: boolean
  parsedRowCount: number
  headerError: string | null
  uploadError: string | null
  onDismissUploadError: () => void
  uploadProgress: Record<string, { done: number; total: number }>
  isUploadReady: boolean
  onUploadDatabase: () => void
  onClose: () => void
}

function getDialogCopy(step: number, selectedCampagna: CampagnaProgrammazione | null) {
  if (step === 1) {
    return {
      title: 'Nuova Programmazione',
      description: 'Inserisci i dettagli per creare una nuova campagna di programmazione.',
    }
  }

  return {
    title: 'Caricamento dati',
    description: selectedCampagna
      ? `Carica il file Excel o CSV per la campagna ${selectedCampagna.nome}.`
      : 'Carica il file Excel o CSV con i dati della programmazione.',
  }
}

export default function UploadProgrammazioniDialog({
  open,
  onOpenChange,
  step,
  isResumingUpload,
  detailsForm,
  selectedCampagna,
  selectedFile,
  fileInputRef,
  onFileUpload,
  isPreparingUpload,
  isUploading,
  parsedRowCount,
  headerError,
  uploadError,
  onDismissUploadError,
  uploadProgress,
  isUploadReady,
  onUploadDatabase,
  onClose,
}: UploadProgrammazioniDialogProps) {
  const selectedProgress = selectedCampagna ? uploadProgress[selectedCampagna.id] : undefined
  const progressPercentage = selectedProgress
    ? Math.round((selectedProgress.done / selectedProgress.total) * 100)
    : 0
  const { title, description } = getDialogCopy(step, selectedCampagna)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {step === 1 && detailsForm}

        {step === 2 && (
          <div className="space-y-4">
            {!isResumingUpload && (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-sm text-emerald-900 dark:text-emerald-100">
                  Campagna creata. Seleziona il file per continuare.
                </p>
              </div>
            )}

            <div
              className="flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:bg-muted/40"
              onClick={() => { if (!isUploading) fileInputRef.current?.click() }}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={onFileUpload}
              />
              {!selectedFile ? (
                <>
                  <FileSpreadsheet className="mb-3 h-9 w-9 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Trascina il file qui oppure clicca per selezionarlo
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Formati supportati: CSV, Excel (.xlsx, .xls)
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground/80">
                    Colonne obbligatorie: titolo, emittente
                  </p>
                  <Button variant="outline" className="mt-4" disabled={isPreparingUpload}>
                    {isPreparingUpload ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Caricamento...
                      </>
                    ) : (
                      'Seleziona file'
                    )}
                  </Button>
                </>
              ) : (
                <div className="flex w-full max-w-full flex-col items-center gap-3">
                  <div className="flex w-full max-w-full items-center gap-3 overflow-hidden rounded-lg bg-muted/30 p-3">
                    <div className="shrink-0 rounded-lg bg-primary/10 p-2">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden text-left">
                      <p className="max-w-[200px] truncate text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click() }}
                      disabled={isPreparingUpload || isUploading}
                    >
                      Cambia
                    </Button>
                  </div>
                  {isPreparingUpload ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Analisi file in corso...</span>
                    </div>
                  ) : parsedRowCount > 0 ? (
                    <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {parsedRowCount.toLocaleString()} righe pronte
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {headerError && (
              <p className="text-sm text-destructive">{headerError}</p>
            )}

            {isUploading && selectedCampagna && selectedProgress && (
              <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Caricamento in corso</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedProgress.done.toLocaleString()} di {selectedProgress.total.toLocaleString()} record
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-primary">
                    {progressPercentage}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(100, progressPercentage)}%` }}
                  />
                </div>
              </div>
            )}

            {uploadError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 rounded-lg bg-destructive/10 p-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-destructive">Errore durante l&apos;upload</p>
                    <p className="mt-1 wrap-break-word text-sm text-muted-foreground">{uploadError}</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={onDismissUploadError}
                  >
                    Chiudi
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="outline" onClick={onClose}>
                {isResumingUpload ? 'Annulla' : 'Chiudi e completa dopo'}
              </Button>
              <Button disabled={!isUploadReady || isUploading} onClick={onUploadDatabase}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Upload in corso
                  </>
                ) : (
                  'Carica nel database'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
