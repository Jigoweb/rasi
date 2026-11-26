'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  deleteArtista,
  getPartecipazioniCountByArtistaId,
  type DeleteArtistaPartecipazioniMode,
} from '@/features/artisti/services/artisti.service'
import { notifyError, notifySuccess } from '@/shared/lib/toast'

export interface EliminaArtistaTarget {
  id: string
  nome?: string | null
  cognome?: string | null
  nome_arte?: string | null
}

interface EliminaArtistaDialogProps {
  artista: EliminaArtistaTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: (artistaId: string) => void | Promise<void>
}

type CheckState = 'checking' | 'ready' | 'error'

function displayName(artista: EliminaArtistaTarget): string {
  const anagrafica = [artista.cognome, artista.nome].filter(Boolean).join(' ').trim()
  return anagrafica || artista.nome_arte || 'questo artista'
}

export function EliminaArtistaDialog({ artista, open, onOpenChange, onDeleted }: EliminaArtistaDialogProps) {
  const [checkState, setCheckState] = useState<CheckState>('checking')
  const [partecipazioniCount, setPartecipazioniCount] = useState(0)
  const [mode, setMode] = useState<DeleteArtistaPartecipazioniMode>('mantieni')
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !artista) return
    let cancelled = false
    setCheckState('checking')
    setErrorMessage(null)
    setMode('mantieni')

    void getPartecipazioniCountByArtistaId(artista.id).then(({ count, error }) => {
      if (cancelled) return
      if (error) {
        setCheckState('error')
        setErrorMessage('Impossibile verificare le partecipazioni dell’artista.')
        return
      }
      setPartecipazioniCount(count)
      setCheckState('ready')
    })

    return () => {
      cancelled = true
    }
  }, [open, artista])

  async function handleDelete() {
    if (!artista) return
    setIsDeleting(true)
    setErrorMessage(null)
    try {
      const { data, error } = await deleteArtista(artista.id, partecipazioniCount > 0 ? mode : 'elimina')
      if (error) {
        setErrorMessage(error.message)
        notifyError('Eliminazione artista non riuscita', error)
        return
      }
      const castCreati = data?.cast_esterno_creati ?? 0
      notifySuccess(
        'Artista eliminato',
        castCreati > 0
          ? `${castCreati} partecipazion${castCreati === 1 ? 'e mantenuta' : 'i mantenute'} come cast esterno delle opere.`
          : undefined
      )
      onOpenChange(false)
      await onDeleted?.(artista.id)
    } finally {
      setIsDeleting(false)
    }
  }

  const hasPartecipazioni = partecipazioniCount > 0
  const label = `${partecipazioniCount} partecipazion${partecipazioniCount === 1 ? 'e' : 'i'}`

  return (
    <Dialog open={open} onOpenChange={value => { if (!isDeleting) onOpenChange(value) }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Conferma eliminazione
          </DialogTitle>
          <DialogDescription>
            {artista && <>Stai per eliminare l&apos;artista <strong>{displayName(artista)}</strong> dalla banca dati.</>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {checkState === 'checking' && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifica partecipazioni in corso...
            </div>
          )}

          {checkState === 'ready' && hasPartecipazioni && (
            <fieldset className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <legend className="sr-only">Cosa fare con le partecipazioni</legend>
              <p className="text-sm text-amber-900">
                L&apos;artista ha <strong>{label}</strong> associate. Cosa vuoi fare?
              </p>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="partecipazioni-mode"
                  className="mt-1"
                  checked={mode === 'mantieni'}
                  onChange={() => setMode('mantieni')}
                />
                <span>
                  <span className="font-medium">Elimina l&apos;artista e mantieni le partecipazioni</span>
                  <span className="block text-xs text-muted-foreground">
                    Le opere conservano nome, ruolo e personaggio come cast esterno, non più collegati a un artista.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="partecipazioni-mode"
                  className="mt-1"
                  checked={mode === 'elimina'}
                  onChange={() => setMode('elimina')}
                />
                <span>
                  <span className="font-medium">Elimina l&apos;artista e tutte le partecipazioni</span>
                  <span className="block text-xs text-muted-foreground">
                    Le {label} vengono rimosse dalle opere.
                  </span>
                </span>
              </label>
            </fieldset>
          )}

          {checkState === 'ready' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Questa azione è irreversibile. Anagrafica, note, referenti e dati riservati dell&apos;artista verranno eliminati.
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
          <Button
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={checkState !== 'ready' || isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Elimina artista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
