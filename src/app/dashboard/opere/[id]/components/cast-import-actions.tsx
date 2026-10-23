'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Download, Loader2, Upload } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'

type ImportRow = {
  rowNumber: number
  nome: string
  cognome: string
  ipn: string
  ruolo: string
  stagione: string
  episodio: string
  status: 'valid' | 'skipped'
  action: 'partecipazione' | 'cast_esterno' | 'update_cast_esterno' | null
  alert: string | null
  detail: string | null
  included: boolean
  proposta: 'aggiorna' | 'crea' | null
  castEsternoId: string | null
  flagged: boolean
}

type ImportSummary = {
  valid?: number
  excluded?: number
  skipped: number
  imported?: number
  partecipazioni?: number
  castEsterno?: number
  aggiornamenti?: number
}

type ImportResponse = {
  mode: 'preview' | 'revalidate' | 'commit'
  rows: ImportRow[]
  summary: ImportSummary
  ruoli?: string[]
  error?: string
}

type ServerRow = Omit<ImportRow, 'stagione' | 'episodio'> & {
  stagione: number | string | null
  episodio: number | string | null
}

function textCell(value: number | string | null | undefined): string {
  if (value == null) return ''
  return String(value)
}

function toDraft(row: ServerRow): ImportRow {
  return { ...row, stagione: textCell(row.stagione), episodio: textCell(row.episodio) }
}

function toEdit(row: ImportRow) {
  return {
    rowNumber: row.rowNumber,
    nome: row.nome,
    cognome: row.cognome,
    ipn: row.ipn,
    ruolo: row.ruolo,
    stagione: row.stagione,
    episodio: row.episodio,
    included: row.included,
    proposta: row.proposta,
  }
}

function actionLabel(action: ImportRow['action']): string {
  if (action === 'partecipazione') return 'Partecipazione RASI'
  if (action === 'update_cast_esterno') return 'Aggiorna cast esterno'
  if (action === 'cast_esterno') return 'Cast esterno'
  return 'Scartata'
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
  const requestId = useRef(0)
  const timer = useRef<number | null>(null)
  const rowsRef = useRef<ImportRow[]>([])
  const [downloading, setDownloading] = useState(false)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportResponse | null>(null)
  const [summary, setSummary] = useState<ImportResponse | null>(null)
  const [ruoli, setRuoli] = useState<string[]>([])

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const reset = () => {
    if (timer.current) window.clearTimeout(timer.current)
    requestId.current += 1
    rowsRef.current = []
    setError(null)
    setPreview(null)
    setSummary(null)
    setRuoli([])
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

  const postJson = async (mode: 'revalidate' | 'commit', rows: ImportRow[]) => {
    const response = await fetch(`/api/opere/${operaId}/cast-import`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, rows: rows.map(toEdit) }),
    })
    if (!response.ok) throw new Error(await readError(response))
    return await response.json() as ImportResponse & { rows: ServerRow[] }
  }

  const beginRequest = () => {
    if (timer.current) window.clearTimeout(timer.current)
    requestId.current += 1
    return requestId.current
  }

  const revalidate = async (id: number) => {
    const rows = rowsRef.current
    setBusy(true)
    setError(null)
    try {
      const result = await postJson('revalidate', rows)
      if (id !== requestId.current) return
      const drafts = result.rows.map(toDraft)
      rowsRef.current = drafts
      setRuoli(result.ruoli ?? [])
      setPreview({ ...result, rows: drafts })
    } catch (cause) {
      if (id !== requestId.current) return
      setError(cause instanceof Error ? cause.message : 'Verifica non riuscita')
    } finally {
      if (id === requestId.current) setBusy(false)
    }
  }

  const patchRow = (rowNumber: number, patch: Partial<ImportRow>, immediate = false) => {
    const rows = rowsRef.current.map((row) => (row.rowNumber === rowNumber ? { ...row, ...patch } : row))
    rowsRef.current = rows
    setPreview((current) => (current ? { ...current, rows } : current))
    const id = beginRequest()
    if (immediate) {
      void revalidate(id)
      return
    }
    timer.current = window.setTimeout(() => { void revalidate(id) }, 300)
  }

  const onFile = async (selected: File | null) => {
    if (!selected) return
    setSummary(null)
    setPreview(null)
    setError(null)
    setBusy(true)
    const id = ++requestId.current
    try {
      const body = new FormData()
      body.set('mode', 'preview')
      body.set('file', selected)
      const response = await fetch(`/api/opere/${operaId}/cast-import`, {
        method: 'POST',
        body,
        credentials: 'same-origin',
      })
      if (!response.ok) throw new Error(await readError(response))
      const result = await response.json() as ImportResponse & { rows: ServerRow[] }
      if (id !== requestId.current) return
      const drafts = result.rows.map(toDraft)
      rowsRef.current = drafts
      setRuoli(result.ruoli ?? [])
      setPreview({ ...result, rows: drafts })
    } catch (cause) {
      if (id !== requestId.current) return
      setError(cause instanceof Error ? cause.message : 'Anteprima non riuscita')
    } finally {
      if (id === requestId.current) setBusy(false)
    }
  }

  const confirm = async () => {
    if (rowsRef.current.length === 0) return
    const id = beginRequest()
    setBusy(true)
    setError(null)
    try {
      const result = await postJson('commit', rowsRef.current)
      if (id !== requestId.current) return
      setSummary({ ...result, rows: result.rows.map(toDraft) })
      setPreview(null)
      if ((result.summary.imported ?? 0) > 0) onImported()
    } catch (cause) {
      if (id !== requestId.current) return
      setError(cause instanceof Error ? cause.message : 'Import non riuscito')
    } finally {
      if (id === requestId.current) setBusy(false)
    }
  }

  const visible = summary ?? preview
  const importable = preview?.rows.filter((row) => row.included && row.status === 'valid').length ?? 0
  const editing = Boolean(preview && !summary)

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
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>{summary ? 'Import cast completato' : 'Importa cast'}</DialogTitle>
            <DialogDescription>
              Le righe segnalate si correggono in anteprima: nome, cognome, IPN, ruolo, stagione ed episodio. Il controllo è immediato e puoi includerle o escluderle. Una persona già nel cast esterno senza ruolo viene aggiornata con il ruolo del file, salvo tua scelta diversa. Nulla viene scritto prima della conferma. Non si creano episodi né schede artista.
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
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-label="Verifica in corso" />}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {summary && (
            <p className="text-sm">
              Importate {summary.summary.imported ?? 0}
              {typeof summary.summary.partecipazioni === 'number'
                ? ` (${summary.summary.partecipazioni} partecipazioni RASI, ${summary.summary.castEsterno ?? 0} nuove nel cast esterno, ${summary.summary.aggiornamenti ?? 0} aggiornate)`
                : ''}. Scartate {summary.summary.skipped}. Escluse {summary.summary.excluded ?? 0}.
            </p>
          )}

          {preview && !summary && (
            <p className="text-sm text-muted-foreground">
              Da importare {importable}. Escluse {preview.summary.excluded ?? 0}. Segnalate {preview.rows.filter((row) => row.flagged).length}.
            </p>
          )}

          {visible && visible.rows.length > 0 && (
            <div className="max-h-[28rem] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Riga</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cognome</TableHead>
                    <TableHead>IPN</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Stagione</TableHead>
                    <TableHead>Episodio</TableHead>
                    <TableHead>Includi</TableHead>
                    <TableHead>Esito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.rows.map((row) => (
                    <TableRow key={row.rowNumber} className={row.flagged ? 'bg-amber-50' : undefined}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell>{editing ? <Input aria-label={`Nome riga ${row.rowNumber}`} value={row.nome} className="h-8 min-w-28" onChange={(event) => patchRow(row.rowNumber, { nome: event.target.value })} /> : row.nome}</TableCell>
                      <TableCell>{editing ? <Input aria-label={`Cognome riga ${row.rowNumber}`} value={row.cognome} className="h-8 min-w-28" onChange={(event) => patchRow(row.rowNumber, { cognome: event.target.value })} /> : row.cognome}</TableCell>
                      <TableCell>{editing ? <Input aria-label={`IPN riga ${row.rowNumber}`} value={row.ipn} className="h-8 min-w-24" onChange={(event) => patchRow(row.rowNumber, { ipn: event.target.value })} /> : (row.ipn || '—')}</TableCell>
                      <TableCell>
                        {editing ? (
                          <Select value={row.ruolo || undefined} onValueChange={(ruolo) => patchRow(row.rowNumber, { ruolo }, true)}>
                            <SelectTrigger className="h-8 min-w-40" aria-label={`Ruolo riga ${row.rowNumber}`}>
                              <SelectValue placeholder="Ruolo" />
                            </SelectTrigger>
                            <SelectContent>
                              {ruoli.map((nome) => <SelectItem key={nome} value={nome}>{nome}</SelectItem>)}
                              {row.ruolo && !ruoli.includes(row.ruolo) ? <SelectItem value={row.ruolo}>{row.ruolo}</SelectItem> : null}
                            </SelectContent>
                          </Select>
                        ) : row.ruolo}
                      </TableCell>
                      <TableCell>{editing ? <Input aria-label={`Stagione riga ${row.rowNumber}`} value={row.stagione} className="h-8 w-16" onChange={(event) => patchRow(row.rowNumber, { stagione: event.target.value })} /> : (row.stagione || '—')}</TableCell>
                      <TableCell>{editing ? <Input aria-label={`Episodio riga ${row.rowNumber}`} value={row.episodio} className="h-8 w-16" onChange={(event) => patchRow(row.rowNumber, { episodio: event.target.value })} /> : (row.episodio || '—')}</TableCell>
                      <TableCell>
                        <Checkbox
                          aria-label={`Includi riga ${row.rowNumber}`}
                          checked={row.included}
                          disabled={!editing || row.status !== 'valid'}
                          onCheckedChange={(checked) => patchRow(row.rowNumber, { included: checked === true }, true)}
                        />
                      </TableCell>
                      <TableCell className="min-w-56">
                        <div className="space-y-1">
                          <Badge variant={row.status === 'valid' ? 'secondary' : 'outline'}>{actionLabel(row.action)}</Badge>
                          {row.detail && <div className="text-xs text-muted-foreground">{row.detail}</div>}
                          {row.alert && <div className="text-xs font-medium text-amber-800">{row.alert}</div>}
                          {editing && (row.castEsternoId || row.proposta) && (
                            <Select
                              value={row.proposta ?? 'aggiorna'}
                              onValueChange={(proposta: 'aggiorna' | 'crea') => patchRow(row.rowNumber, { proposta }, true)}
                            >
                              <SelectTrigger className="h-8" aria-label={`Azione riga ${row.rowNumber}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="aggiorna">Aggiorna la riga già presente</SelectItem>
                                <SelectItem value="crea">Crea una nuova riga</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
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
                <Button onClick={() => { void confirm() }} disabled={busy || !preview || importable === 0}>
                  Conferma importazione
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
