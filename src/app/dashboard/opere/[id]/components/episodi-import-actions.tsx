'use client'

import { useRef, useState } from 'react'
import { Download, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { useAuth } from '@/shared/contexts/auth-context'
import { supabase } from '@/shared/lib/supabase-client'
import type { EpisodiImportResponse, EpisodioTemplateSource } from '@/features/opere/lib/episodi-import'

type ImportSuccess = Extract<EpisodiImportResponse, { ok: true }>

type EpisodiImportActionsProps = {
  operaId: string
  operaTitolo: string | null
  episodi: EpisodioTemplateSource[]
  onImported: () => void
}

export function EpisodiImportActions({
  operaId,
  operaTitolo,
  episodi,
  onImported,
}: EpisodiImportActionsProps) {
  const { isAdmin, isOperatore } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<File | null>(null)
  const requestRef = useRef(0)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<'preview' | 'summary'>('preview')
  const [loadingMode, setLoadingMode] = useState<'preview' | 'confirm' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportSuccess | null>(null)

  if (!isAdmin && !isOperatore) return null

  const downloadTemplate = async (ext: 'xlsx' | 'csv') => {
    try {
      const {
        buildEpisodiTemplateCsv,
        buildEpisodiTemplateXlsx,
        episodiTemplateFileName,
      } = await import('@/features/opere/lib/episodi-import')
      const filename = episodiTemplateFileName(operaTitolo, ext)
      const content = ext === 'xlsx' ? buildEpisodiTemplateXlsx(episodi) : buildEpisodiTemplateCsv(episodi)
      const type = ext === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv;charset=utf-8'
      const blob = new Blob([toBlobPart(content)], { type })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      console.error(downloadError)
      toast.error('Non è stato possibile scaricare il template episodi')
    }
  }

  const submitFile = async (file: File, mode: 'preview' | 'confirm') => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    setLoadingMode(mode)
    setError(null)
    if (mode === 'preview') setResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (requestRef.current !== requestId) return
      if (!session?.access_token) {
        setError('Sessione scaduta. Accedi di nuovo.')
        return
      }
      const body = new FormData()
      body.append('file', file)
      body.append('mode', mode)
      const response = await fetch(`/api/opere/${operaId}/episodi/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body,
      })
      const payload = await response.json().catch(() => null) as EpisodiImportResponse | null
      if (requestRef.current !== requestId) return
      if (!response.ok || !payload || !payload.ok) {
        setError(payload && !payload.ok ? payload.error : 'Importazione non riuscita.')
        return
      }
      setResult(payload)
      setPhase(mode === 'confirm' ? 'summary' : 'preview')
    } catch (submitError) {
      console.error(submitError)
      if (requestRef.current === requestId) setError('Importazione non riuscita.')
    } finally {
      if (requestRef.current === requestId) setLoadingMode(null)
    }
  }

  const onFileChange = (file: File | undefined) => {
    if (!file) return
    fileRef.current = file
    setOpen(true)
    setPhase('preview')
    setResult(null)
    void submitFile(file, 'preview')
  }

  const closeDialog = (nextOpen: boolean) => {
    if (nextOpen) return
    const imported = phase === 'summary' ? result?.summary.imported ?? 0 : 0
    requestRef.current += 1
    setOpen(false)
    setLoadingMode(null)
    setPhase('preview')
    setResult(null)
    setError(null)
    fileRef.current = null
    if (inputRef.current) inputRef.current.value = ''
    if (imported > 0) onImported()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Scarica template episodi
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => void downloadTemplate('xlsx')}>
            Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void downloadTemplate('csv')}>
            CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4 mr-2" />
        Importa episodi
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="sr-only"
        aria-label="File episodi"
        onChange={(event) => {
          const file = event.target.files?.[0]
          onFileChange(file)
          event.target.value = ''
        }}
      />

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {phase === 'summary' ? 'Importazione completata' : 'Anteprima importazione episodi'}
            </DialogTitle>
            <DialogDescription>
              {phase === 'summary'
                ? 'Solo le righe valide sono state importate. Gli episodi già presenti non sono stati aggiornati.'
                : 'Controlla le righe valide e quelle ignorate. La conferma importa solo le righe valide e non aggiorna gli episodi già presenti.'}
            </DialogDescription>
          </DialogHeader>

          {loadingMode && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {loadingMode === 'confirm' ? 'Importazione in corso...' : 'Lettura del file...'}
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <p className="text-sm">
                {phase === 'summary'
                  ? `${episodeCount(result.summary.imported)}, ${skippedCount(result.summary.skipped)}.`
                  : `${validCount(result.summary.valid)}, ${skippedCount(result.summary.skipped)} su ${result.summary.total}.`}
              </p>
              {result.summary.valid === 0 && phase === 'preview' && (
                <p className="text-sm text-muted-foreground">Nessuna riga valida da importare.</p>
              )}
              {result.alerts.length > 0 && (
                <div role="alert" className="rounded-md border px-3 py-2 text-sm space-y-1">
                  <p className="font-medium">Avvisi</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.alerts.map((alert) => (
                      <li key={`${alert.rowNumber}-${alert.message}`}>
                        Riga {alert.rowNumber}: {alert.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="max-h-80 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Riga</TableHead>
                      <TableHead>Esito</TableHead>
                      <TableHead>Stagione</TableHead>
                      <TableHead>Episodio</TableHead>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Durata (minuti)</TableHead>
                      <TableHead>Data prima messa in onda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'valid' ? 'secondary' : 'outline'}>
                            {row.status === 'valid' ? 'Valida' : 'Ignorata'}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.stagione ?? '—'}</TableCell>
                        <TableCell>{row.episodio ?? '—'}</TableCell>
                        <TableCell>{row.titolo ?? '—'}</TableCell>
                        <TableCell>{row.durataMinuti ?? '—'}</TableCell>
                        <TableCell>{formatItalianDate(row.dataPrimaMessaInOnda)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => closeDialog(false)} disabled={loadingMode !== null}>
              {phase === 'summary' ? 'Chiudi' : 'Annulla'}
            </Button>
            {phase === 'preview' && (
              <Button
                type="button"
                onClick={() => {
                  const file = fileRef.current
                  if (!file || loadingMode) return
                  void submitFile(file, 'confirm')
                }}
                disabled={loadingMode !== null || !result || result.summary.valid === 0}
              >
                Conferma importazione
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function toBlobPart(content: Uint8Array | string): BlobPart {
  if (typeof content === 'string') return content
  const copy = new ArrayBuffer(content.byteLength)
  new Uint8Array(copy).set(content)
  return copy
}

function validCount(count: number): string {
  return count === 1 ? '1 riga valida' : `${count} righe valide`
}

function skippedCount(count: number): string {
  return count === 1 ? '1 riga ignorata' : `${count} righe ignorate`
}

function episodeCount(count: number): string {
  return count === 1 ? '1 episodio importato' : `${count} episodi importati`
}

function formatItalianDate(iso: string | null): string {
  if (!iso) return '—'
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return iso
  return `${match[3]}/${match[2]}/${match[1]}`
}
