'use client'

import { useState } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { leggiExcelRipartizione } from '../lib/excel-lettura'
import { confrontaArtisti, formatEuro, type ConfrontoArtisti, type TotalePiattaforma } from '../lib/ripartizione-display'

const ESITO: Record<string, string> = {
  entrambi: '',
  solo_file: 'Solo nel file',
  solo_piattaforma: 'Solo in piattaforma',
}

/**
 * Confronto con l'Excel di ripartizione preparato da RASI: totali per artista
 * nel file e in piattaforma. Il file si legge nel browser, non viene caricato.
 */
export function ConfrontoExcelDialog({
  open,
  onOpenChange,
  totali,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  totali: TotalePiattaforma[]
}) {
  const [confronto, setConfronto] = useState<ConfrontoArtisti | null>(null)
  const [nomeFile, setNomeFile] = useState<string | null>(null)
  const [avvisi, setAvvisi] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const leggi = async (file: File | null) => {
    if (!file) return
    setBusy(true)
    setErrore(null)
    setConfronto(null)
    try {
      const lettura = leggiExcelRipartizione(await file.arrayBuffer())
      if (lettura.righe.length === 0) {
        setErrore('Nel file non ho trovato righe con artista, ruolo e importo da liquidare.')
      } else {
        setConfronto(confrontaArtisti(lettura, totali))
        setAvvisi(lettura.avvisi)
        setNomeFile(file.name)
      }
    } catch (e: any) {
      setErrore(e?.message ?? 'Lettura del file non riuscita')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Confronta con l’Excel di RASI</DialogTitle>
          <DialogDescription>
            Carica il file di ripartizione preparato a mano (per esempio «F NETFLIX 2024_INDIVIDUAZIONI.xlsx»): per ogni
            artista vedi l’importo nel file, quello calcolato qui e la differenza. Il file resta sul tuo computer.
          </DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-4 py-4 text-sm hover:bg-muted/50">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileUp className="h-5 w-5 text-muted-foreground" />}
          <span>{nomeFile ?? 'Scegli il file Excel'}</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="sr-only"
            aria-label="File Excel di RASI"
            onChange={(e) => void leggi(e.target.files?.[0] ?? null)}
          />
        </label>

        {errore && <p className="text-sm text-destructive">{errore}</p>}

        {confronto && (
          <div className="space-y-3 text-sm">
            <p>
              Totale nel file <strong>{formatEuro(confronto.totaleFile)}</strong> · in piattaforma{' '}
              <strong>{formatEuro(confronto.totalePiattaforma)}</strong> · differenze per artista{' '}
              <strong>{formatEuro(confronto.scostamento)}</strong>
              {confronto.soloFile > 0 && ` · ${confronto.soloFile} artisti solo nel file`}
              {confronto.soloPiattaforma > 0 && ` · ${confronto.soloPiattaforma} solo in piattaforma`}
            </p>
            {avvisi.length > 0 && <p className="text-muted-foreground">{avvisi.join(' · ')}</p>}
            <div className="max-h-96 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artista</TableHead>
                    <TableHead className="text-right">File RASI</TableHead>
                    <TableHead className="text-right">Piattaforma</TableHead>
                    <TableHead className="text-right">Differenza</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {confronto.righe.map((r, i) => (
                    <TableRow key={`${r.nome}-${i}`}>
                      <TableCell>{r.nome}</TableCell>
                      <TableCell className="text-right font-mono">{formatEuro(r.file)}</TableCell>
                      <TableCell className="text-right font-mono">{formatEuro(r.piattaforma)}</TableCell>
                      <TableCell className={`text-right font-mono ${Math.abs(r.differenza) >= 1 ? 'text-amber-700' : ''}`}>
                        {formatEuro(r.differenza)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{ESITO[r.esito]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
