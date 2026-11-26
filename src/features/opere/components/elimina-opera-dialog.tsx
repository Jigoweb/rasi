'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  deleteIndividuazioniByOperaId,
  deleteOpera,
  getIndividuazioniByOperaId,
  getPartecipazioniCountByOperaId,
} from '@/features/opere/services/opere.service'
import { notifyError, notifySuccess } from '@/shared/lib/toast'

export interface EliminaOperaTarget {
  id: string
  titolo?: string | null
}

interface EliminaOperaDialogProps {
  opera: EliminaOperaTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: (operaId: string) => void | Promise<void>
}

type CheckState = 'checking' | 'ready' | 'error'

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

export function EliminaOperaDialog({ opera, open, onOpenChange, onDeleted }: EliminaOperaDialogProps) {
  const [checkState, setCheckState] = useState<CheckState>('checking')
  const [partecipazioniCount, setPartecipazioniCount] = useState(0)
  const [individuazioniCount, setIndividuazioniCount] = useState(0)
  const [confermaPartecipazioni, setConfermaPartecipazioni] = useState(false)
  const [deleteIndividuazioniToo, setDeleteIndividuazioniToo] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !opera) return
    let cancelled = false
    setCheckState('checking')
    setErrorMessage(null)
    setConfermaPartecipazioni(false)
    setDeleteIndividuazioniToo(false)

    void Promise.all([
      getPartecipazioniCountByOperaId(opera.id),
      getIndividuazioniByOperaId(opera.id),
    ]).then(([partecipazioni, individuazioni]) => {
      if (cancelled) return
      if (partecipazioni.error) {
        setCheckState('error')
        setErrorMessage('Impossibile verificare le partecipazioni dell’opera.')
        return
      }
      setPartecipazioniCount(partecipazioni.count)
      setIndividuazioniCount(individuazioni.error ? 0 : individuazioni.data?.length ?? 0)
      setCheckState('ready')
    })

    return () => {
      cancelled = true
    }
  }, [open, opera])

  async function handleDelete() {
    if (!opera) return
    setIsDeleting(true)
    setErrorMessage(null)
    try {
      if (deleteIndividuazioniToo && individuazioniCount > 0) {
        const { error } = await deleteIndividuazioniByOperaId(opera.id)
        if (error) {
          setErrorMessage('Eliminazione delle individuazioni collegate non riuscita.')
          notifyError('Eliminazione individuazioni collegate non riuscita', error)
          return
        }
      }

      const { error } = await deleteOpera(opera.id)
      if (error) {
        setErrorMessage(error.message || 'Eliminazione opera non riuscita.')
        notifyError('Eliminazione opera non riuscita', error)
        return
      }

      notifySuccess('Opera eliminata')
      onOpenChange(false)
      await onDeleted?.(opera.id)
    } finally {
      setIsDeleting(false)
    }
  }

  const needsPartecipazioniConfirm = partecipazioniCount > 0
  const canDelete = checkState === 'ready' && (!needsPartecipazioniConfirm || confermaPartecipazioni)

  return (
    <Dialog open={open} onOpenChange={value => { if (!isDeleting) onOpenChange(value) }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Conferma eliminazione
          </DialogTitle>
          <DialogDescription>
            {opera && <>Stai per eliminare l&apos;opera <strong>&quot;{opera.titolo || 'senza titolo'}&quot;</strong>.</>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {checkState === 'checking' && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifica partecipazioni e individuazioni...
            </div>
          )}

          {checkState === 'ready' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Questa azione è irreversibile. L&apos;opera viene eliminata con episodi, alias e cast esterno.
            </div>
          )}

          {checkState === 'ready' && needsPartecipazioniConfirm && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-900">
                L&apos;opera ha <strong>{plural(partecipazioniCount, 'partecipazione', 'partecipazioni')}</strong>:
                verranno eliminate insieme all&apos;opera.
              </p>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <Checkbox
                  checked={confermaPartecipazioni}
                  onCheckedChange={value => setConfermaPartecipazioni(value === true)}
                  aria-label="Confermo l'eliminazione delle partecipazioni"
                />
                <span>Confermo, elimina anche le partecipazioni</span>
              </label>
            </div>
          )}

          {checkState === 'ready' && individuazioniCount > 0 && (
            <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
              <p className="text-sm text-orange-800">
                L&apos;opera compare in <strong>{plural(individuazioniCount, 'individuazione', 'individuazioni')}</strong>.
                Restano in piattaforma con i loro dati, ma perdono il collegamento all&apos;opera.
              </p>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <Checkbox
                  checked={deleteIndividuazioniToo}
                  onCheckedChange={value => setDeleteIndividuazioniToo(value === true)}
                  aria-label="Elimina anche le individuazioni"
                />
                <span>Elimina anche le individuazioni (opzionale)</span>
              </label>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-white p-3 text-sm text-red-700" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Annulla
          </Button>
          <Button variant="destructive" onClick={() => void handleDelete()} disabled={!canDelete || isDeleting}>
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Elimina opera
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
