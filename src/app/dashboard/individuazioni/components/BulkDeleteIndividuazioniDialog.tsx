'use client'

import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import type { BulkDeleteIndividuazioneItem } from '../hooks/useIndividuazioniDelete'

interface BulkDeleteIndividuazioniDialogProps {
  open: boolean
  items: BulkDeleteIndividuazioneItem[]
  isLoading: boolean
  isDeleting: boolean
  progress: { current: number; total: number; campagnaNome: string } | null
  onOpenChange: () => void
  onConfirm: () => void
}

export default function BulkDeleteIndividuazioniDialog({
  open,
  items,
  isLoading,
  isDeleting,
  progress,
  onOpenChange,
  onConfirm,
}: BulkDeleteIndividuazioniDialogProps) {
  const deletableCount = items.filter(item => item.info && !item.error).length
  const totalIndividuazioni = items.reduce(
    (sum, item) => sum + (item.info?.individuazioni_count || 0),
    0
  )

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onOpenChange() }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Elimina individuazioni
          </DialogTitle>
          <DialogDescription>
            Stai per eliminare {items.length} campagne di individuazione selezionate.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Verifica in corso...</p>
          </div>
        ) : (
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Verranno eliminate complessivamente{' '}
              <strong className="text-foreground">{totalIndividuazioni.toLocaleString('it-IT')}</strong>{' '}
              individuazioni.
            </p>
            {items.map((item) => (
              <div
                key={item.campagna.id}
                className={`rounded-lg border p-3 ${item.error ? 'border-red-200 bg-red-50' : 'bg-muted/40'}`}
              >
                <p className="text-sm font-medium">{item.campagna.nome}</p>
                {item.error && (
                  <p className="mt-1 text-xs text-red-600">{item.error}</p>
                )}
                {!item.error && item.info && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.info.individuazioni_count.toLocaleString('it-IT')} individuazioni
                    {item.info.campagne_programmazione_nome
                      ? ` · ${item.info.campagne_programmazione_nome}`
                      : ''}
                  </p>
                )}
              </div>
            ))}

            {isDeleting && progress && (
              <div className="space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Eliminazione {progress.current}/{progress.total}: {progress.campagnaNome}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onOpenChange} disabled={isDeleting}>
            Annulla
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading || isDeleting || deletableCount === 0}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminazione...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Elimina {deletableCount > 0 ? `(${deletableCount})` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
