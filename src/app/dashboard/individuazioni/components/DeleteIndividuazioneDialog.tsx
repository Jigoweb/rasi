import { Info, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import type {
  CampagnaIndividuazione,
  DeleteCampagnaIndividuazioneInfo,
} from '@/features/individuazioni/services/individuazioni.service'

interface DeleteIndividuazioneDialogProps {
  open: boolean
  campagna: CampagnaIndividuazione | null
  deleteInfo: DeleteCampagnaIndividuazioneInfo | null
  isLoading: boolean
  isDeleting: boolean
  deleteProgress: { phase: string; deleted?: number; total?: number } | null
  onOpenChange: () => void
  onConfirm: () => void
}

export default function DeleteIndividuazioneDialog({
  open,
  campagna,
  deleteInfo,
  isLoading,
  isDeleting,
  deleteProgress,
  onOpenChange,
  onConfirm,
}: DeleteIndividuazioneDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Elimina Campagna Individuazione
          </DialogTitle>
          <DialogDescription>
            Conferma l&apos;eliminazione della campagna <span className="font-medium text-foreground">{campagna?.nome}</span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Verifica in corso...</p>
          </div>
        ) : deleteInfo ? (
          <div className="py-4 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-600">
                <Info className="h-5 w-5" />
                <p className="font-medium">Attenzione</p>
              </div>
              <p className="text-sm text-amber-700">
                Questa operazione eliminerà <strong>{deleteInfo.individuazioni_count.toLocaleString()}</strong> individuazioni associate alla campagna.
              </p>
            </div>

            <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Campagna Programmazione:</strong> {deleteInfo.campagne_programmazione_nome}
              </p>
              <p className="text-sm text-muted-foreground">
                La campagna programmazione tornerà allo stato &quot;In review&quot; e potrai eventualmente ricreare le individuazioni.
              </p>
            </div>

            {isDeleting && deleteProgress && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    {deleteProgress.phase === 'deleting_individuazioni' && 'Eliminazione individuazioni...'}
                    {deleteProgress.phase === 'updating_programmazione' && 'Aggiornamento campagna programmazione...'}
                    {deleteProgress.phase === 'deleting_campagna' && 'Eliminazione campagna...'}
                  </span>
                </div>
                {deleteProgress.phase === 'deleting_individuazioni' && deleteProgress.total && (
                  <div className="space-y-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-destructive transition-all"
                        style={{ width: `${((deleteProgress.deleted || 0) / deleteProgress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {(deleteProgress.deleted || 0).toLocaleString()} / {deleteProgress.total.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Errore nel caricamento delle informazioni
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onOpenChange} disabled={isDeleting}>
            Annulla
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading || isDeleting || !deleteInfo}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminazione...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Elimina Campagna
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
