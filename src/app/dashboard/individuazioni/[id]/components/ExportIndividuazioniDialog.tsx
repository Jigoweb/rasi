import { FileSpreadsheet, FileText } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import type { CampagnaIndividuazione } from '@/features/individuazioni/services/individuazioni.service'

interface ExportIndividuazioniDialogProps {
  campagna: CampagnaIndividuazione
  exportDialogOpen: boolean
  timeEstimateDialogOpen: boolean
  selectedFormat: 'csv' | 'xlsx' | null
  estimatedTime: number | null
  onExportDialogOpenChange: (open: boolean) => void
  onTimeEstimateDialogOpenChange: (open: boolean) => void
  onFormatSelect: (format: 'csv' | 'xlsx') => void
  onConfirmExport: () => void
}

export default function ExportIndividuazioniDialog({
  campagna,
  exportDialogOpen,
  timeEstimateDialogOpen,
  selectedFormat,
  estimatedTime,
  onExportDialogOpenChange,
  onTimeEstimateDialogOpenChange,
  onFormatSelect,
  onConfirmExport,
}: ExportIndividuazioniDialogProps) {
  return (
    <>
      <Dialog open={exportDialogOpen} onOpenChange={onExportDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Esporta Individuazioni</DialogTitle>
            <DialogDescription>
              Scegli il formato di esportazione per le individuazioni di &quot;{campagna.nome}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => onFormatSelect('csv')}>
              <FileText className="h-8 w-8" />
              <span>CSV</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => onFormatSelect('xlsx')}>
              <FileSpreadsheet className="h-8 w-8" />
              <span>Excel</span>
            </Button>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Il file conterrà tutte le {formatNumber(campagna.statistiche?.individuazioni_create || 0)} individuazioni della campagna
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={timeEstimateDialogOpen} onOpenChange={onTimeEstimateDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Esportazione</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-muted-foreground">
              Stai per esportare <strong>{formatNumber(campagna.statistiche?.individuazioni_create || 0)}</strong> individuazioni in formato <strong>{selectedFormat?.toUpperCase()}</strong>.
            </p>
            {estimatedTime !== null && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium mb-1">Tempo stimato:</p>
                <p className="text-lg font-semibold text-primary">{formatEstimatedTime(estimatedTime)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Il processo può essere minimizzato e continuerà in background.
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">Vuoi procedere con l&apos;esportazione?</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmExport}>Conferma Esportazione</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function formatNumber(num: number | undefined) {
  return (num || 0).toLocaleString('it-IT')
}

function formatEstimatedTime(seconds: number) {
  if (seconds < 60) return `~${seconds} secondi`
  const minutes = Math.floor(seconds / 60)
  return `~${minutes} ${minutes === 1 ? 'minuto' : 'minuti'}`
}
