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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'Nuova Programmazione' : 'Caricamento Dati'}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Inserisci i dettagli per creare una nuova campagna di programmazione.'
              : 'Carica il file con i dati della programmazione.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && detailsForm}

        {step === 2 && (
          <div className="space-y-6 py-4">
            {!isResumingUpload ? (
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg">Campagna creata con successo!</h3>
                <p className="text-sm text-gray-500">
                  Ora puoi procedere con il caricamento del file Excel o CSV contenente i dati della programmazione.
                </p>
              </div>
            ) : (
              <div className="text-center space-y-2 mb-6">
                <h3 className="font-semibold text-lg">Caricamento Dati</h3>
                <p className="text-sm text-gray-500">
                  Carica il file per la campagna <span className="font-medium text-gray-900">{selectedCampagna?.nome}</span>
                </p>
              </div>
            )}

            <div
              className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer overflow-hidden"
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
                  <FileSpreadsheet className="h-10 w-10 text-gray-400 mb-4" />
                  <p className="text-sm font-medium">Clicca per selezionare il file</p>
                  <p className="text-xs text-gray-500 mt-1">Formati supportati: CSV, Excel (.xlsx, .xls)</p>
                  <p className="text-xs text-gray-400 mt-1">Colonne obbligatorie: titolo, emittente</p>
                  <Button variant="outline" className="mt-4" disabled={isPreparingUpload}>
                    {isPreparingUpload ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Caricamento...
                      </>
                    ) : (
                      'Seleziona File'
                    )}
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 w-full max-w-full">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg w-full max-w-full overflow-hidden">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left overflow-hidden">
                      <p className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</p>
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
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {parsedRowCount.toLocaleString()} righe pronte
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {headerError && (
              <div className="mt-3 text-sm text-red-600">{headerError}</div>
            )}

            {isUploading && selectedCampagna && selectedProgress && (
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
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
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(100, progressPercentage)}%` }}
                  />
                </div>
              </div>
            )}

            {uploadError && (
              <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-destructive/10 rounded-lg shrink-0">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-destructive">Errore durante l&apos;upload</p>
                    <p className="text-sm text-muted-foreground mt-1 wrap-break-word">{uploadError}</p>
                  </div>
                </div>
                <div className="flex justify-end mt-3">
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

            <div className="flex justify-end">
              <Button className="mt-4" disabled={!isUploadReady || isUploading} onClick={onUploadDatabase}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Upload in corso
                  </>
                ) : (
                  'Upload dati database'
                )}
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                {isResumingUpload ? 'Annulla' : 'Chiudi e completa dopo'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
