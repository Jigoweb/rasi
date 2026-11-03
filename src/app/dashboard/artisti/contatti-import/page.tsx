'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { DashboardBreadcrumbs } from '@/shared/components/dashboard-breadcrumbs'
import { useAuth } from '@/shared/contexts/auth-context'
import { canManageArtistiContatti } from '@/shared/lib/auth-permissions'
import {
  rowsToEdits,
  summarizeContattiCommit,
  type ContattiCatalogArtist,
  type ContattiCommitSummary,
  type ContattiImportRow,
  type ContattiPreviewSummary,
} from '@/features/artisti/lib/contatti-import'
import { ContattiImportPreview } from './contatti-import-preview'
import { Loader2 } from 'lucide-react'

type PreviewResponse = {
  rows: ContattiImportRow[]
  summary: ContattiPreviewSummary
  artisti?: ContattiCatalogArtist[]
  error?: string
}

type CommitResponse = {
  rows?: ContattiImportRow[]
  summary?: ContattiCommitSummary
  error?: string
}

async function readJson<T>(response: Response): Promise<T & { error?: string }> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error || 'Richiesta non riuscita')
  return body
}

export default function ContattiImportPage() {
  const { userRole, loading } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ContattiImportRow[]>([])
  const [artisti, setArtisti] = useState<ContattiCatalogArtist[]>([])
  const [summary, setSummary] = useState<ContattiPreviewSummary | null>(null)
  const [commitSummary, setCommitSummary] = useState<ContattiCommitSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (loading) return <p className="text-sm text-muted-foreground">Caricamento…</p>
  if (!canManageArtistiContatti(userRole)) {
    return <p>Solo amministratori e operatori possono recuperare i contatti degli artisti.</p>
  }

  const applyPreview = (body: PreviewResponse, keepCatalog: boolean) => {
    setRows(body.rows)
    setSummary(body.summary)
    if (!keepCatalog && body.artisti) setArtisti(body.artisti)
    setCommitSummary(null)
  }

  const upload = async () => {
    if (!file) {
      setError('Seleziona un file .xlsx o .csv')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('file', file)
      const body = await readJson<PreviewResponse>(await fetch('/api/artisti/contatti-import', { method: 'POST', body: form }))
      applyPreview(body, false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Errore durante la lettura del file')
    } finally {
      setBusy(false)
    }
  }

  const revalidate = async (nextRows: ContattiImportRow[] = rows) => {
    setBusy(true)
    setError(null)
    try {
      const body = await readJson<PreviewResponse>(await fetch('/api/artisti/contatti-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'revalidate', rows: rowsToEdits(nextRows) }),
      }))
      applyPreview(body, true)
      return body.rows
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Errore durante l\'aggiornamento dell\'anteprima')
      return null
    } finally {
      setBusy(false)
    }
  }

  const askSave = async () => {
    const fresh = await revalidate()
    if (!fresh) return
    if (summarizeContattiCommit(fresh).artistiAggiornati === 0) {
      setError('Nessuna riga selezionata comporta un aggiornamento. Controlla le righe da verificare o deselezionate.')
      return
    }
    setConfirmOpen(true)
  }

  const commit = async () => {
    setBusy(true)
    setError(null)
    try {
      const body = await readJson<CommitResponse>(await fetch('/api/artisti/contatti-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'commit', rows: rowsToEdits(rows) }),
      }))
      if (body.rows) setRows(body.rows)
      if (body.summary) setCommitSummary(body.summary)
      setConfirmOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Errore durante il salvataggio')
    } finally {
      setBusy(false)
    }
  }

  const updateRow = (rowNumber: number, map: (row: ContattiImportRow) => ContattiImportRow) => {
    setRows((current) => current.map((row) => (row.rowNumber === rowNumber ? map(row) : row)))
  }

  const planned = summarizeContattiCommit(rows)

  return (
    <div className="space-y-6">
      <DashboardBreadcrumbs items={[{ label: 'Artisti', href: '/dashboard/artisti' }, { label: 'Recupero contatti' }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recupero contatti</h1>
        <p className="text-gray-600">
          Carica il file, controlla l&apos;anteprima e conferma solo le righe giuste. Nessun artista nuovo viene creato.
          I campi già compilati restano invariati, salvo scelta esplicita di sostituzione.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File</CardTitle>
          <CardDescription>
            Formato principale .xlsx. È accettato anche un CSV separato da punto e virgola, con le colonne
            cognome, nome, email, via, cap, citta, provincia, telefono, codice_fiscale, partita_iva, regime, tassazione, dettagli_regime.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-label="File contatti"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <Button type="button" onClick={upload} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Carica anteprima
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/artisti">Torna agli artisti</Link>
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {commitSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Riepilogo salvataggio</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>Artisti aggiornati: {commitSummary.artistiAggiornati}</p>
            <p>Campi compilati: {commitSummary.campiCompilati}</p>
            <p>Conflitti sostituiti: {commitSummary.conflittiSostituiti}</p>
            <p>Conflitti mantenuti: {commitSummary.conflittiMantenuti}</p>
            <p>Righe saltate: {commitSummary.saltati}</p>
            <p>Righe invariate: {commitSummary.invariati}</p>
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Anteprima</CardTitle>
            <CardDescription>
              {summary.righe} righe · {summary.pronti} pronte · {summary.daVerificare} da verificare · {summary.conflitti} con conflitti · {summary.senzaArtista} senza artista · {summary.invariati} già aggiornate · {summary.selezionati} selezionate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={() => setRows((current) => current.map((row) => ({ ...row, included: row.includibile })))}>
                Seleziona righe applicabili
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setRows((current) => current.map((row) => ({ ...row, included: false })))}>
                Deseleziona tutto
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => { void revalidate() }}>
                Ricalcola corrispondenze
              </Button>
              <Button type="button" disabled={busy} onClick={askSave}>
                Salva selezione
              </Button>
            </div>
            <ContattiImportPreview
              rows={rows}
              artisti={artisti}
              disabled={busy}
              onIncludedChange={(rowNumber, included) => updateRow(rowNumber, (row) => ({ ...row, included: row.includibile && included }))}
              onValueChange={(rowNumber, key, value) => updateRow(rowNumber, (row) => ({
                ...row,
                values: { ...row.values, [key]: value },
                fields: row.fields.map((field) => (field.key === key ? { ...field, incoming: value } : field)),
              }))}
              onArtistaChange={(rowNumber, artistaId) => {
                const next = rows.map((row) => (
                  row.rowNumber === rowNumber
                    ? { ...row, artistaId, matchType: 'manuale' as const, included: true }
                    : row
                ))
                setRows(next)
                void revalidate(next)
              }}
              onDecisionChange={(rowNumber, key, decision) => updateRow(rowNumber, (row) => ({
                ...row,
                fields: row.fields.map((field) => (field.key === key ? { ...field, decision } : field)),
              }))}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confermi il recupero contatti?</DialogTitle>
            <DialogDescription>
              Verranno aggiornati {planned.artistiAggiornati} artisti, con {planned.campiCompilati} campi compilati
              e {planned.conflittiSostituiti} conflitti sostituiti. {planned.conflittiMantenuti} conflitti restano
              come in anagrafica. {planned.saltati} righe sono saltate. Un secondo import dello stesso file non modifica nulla.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>
              Annulla
            </Button>
            <Button type="button" onClick={commit} disabled={busy}>
              Conferma e salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
