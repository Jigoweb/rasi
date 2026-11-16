'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, FileUp, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import {
  removeUploadedProgrammazioniFile,
  riprocessaCampiDaFile,
  uploadProgrammazioniFileToStorage,
  type RiprocessoEsito,
} from '@/features/programmazioni/services/programmazioni-upload-worker.service'

type Fase = 'scelta' | 'anteprima' | 'fatto'

const FIELD_LABELS: Record<string, string> = {
  data_trasmissione: 'data di trasmissione',
  data_inizio: 'data inizio',
  data_fine: 'data fine',
  ora_inizio: 'orario di inizio',
  ora_fine: 'orario di fine',
}

function n(value: number): string {
  return value.toLocaleString('it-IT')
}

/**
 * «Correggi dati dal file»: si ricarica lo stesso file della campagna e si
 * aggiornano solo data, orari e titoli delle programmazioni già presenti.
 * Prima un'anteprima (nessuna scrittura), poi la conferma.
 */
export function CorreggiDatiDialog({
  open,
  onOpenChange,
  campagnaId,
  campagnaNome,
  onApplied,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  campagnaId: string
  campagnaNome: string
  onApplied: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [storagePath, setStoragePath] = useState<string | null>(null)
  const [esito, setEsito] = useState<RiprocessoEsito | null>(null)
  const [fase, setFase] = useState<Fase>('scelta')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setFile(null)
    setStoragePath(null)
    setEsito(null)
    setFase('scelta')
    setError(null)
  }

  const close = (next: boolean) => {
    if (busy) return
    if (!next) {
      // File caricato solo per l'anteprima e non applicato: si toglie dal bucket.
      if (storagePath && fase === 'anteprima') void removeUploadedProgrammazioniFile(storagePath)
      reset()
    }
    onOpenChange(next)
  }

  const anteprima = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    const upload = await uploadProgrammazioniFileToStorage(file, campagnaId)
    if (upload.error) {
      setBusy(false)
      setError(`Caricamento del file non riuscito: ${upload.error.message}`)
      return
    }
    setStoragePath(upload.storagePath)
    const { data, error: workerError } = await riprocessaCampiDaFile({
      campagneProgrammazioneId: campagnaId,
      storagePath: upload.storagePath,
      fileName: file.name,
      applica: false,
    })
    setBusy(false)
    if (workerError || !data) {
      setError(workerError || 'Anteprima non riuscita')
      void removeUploadedProgrammazioniFile(upload.storagePath)
      setStoragePath(null)
      return
    }
    setEsito(data)
    setFase('anteprima')
  }

  const applica = async () => {
    if (!file || !storagePath) return
    setBusy(true)
    setError(null)
    const { data, error: workerError } = await riprocessaCampiDaFile({
      campagneProgrammazioneId: campagnaId,
      storagePath,
      fileName: file.name,
      applica: true,
    })
    setBusy(false)
    if (workerError || !data) {
      setError(workerError || 'Correzione non riuscita')
      return
    }
    setEsito(data)
    setFase('fatto')
    onApplied()
  }

  const totaleCambi = esito
    ? esito.cambi.data_trasmissione + esito.cambi.ora_inizio + esito.cambi.ora_fine + esito.cambi.titoli
    : 0
  const ritrovateParziali = esito ? esito.ritrovate < esito.righe_inviate : false
  const nonRiconosciuti = esito ? Object.entries(esito.valori_non_riconosciuti ?? {}) : []

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Correggi dati dal file</DialogTitle>
          <DialogDescription>
            Ricarica lo stesso file usato per «{campagnaNome}». Vengono aggiornati solo data, orari e titoli delle
            programmazioni già presenti: le individuazioni restano valide e non serve rifarle.
          </DialogDescription>
        </DialogHeader>

        {fase === 'scelta' && (
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-4 py-6 text-sm hover:bg-muted/50">
              <FileUp className="h-5 w-5 text-muted-foreground" />
              <span>{file ? file.name : 'Scegli il file Excel o CSV originale'}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                aria-label="File della campagna"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        )}

        {esito && fase !== 'scelta' && (
          <div className="space-y-3 text-sm">
            {fase === 'fatto' ? (
              <p className="flex items-center gap-2 font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Correzione applicata: {n(esito.aggiornate)} programmazioni aggiornate,{' '}
                {n(esito.individuazioni_riallineate)} individuazioni riallineate.
              </p>
            ) : (
              <p>
                Righe nel file: <strong>{n(esito.righe_file)}</strong> · ritrovate nella campagna:{' '}
                <strong>{n(esito.ritrovate)}</strong> su {n(esito.righe_inviate)}
              </p>
            )}
            {ritrovateParziali && (
              <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Non tutte le righe sono state ritrovate: il file non è identico a quello caricato. Verranno corrette solo
                le righe ritrovate.
              </p>
            )}
            <ul className="list-disc space-y-1 pl-5" aria-label="Cambi">
              <li>Date di trasmissione: {n(esito.cambi.data_trasmissione)}</li>
              <li>Orari di inizio: {n(esito.cambi.ora_inizio)}</li>
              {esito.cambi.ora_fine > 0 && <li>Orari di fine: {n(esito.cambi.ora_fine)}</li>}
              <li>Titoli o regia corretti: {n(esito.cambi.titoli)}</li>
            </ul>
            {fase === 'anteprima' && esito.esempi.length > 0 && (
              <div className="rounded-md border">
                <p className="border-b px-3 py-2 font-medium">Esempi</p>
                <ul className="divide-y">
                  {esito.esempi.map((e, i) => (
                    <li key={i} className="px-3 py-2">
                      <span className="font-medium">{e.titolo_nuovo ?? e.titolo_attuale}</span>
                      {e.titolo_nuovo && <span className="text-muted-foreground"> (era «{e.titolo_attuale}»)</span>}
                      {e.data_nuova && <span> · data {e.data_attuale ?? '—'} → {e.data_nuova}</span>}
                      {e.ora_nuova && <span> · orario {e.ora_attuale ?? '—'} → {e.ora_nuova}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {nonRiconosciuti.length > 0 && (
              <p className="text-muted-foreground">
                Valori non riconosciuti (restano come sono):{' '}
                {nonRiconosciuti
                  .map(([field, info]) => `${FIELD_LABELS[field] ?? field} ${n(info.count)} (es. «${info.esempi[0]}»)`)
                  .join('; ')}
              </p>
            )}
            {fase === 'anteprima' && totaleCambi === 0 && (
              <p className="text-muted-foreground">Nessun dato da correggere con questo file.</p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          {fase === 'fatto' ? (
            <Button onClick={() => close(false)}>Chiudi</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => close(false)} disabled={busy}>
                Annulla
              </Button>
              {fase === 'scelta' ? (
                <Button onClick={anteprima} disabled={!file || busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mostra anteprima
                </Button>
              ) : (
                <Button onClick={applica} disabled={busy || totaleCambi === 0 || esito?.ritrovate === 0}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Applica correzione
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
