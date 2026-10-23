'use client'

import { useRef, useState } from 'react'
import { Download, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { EditableImportPreview } from '@/shared/components/editable-import-preview'
import { useAuth } from '@/shared/contexts/auth-context'
import { supabase } from '@/shared/lib/supabase-client'
import {
  revalidateEpisodeDrafts,
  type EpisodeDraft,
  type EpisodeKey,
  type EpisodiImportResponse,
  type EpisodiImportSummary,
  type EpisodioTemplateSource,
  type ReviewedEpisodeRow,
} from '@/features/opere/lib/episodi-import'

type ImportSuccess = Extract<EpisodiImportResponse, { ok: true }>

const EPISODE_FIELDS = [
  { key: 'stagione', label: 'Stagione' },
  { key: 'episodio', label: 'Episodio' },
  { key: 'titolo', label: 'Titolo' },
  { key: 'durataMinuti', label: 'Durata (minuti)' },
  { key: 'dataPrimaMessaInOnda', label: 'Data prima messa in onda' },
] as const

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
  const requestRef = useRef(0)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<'preview' | 'summary'>('preview')
  const [loadingMode, setLoadingMode] = useState<'preview' | 'confirm' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ReviewedEpisodeRow[] | null>(null)
  const [existingKeys, setExistingKeys] = useState<EpisodeKey[]>([])
  const [summary, setSummary] = useState<EpisodiImportSummary | null>(null)

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

  const applyPayload = (payload: ImportSuccess, nextPhase: 'preview' | 'summary') => {
    setRows(payload.rows.map(reviewedFromPayload))
    setExistingKeys(payload.existingKeys ?? [])
    setSummary(nextPhase === 'summary' ? payload.summary : null)
    setPhase(nextPhase)
  }

  const submitPreview = async (file: File) => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    setLoadingMode('preview')
    setError(null)
    setRows(null)
    setSummary(null)
    try {
      const token = await accessToken()
      if (requestRef.current !== requestId) return
      if (!token) {
        setError('Sessione scaduta. Accedi di nuovo.')
        return
      }
      const body = new FormData()
      body.append('file', file)
      body.append('mode', 'preview')
      const response = await fetch(`/api/opere/${operaId}/episodi/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      const payload = await response.json().catch(() => null) as EpisodiImportResponse | null
      if (requestRef.current !== requestId) return
      if (!response.ok || !payload || !payload.ok) {
        setError(payload && !payload.ok ? payload.error : 'Importazione non riuscita.')
        return
      }
      applyPayload(payload, 'preview')
    } catch (submitError) {
      console.error(submitError)
      if (requestRef.current === requestId) setError('Importazione non riuscita.')
    } finally {
      if (requestRef.current === requestId) setLoadingMode(null)
    }
  }

  const confirmRows = async () => {
    if (!rows || loadingMode) return
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    setLoadingMode('confirm')
    setError(null)
    try {
      const token = await accessToken()
      if (requestRef.current !== requestId) return
      if (!token) {
        setError('Sessione scaduta. Accedi di nuovo.')
        return
      }
      const response = await fetch(`/api/opere/${operaId}/episodi/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'confirm',
          rows: rows.map((row) => ({
            rowNumber: row.rowNumber,
            included: row.included,
            draft: row.draft,
          })),
        }),
      })
      const payload = await response.json().catch(() => null) as EpisodiImportResponse | null
      if (requestRef.current !== requestId) return
      if (!response.ok || !payload || !payload.ok) {
        setError(payload && !payload.ok ? payload.error : 'Importazione non riuscita.')
        return
      }
      applyPayload(payload, 'summary')
    } catch (submitError) {
      console.error(submitError)
      if (requestRef.current === requestId) setError('Importazione non riuscita.')
    } finally {
      if (requestRef.current === requestId) setLoadingMode(null)
    }
  }

  const onFileChange = (file: File | undefined) => {
    if (!file) return
    setOpen(true)
    setPhase('preview')
    setRows(null)
    setSummary(null)
    setError(null)
    void submitPreview(file)
  }

  const closeDialog = (nextOpen: boolean) => {
    if (nextOpen) return
    const imported = phase === 'summary' ? summary?.imported ?? 0 : 0
    requestRef.current += 1
    setOpen(false)
    setLoadingMode(null)
    setPhase('preview')
    setRows(null)
    setExistingKeys([])
    setSummary(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
    if (imported > 0) onImported()
  }

  const changeValue = (rowNumber: number, key: string, value: string) => {
    setRows((current) => {
      if (!current) return current
      const next = current.map((row) => (
        row.rowNumber === rowNumber
          ? { ...row, draft: { ...row.draft, [key]: value } as EpisodeDraft }
          : row
      ))
      return revalidateEpisodeDrafts(next, existingKeys)
    })
  }

  const changeIncluded = (rowNumber: number, included: boolean) => {
    setRows((current) => current?.map((row) => (
      row.rowNumber === rowNumber && row.status === 'valid' ? { ...row, included } : row
    )) ?? current)
  }

  const alerts = (rows ?? []).filter((row) => row.status === 'skipped' && row.message)
  const importable = (rows ?? []).filter((row) => row.status === 'valid' && row.included).length

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
        <DialogContent className="flex max-h-[min(90vh,860px)] w-full flex-col gap-4 overflow-hidden sm:max-w-6xl">
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle>
              {phase === 'summary' ? 'Importazione completata' : 'Anteprima importazione episodi'}
            </DialogTitle>
            <DialogDescription>
              {phase === 'summary'
                ? 'Sono stati importati solo gli episodi inclusi e ancora validi. Gli episodi già presenti non sono stati aggiornati.'
                : 'Le righe segnalate sono evidenziate con il motivo. Puoi correggere stagione, episodio, titolo, durata e data: la riga viene ricontrollata subito e puoi includerla o escluderla. Non viene scritto nulla prima della conferma.'}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
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

          {rows && (
            <div className="space-y-3">
              <p className="text-sm">
                {phase === 'summary' && summary
                  ? summaryLine(summary)
                  : previewLine(rows)}
              </p>
              {importable === 0 && phase === 'preview' && (
                <p className="text-sm text-muted-foreground">Nessuna riga inclusa da importare.</p>
              )}
              {alerts.length > 0 && (
                <div role="alert" className="rounded-md border px-3 py-2 text-sm space-y-1">
                  <p className="font-medium">Avvisi</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {alerts.map((alert) => (
                      <li key={`${alert.rowNumber}-${alert.message}`}>
                        Riga {alert.rowNumber}: {alert.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <EditableImportPreview
                fields={[...EPISODE_FIELDS]}
                rows={rows.map((row) => ({
                  rowNumber: row.rowNumber,
                  status: row.status,
                  message: row.message,
                  included: row.included,
                  values: row.draft,
                }))}
                disabled={phase === 'summary' || loadingMode !== null}
                onValueChange={changeValue}
                onIncludedChange={changeIncluded}
              />
            </div>
          )}
          </div>

          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={() => closeDialog(false)} disabled={loadingMode !== null}>
              {phase === 'summary' ? 'Chiudi' : 'Annulla'}
            </Button>
            {phase === 'preview' && (
              <Button
                type="button"
                onClick={() => void confirmRows()}
                disabled={loadingMode !== null || !rows || importable === 0}
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

async function accessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

function reviewedFromPayload(row: ReviewedEpisodeRow | (Omit<ReviewedEpisodeRow, 'draft' | 'included'> & {
  draft?: EpisodeDraft
  included?: boolean
})): ReviewedEpisodeRow {
  const draft = row.draft ?? {
    stagione: row.stagione != null ? String(row.stagione) : '',
    episodio: row.episodio != null ? String(row.episodio) : '',
    titolo: row.titolo ?? '',
    durataMinuti: row.durataMinuti != null ? String(row.durataMinuti) : '',
    dataPrimaMessaInOnda: italianDate(row.dataPrimaMessaInOnda),
  }
  return {
    ...row,
    draft,
    included: typeof row.included === 'boolean' ? row.included : row.status === 'valid',
  }
}

function toBlobPart(content: Uint8Array | string): BlobPart {
  if (typeof content === 'string') return content
  const copy = new ArrayBuffer(content.byteLength)
  new Uint8Array(copy).set(content)
  return copy
}

function previewLine(rows: ReviewedEpisodeRow[]): string {
  const toImport = rows.filter((row) => row.status === 'valid' && row.included).length
  const skipped = rows.filter((row) => row.status === 'skipped').length
  const excluded = rows.filter((row) => row.status === 'valid' && !row.included).length
  const parts = [toImportCount(toImport), skippedCount(skipped)]
  if (excluded > 0) parts.push(excludedCount(excluded))
  return `${parts.join(', ')} su ${rows.length}.`
}

function summaryLine(summary: EpisodiImportSummary): string {
  return `${episodeCount(summary.imported)}, ${excludedCount(summary.excluded)}, ${skippedCount(summary.skipped)}.`
}

function toImportCount(count: number): string {
  return count === 1 ? '1 episodio da importare' : `${count} episodi da importare`
}

function skippedCount(count: number): string {
  return count === 1 ? '1 riga ignorata' : `${count} righe ignorate`
}

function excludedCount(count: number): string {
  return count === 1 ? '1 riga esclusa' : `${count} righe escluse`
}

function episodeCount(count: number): string {
  return count === 1 ? '1 episodio importato' : `${count} episodi importati`
}

function italianDate(iso: string | null): string {
  if (!iso) return ''
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return iso
  return `${match[3]}/${match[2]}/${match[1]}`
}
