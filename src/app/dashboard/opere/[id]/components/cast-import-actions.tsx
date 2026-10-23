'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Download, Loader2, Upload } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Badge } from '@/shared/components/ui/badge'

type ImportRow = {
  rowNumber: number
  nome: string
  cognome: string
  ipn: string
  ruolo: string
  stagione: number | null
  episodio: number | null
  status: 'valid' | 'skipped'
  action: 'partecipazione' | 'cast_esterno' | null
  alert: string | null
  detail: string | null
}

type ImportSummary = {
  valid?: number
  skipped: number
  imported?: number
  partecipazioni?: number
  castEsterno?: number
}

type ImportResponse = {
  mode: 'preview' | 'commit'
  rows: ImportRow[]
  summary: ImportSummary
  error?: string
}

function scopeLabel(row: ImportRow): string {
  if (row.stagione == null && row.episodio == null) return 'Tutta l\'opera'
  if (row.stagione == null || row.episodio == null) return '—'
  return `S${row.stagione}E${row.episodio}`
}

function actionLabel(action: ImportRow['action']): string {
  if (action === 'partecipazione') return 'Partecipazione RASI'
  if (action === 'cast_esterno') return 'Cast esterno'
  return '—'
}

async function readError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as { error?: string } | null
  return body?.error || 'Operazione non riuscita'
}

export function CastImportActions({
  operaId,
  onImported,
}: {
  operaId: string
  onImported: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportResponse | null>(null)
  const [summary, setSummary] = useState<ImportResponse | null>(null)

  const reset = () => {
    setFile(null)
    setError(null)
    setPreview(null)
    setSummary(null)
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const download = async (format: 'xlsx' | 'csv') => {
    setDownloading(true)
    try {
      const response = await fetch(`/api/opere/${operaId}/cast-template?format=${format}`, { credentials: 'same-origin' })
      if (!response.ok) {
        toast.error(await readError(response))
        return
      }
      const blob = await response.blob()
      const disposition = response.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="([^"]+)"/)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = match?.[1] || `template_cast.${format}`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download del template non riuscito')
    } finally {
      setDownloading(false)
    }
  }

  const send = async (mode: 'preview' | 'commit', selected: File) => {
    const body = new FormData()
    body.set('mode', mode)
    body.set('file', selected)
    const response = await fetch(`/api/opere/${operaId}/cast-import`, {
      method: 'POST',
      body,
      credentials: 'same-origin',
    })
    if (!response.ok) throw new Error(await readError(response))
    return await response.json() as ImportResponse
  }

  const onFile = async (selected: File | null) => {
    if (!selected) return
    setFile(selected)
    setSummary(null)
    setPreview(null)
    setError(null)
    setBusy(true)
    try {
      setPreview(await send('preview', selected))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Anteprima non riuscita')
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const result = await send('commit', file)
      setSummary(result)
      setPreview(null)
      if ((result.summary.imported ?? 0) > 0) onImported()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Import non riuscito')
    } finally {
      setBusy(false)
    }
  }

  const visible = summary ?? preview
  const validCount = preview?.summary.valid ?? 0

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Scarica template cast
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => download('xlsx')}>Excel (.xlsx)</DropdownMenuItem>
          <DropdownMenuItem onClick={() => download('csv')}>CSV (.csv)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="sm" onClick={() => { reset(); setOpen(true) }}>
        <Upload className="h-4 w-4 mr-2" />
        Importa cast
      </Button>

      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset() }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{summary ? 'Import cast completato' : 'Importa cast'}</DialogTitle>
            <DialogDescription>
              L&apos;artista è riconosciuto solo se nome, cognome e IPN coincidono. Se l&apos;IPN appartiene a un altro artista la riga viene scartata. Stagione ed episodio vuoti collegano il cast all&apos;intera opera; se l&apos;episodio non esiste la riga viene scartata. Non vengono creati episodi né schede artista.
            </DialogDescription>
          </DialogHeader>

          {!summary && (
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.csv"
                className="text-sm"
                aria-label="File template cast"
                onChange={(event) => { void onFile(event.target.files?.[0] ?? null) }}
              />
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {summary && (
            <p className="text-sm">
              Importate {summary.summary.imported ?? 0}
              {typeof summary.summary.partecipazioni === 'number' && typeof summary.summary.castEsterno === 'number'
                ? ` (${summary.summary.partecipazioni} partecipazioni RASI, ${summary.summary.castEsterno} nel cast esterno)`
                : ''}. Scartate {summary.summary.skipped}.
            </p>
          )}

          {visible && visible.rows.length > 0 && (
            <div className="max-h-80 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Riga</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cognome</TableHead>
                    <TableHead>IPN</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Episodio</TableHead>
                    <TableHead>Esito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.rows.map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell>{row.nome}</TableCell>
                      <TableCell>{row.cognome}</TableCell>
                      <TableCell>{row.ipn || '—'}</TableCell>
                      <TableCell>{row.ruolo}</TableCell>
                      <TableCell>{scopeLabel(row)}</TableCell>
                      <TableCell>
                        {row.status === 'valid' ? (
                          <div className="space-y-1">
                            <Badge variant="secondary">{actionLabel(row.action)}</Badge>
                            {row.detail && <div className="text-xs text-muted-foreground">{row.detail}</div>}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Badge variant="outline">Scartata</Badge>
                            <div className="text-xs text-amber-700">{row.alert}</div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {preview && preview.rows.length === 0 && !error && (
            <p className="text-sm text-muted-foreground">Nessuna riga da importare.</p>
          )}

          <DialogFooter>
            {summary ? (
              <Button onClick={() => setOpen(false)}>Chiudi</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Annulla</Button>
                <Button onClick={() => { void confirm() }} disabled={busy || !preview || validCount === 0}>
                  Importa righe valide
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
