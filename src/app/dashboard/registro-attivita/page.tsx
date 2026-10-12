'use client'

import { Fragment, Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronRight, History, Loader2, X } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { useAuth } from '@/shared/contexts/auth-context'
import { getErrorMessage } from '@/shared/lib/toast'
import {
  AZIONE_LABELS,
  TABELLA_LABELS,
  auditRecordHref,
  buildAuditDiff,
  formatAzione,
  formatCampo,
  formatTabella,
  type AuditAzione,
} from '@/features/registro-attivita/lib/audit-log-display'
import { listAuditLog, type AuditLogEntry, type AuditLogFilters } from '@/features/registro-attivita/services/audit-log.service'

const AZIONE_STYLES: Record<AuditAzione, string> = {
  INSERT: 'bg-green-50 text-green-700 border-green-200',
  UPDATE: 'bg-blue-50 text-blue-700 border-blue-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
  LOGIN: 'bg-slate-50 text-slate-700 border-slate-200',
}

const ALL = 'all'

function RegistroAttivitaContent() {
  const { isAdmin, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const artistaId = searchParams.get('artista') ?? undefined
  const operaId = searchParams.get('opera') ?? undefined

  const [draft, setDraft] = useState<AuditLogFilters>({})
  const [filters, setFilters] = useState<AuditLogFilters>({})
  const [rows, setRows] = useState<AuditLogEntry[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const load = useCallback(
    async (nextPage: number) => {
      setLoading(true)
      const { data, hasMore: more, error: loadError } = await listAuditLog({ ...filters, artistaId, operaId }, nextPage)
      if (loadError) {
        setError(getErrorMessage(loadError, 'Impossibile caricare il registro.'))
      } else {
        setError(null)
        setRows((current) => (nextPage === 0 ? data : [...current, ...data]))
        setHasMore(more)
        setPage(nextPage)
      }
      setLoading(false)
    },
    [filters, artistaId, operaId],
  )

  useEffect(() => {
    if (!authLoading && isAdmin) void load(0)
  }, [authLoading, isAdmin, load])

  if (authLoading) {
    return <div className="h-32 animate-pulse rounded bg-muted" />
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Il registro attività è consultabile solo dagli amministratori.
        </CardContent>
      </Card>
    )
  }

  const toggle = (id: number) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const applyFilters = () => setFilters({ ...draft })
  const resetFilters = () => {
    setDraft({})
    setFilters({})
  }

  return (
    <div className="space-y-4">
      {(artistaId || operaId) && (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary">
            Filtrato su {artistaId ? 'un artista' : 'un\'opera'}
          </Badge>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/registro-attivita">
              <X className="h-3.5 w-3.5 mr-1" />
              Togli filtro
            </Link>
          </Button>
        </div>
      )}

      <Card className="py-4">
        <CardContent className="px-4">
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end"
            onSubmit={(event) => {
              event.preventDefault()
              applyFilters()
            }}
          >
            <Input
              placeholder="Utente (email)"
              aria-label="Filtra per utente"
              value={draft.utente ?? ''}
              onChange={(event) => setDraft({ ...draft, utente: event.target.value })}
            />
            <Input
              placeholder="Cerca record (nome, titolo…)"
              aria-label="Cerca record"
              value={draft.testo ?? ''}
              onChange={(event) => setDraft({ ...draft, testo: event.target.value })}
            />
            <Select value={draft.azione || ALL} onValueChange={(value) => setDraft({ ...draft, azione: value === ALL ? undefined : value })}>
              <SelectTrigger aria-label="Filtra per azione">
                <SelectValue placeholder="Azione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutte le azioni</SelectItem>
                {(Object.keys(AZIONE_LABELS) as AuditAzione[]).map((azione) => (
                  <SelectItem key={azione} value={azione}>{AZIONE_LABELS[azione]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={draft.tabella || ALL} onValueChange={(value) => setDraft({ ...draft, tabella: value === ALL ? undefined : value })}>
              <SelectTrigger aria-label="Filtra per sezione">
                <SelectValue placeholder="Sezione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutte le sezioni</SelectItem>
                {Object.entries(TABELLA_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2 lg:col-span-1">
              <Input
                type="date"
                aria-label="Dal giorno"
                value={draft.dal ?? ''}
                onChange={(event) => setDraft({ ...draft, dal: event.target.value || undefined })}
              />
              <Input
                type="date"
                aria-label="Al giorno"
                value={draft.al ?? ''}
                onChange={(event) => setDraft({ ...draft, al: event.target.value || undefined })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Filtra</Button>
              <Button type="button" variant="outline" onClick={resetFilters}>Azzera</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card className="py-0 gap-0 overflow-hidden">
        <CardContent className="p-0">
          {rows.length === 0 && !loading ? (
            <p className="p-6 text-sm text-muted-foreground">Nessuna attività registrata per questi filtri.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-8 px-3 py-2" />
                    <th className="px-3 py-2">Quando</th>
                    <th className="px-3 py-2">Utente</th>
                    <th className="px-3 py-2">Azione</th>
                    <th className="px-3 py-2">Sezione</th>
                    <th className="px-3 py-2">Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((entry) => {
                    const isOpen = expanded.has(entry.id)
                    const diff = isOpen ? buildAuditDiff(entry) : []
                    const href = auditRecordHref(entry)
                    const canExpand = entry.azione !== 'LOGIN'
                    return (
                      <Fragment key={entry.id}>
                        <tr className="hover:bg-muted/30">
                          <td className="px-3 py-2">
                            {canExpand && (
                              <button
                                type="button"
                                onClick={() => toggle(entry.id)}
                                aria-label={isOpen ? 'Nascondi dettagli' : 'Mostra dettagli'}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                            {new Date(entry.occurred_at).toLocaleString('it-IT')}
                          </td>
                          <td className="px-3 py-2">
                            <div>{entry.user_email ?? (entry.user_ruolo === 'sistema' ? 'Sistema' : '—')}</div>
                            {entry.user_ruolo && entry.user_ruolo !== 'sistema' && (
                              <div className="text-xs text-muted-foreground">{entry.user_ruolo}</div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={AZIONE_STYLES[entry.azione] ?? ''}>
                              {formatAzione(entry.azione)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatTabella(entry.tabella)}</td>
                          <td className="px-3 py-2">
                            {href ? (
                              <Link href={href} className="hover:text-primary hover:underline">
                                {entry.record_label || entry.record_id || '—'}
                              </Link>
                            ) : (
                              entry.record_label || entry.record_id || '—'
                            )}
                            {entry.azione === 'UPDATE' && entry.campi_modificati && (
                              <div className="text-xs text-muted-foreground">
                                {entry.campi_modificati.map(formatCampo).join(', ')}
                              </div>
                            )}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-muted/20">
                            <td />
                            <td colSpan={5} className="px-3 py-2">
                              {diff.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Nessun dettaglio.</p>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead className="text-muted-foreground">
                                    <tr>
                                      <th className="py-1 pr-3 text-left font-medium">Campo</th>
                                      <th className="py-1 pr-3 text-left font-medium">Prima</th>
                                      <th className="py-1 text-left font-medium">Dopo</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {diff.map((row) => (
                                      <tr key={row.campo} className="align-top">
                                        <td className="py-1 pr-3 font-medium">{formatCampo(row.campo)}</td>
                                        <td className="py-1 pr-3 break-all text-muted-foreground">{row.prima}</td>
                                        <td className="py-1 break-all">{row.dopo}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Caricamento…
            </div>
          )}
        </CardContent>
      </Card>

      {hasMore && !loading && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => load(page + 1)}>Carica altre attività</Button>
        </div>
      )}
    </div>
  )
}

export default function RegistroAttivitaPage() {
  return (
    <div className="space-y-6 p-4 lg:p-0">
      <div>
        <h1 className="flex items-center text-2xl lg:text-3xl font-bold tracking-tight">
          <History className="mr-2 h-7 w-7" />
          Registro attività
        </h1>
        <p className="text-sm text-muted-foreground">
          Tutte le operazioni fatte dagli account: creazioni, modifiche, eliminazioni e accessi. Lo storico non scade.
        </p>
      </div>
      <Suspense fallback={<div className="h-32 animate-pulse rounded bg-muted" />}>
        <RegistroAttivitaContent />
      </Suspense>
    </div>
  )
}
