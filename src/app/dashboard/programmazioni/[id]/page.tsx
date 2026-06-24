'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getCampagnaProgrammazioneById, listProgrammazioniByCampagnaKeyset, getProgrammazioniHealth, CampagnaProgrammazione, ProgrammazioneRow, ProgrammazioniCursor, ProgrammazioniHealth } from '@/features/programmazioni/services/programmazioni.service'
import {
  getProgrammazioniTableColumns,
  type ProgrammazioniTableColumn,
  type ProgrammazioniTableColumnKey,
} from '@/features/programmazioni/services/data-health-policy.service'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { DashboardBreadcrumbs } from '@/shared/components/dashboard-breadcrumbs'
import { Calendar, Tv, Filter, Loader2, ArrowLeft, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

export default function CampagnaDettaglioPage() {
  const params = useParams()
  const campagnaId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)

  const [campagna, setCampagna] = useState<CampagnaProgrammazione | null>(null)
  const [rows, setRows] = useState<ProgrammazioneRow[]>([])
  const [cursor, setCursor] = useState<ProgrammazioniCursor | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [health, setHealth] = useState<ProgrammazioniHealth | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [loadingHealth, setLoadingHealth] = useState(false)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [processato, setProcessato] = useState<string>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showAllColumns, setShowAllColumns] = useState(false)

  const processatoBool = useMemo(() => {
    if (processato === 'true') return true
    if (processato === 'false') return false
    return undefined
  }, [processato])

  const tableColumns = useMemo(() => getProgrammazioniTableColumns(
    health?.policy ?? { preset: 'lineare', fields: {} },
    { showAll: showAllColumns }
  ), [health?.policy, showAllColumns])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q)
      setCursor(undefined) // Reset cursor on search change
    }, 300)
    return () => clearTimeout(timer)
  }, [q])

  const fetchCampagna = useCallback(async () => {
    try {
      const { data, error } = await getCampagnaProgrammazioneById(campagnaId)
      if (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : String(error)
        console.error('Errore caricamento campagna:', errorMessage, error)
        setCampagna(null)
        return
      }
    setCampagna(data || null)
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null
        ? JSON.stringify(error)
        : String(error)
      console.error('Errore caricamento campagna:', errorMessage, error)
      setCampagna(null)
    }
  }, [campagnaId])

  const fetchFirstPage = useCallback(async () => {
    setLoading(true)
    try {
      const { data, nextCursor, error } = await listProgrammazioniByCampagnaKeyset(
      campagnaId,
      200,
      undefined,
        { q: debouncedQ || undefined, processato: typeof processatoBool === 'boolean' ? processatoBool : undefined, fromDate: fromDate || undefined, toDate: toDate || undefined }
    )
      if (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : String(error)
        console.error('Errore caricamento programmazioni:', errorMessage, error)
        setRows([])
        setCursor(undefined)
        return
      }
    setRows(data || [])
    setCursor(nextCursor)
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null
        ? JSON.stringify(error)
        : String(error)
      console.error('Errore caricamento programmazioni:', errorMessage, error)
      setRows([])
      setCursor(undefined)
    } finally {
    setLoading(false)
    }
  }, [campagnaId, debouncedQ, processatoBool, fromDate, toDate])

  const fetchHealth = useCallback(async () => {
    setLoadingHealth(true)
    setHealthError(null)
    try {
      const { data, error } = await getProgrammazioniHealth(campagnaId)
      if (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : String(error)
        console.error('Errore caricamento health:', errorMessage, error)
        setHealthError(errorMessage)
        setHealth(null)
        return
      }
    setHealth(data || null)
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null
        ? JSON.stringify(error)
        : String(error)
      console.error('Errore caricamento health:', errorMessage, error)
      setHealthError(errorMessage)
      setHealth(null)
    } finally {
    setLoadingHealth(false)
    }
  }, [campagnaId])

  const loadMore = useCallback(async () => {
    if (!cursor) return
    setLoadingMore(true)
    const { data, nextCursor } = await listProgrammazioniByCampagnaKeyset(
      campagnaId,
      200,
      cursor,
      { q: q || undefined, processato: typeof processatoBool === 'boolean' ? processatoBool : undefined, fromDate: fromDate || undefined, toDate: toDate || undefined }
    )
    setRows(prev => [...prev, ...(data || [])])
    setCursor(nextCursor)
    setLoadingMore(false)
  }, [campagnaId, cursor, q, processatoBool, fromDate, toDate])

  // Load campagna metadata and health on mount
  useEffect(() => {
    if (!campagnaId) return
    const loadMeta = async () => {
      try {
        await Promise.all([fetchCampagna(), fetchHealth()])
      } catch (error) {
        console.error('Errore caricamento metadati campagna:', error)
      }
    }
    loadMeta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campagnaId])

  // Load/reload programmazioni on mount and whenever filters change
  useEffect(() => {
    if (!campagnaId) return
    fetchFirstPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campagnaId, debouncedQ, processatoBool, fromDate, toDate])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  const getHealthStatusLabel = (status: string) => {
    if (status === 'required') return 'Richiesto'
    if (status === 'recommended') return 'Consigliato'
    if (status === 'optional') return 'Opzionale'
    return 'Non applicabile'
  }

  const formatNumber = (value: number | null | undefined) =>
    typeof value === 'number' ? value.toLocaleString('it-IT') : '-'

  const formatCurrencyLike = (value: number | null | undefined) =>
    typeof value === 'number'
      ? value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '-'

  const renderProgrammazioneCell = (row: ProgrammazioneRow, column: ProgrammazioniTableColumn) => {
    switch (column.key) {
      case 'processato':
        return row.processato ? (
          <div title="Processato"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
        ) : row.errori_processamento ? (
          <div title={typeof row.errori_processamento === 'string' ? row.errori_processamento : JSON.stringify(row.errori_processamento)}>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        ) : (
          <div title="In attesa"><Clock className="h-5 w-5 text-gray-400" /></div>
        )
      case 'data_trasmissione':
        return row.data_trasmissione ? formatDate(row.data_trasmissione) : '-'
      case 'ora_inizio':
        return row.ora_inizio || '-'
      case 'canale':
        return row.canale || row.emittente || '-'
      case 'titolo':
        return (
          <div className="font-medium">
            <div>{row.titolo}</div>
            {getEpisodeDisplay(row) && (
              <div
                className="text-xs text-gray-500 truncate max-w-[300px]"
                title={getEpisodeDisplay(row) ?? undefined}
              >
                {getEpisodeDisplay(row)}
              </div>
            )}
            {getEpisodeNormalizationLabel(row) && (
              <Badge
                variant="outline"
                className={`mt-1 text-[10px] ${getEpisodeNormalizationBadgeClass(row)}`}
              >
                {getEpisodeNormalizationLabel(row)}
              </Badge>
            )}
            {row.descrizione && <div className="text-xs text-gray-500 truncate max-w-[300px]">{row.descrizione}</div>}
          </div>
        )
      case 'tipo':
        return row.tipo_trasmissione || row.tipo || '-'
      case 'durata_minuti':
        return row.durata_minuti != null ? `${row.durata_minuti} min` : '-'
      case 'titolo_episodio':
        return row.titolo_episodio || '-'
      case 'titolo_episodio_originale':
        return row.titolo_episodio_originale || '-'
      case 'numero_stagione':
        return row.numero_stagione ?? '-'
      case 'numero_episodio':
        return row.numero_episodio ?? '-'
      case 'fascia_oraria':
        return row.fascia_oraria || '-'
      case 'anno':
        return row.anno ?? '-'
      case 'sales_month':
        return row.sales_month ?? '-'
      case 'views':
        return formatNumber(row.views)
      case 'retail_price':
        return formatCurrencyLike(row.retail_price)
      case 'total_revenue':
        return formatCurrencyLike(row.total_revenue)
      case 'total_net_ad_revenue':
        return formatCurrencyLike(row.total_net_ad_revenue)
      default:
        return '-'
    }
  }

  const getColumnClassName = (key: ProgrammazioniTableColumnKey) => {
    if (key === 'processato') return 'w-[50px]'
    if (key === 'titolo') return 'min-w-[300px]'
    return undefined
  }

  const getEpisodeDisplay = (row: ProgrammazioneRow) => {
    const title = row.titolo_episodio || row.titolo_episodio_originale
    const hasEpisodeNumber = row.numero_stagione != null || row.numero_episodio != null
    if (!title && !hasEpisodeNumber) return null

    const code = hasEpisodeNumber
      ? `S${row.numero_stagione ?? '?'}E${row.numero_episodio ?? '?'}`
      : 'Episodio'

    return title ? `${code}: ${title}` : code
  }

  const getEpisodeNormalizationLabel = (row: ProgrammazioneRow) => {
    const normalization = getEpisodeNormalizationMetadata(row)
    if (normalization?.confidence === 'review_required') return 'review episodio'
    if (normalization?.confidence === 'high') return 'normalizzato'
    return null
  }

  const getEpisodeNormalizationBadgeClass = (row: ProgrammazioneRow) => {
    return getEpisodeNormalizationLabel(row) === 'review episodio'
      ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
      : 'border-blue-200 bg-blue-50 text-blue-800'
  }

  const getEpisodeNormalizationMetadata = (row: ProgrammazioneRow): { confidence?: string } | null => {
    const metadata = row.metadati_trasmissione
    const normalization = metadata?.episode_normalization
    return normalization && typeof normalization === 'object' ? normalization as { confidence?: string } : null
  }

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dettaglio Campagna</h1>
            <p className="text-gray-600">Caricamento dati</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardBreadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Programmazioni', href: '/dashboard/programmazioni' },
          { label: campagna?.nome || 'Dettaglio campagna' },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dettaglio Campagna</h1>
          <p className="text-gray-600">Programmazioni associate</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/programmazioni">
            <ArrowLeft className="h-4 w-4 mr-2" /> Indietro
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <div className="text-sm font-medium text-gray-500">Nome Campagna</div>
              <div className="text-lg font-medium">{campagna?.nome || '-'}</div>
            </div>
            {campagna?.descrizione && (
              <div className="col-span-2">
                <div className="text-sm font-medium text-gray-500">Descrizione / Note</div>
                <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{campagna.descrizione}</div>
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-gray-500">Emittente</div>
              <div className="flex items-center gap-2"><Tv className="h-4 w-4 text-gray-400" /><span>{campagna?.emittenti?.nome || '-'}</span></div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Anno</div>
              <div className="font-mono">{campagna?.anno}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Stato</div>
              <div className="mt-1"><Badge variant="outline">{campagna?.stato}</Badge></div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Creato il</div>
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /><span>{campagna?.created_at ? formatDate(campagna.created_at) : '-'}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-medium">Copertura dati</div>
              {health?.policy && (
                <div className="text-xs text-gray-500">
                  Profilo: {health.policy.presetLabel}
                </div>
              )}
            </div>
            {loadingHealth && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          {healthError && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <span>Copertura dati non disponibile: {healthError}</span>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <div className="text-xs text-gray-500">Totale</div>
              <div className="text-lg font-semibold">{health?.total ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Processate</div>
              <div className="text-lg font-semibold">{health?.processed ?? 0}</div>
              <div className="h-2 bg-gray-200 rounded mt-1">
                <div className="h-2 bg-blue-600 rounded" style={{ width: `${Math.min(100, Math.round(((health?.processed ?? 0) / Math.max(1, health?.total ?? 0)) * 100))}%` }} />
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Non processate</div>
              <div className="text-lg font-semibold">{health?.unprocessed ?? 0}</div>
              <div className="h-2 bg-gray-200 rounded mt-1">
                <div className="h-2 bg-gray-500 rounded" style={{ width: `${Math.min(100, Math.round(((health?.unprocessed ?? 0) / Math.max(1, health?.total ?? 0)) * 100))}%` }} />
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Errori</div>
              <div className="text-lg font-semibold">{health?.errors_count ?? 0}</div>
            </div>
          </div>
          {health?.field_metrics && health.field_metrics.length > 0 && (
            <div className="mt-5">
              <div className="text-sm font-medium mb-2">Campi attesi</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {health.field_metrics.map(metric => (
                  <div key={metric.key} className="rounded border bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{metric.label}</div>
                        <div className="text-xs text-gray-500">{getHealthStatusLabel(metric.status)}</div>
                      </div>
                      <Badge variant={metric.status === 'required' ? 'destructive' : 'outline'}>
                        {metric.percent}%
                      </Badge>
                    </div>
                    <div className="mt-2 text-lg font-semibold">{metric.missing}</div>
                    <div className="text-xs text-gray-500">record mancanti</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 text-xs text-gray-600">
            Periodo: {health?.date_min ? new Date(health.date_min).toLocaleDateString('it-IT') : '-'} → {health?.date_max ? new Date(health.date_max).toLocaleDateString('it-IT') : '-'}
            {health?.date_range_error && (
              <span className="ml-2 text-amber-700">({health.date_range_error})</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Input placeholder="Cerca per titolo..." value={q} onChange={(e) => { setQ(e.target.value); setCursor(undefined) }} />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-40">
                <select className="w-full border rounded h-10 px-3" value={processato} onChange={(e) => { setProcessato(e.target.value); setCursor(undefined) }}>
                  <option value="all">Tutti</option>
                  <option value="true">Processato</option>
                  <option value="false">Non processato</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setCursor(undefined) }} />
                <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setCursor(undefined) }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium">Programmazioni caricate</div>
              <div className="text-xs text-gray-500">
                Colonne adattate al profilo {health?.policy?.presetLabel ?? 'Rete lineare'}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllColumns(prev => !prev)}
            >
              {showAllColumns ? 'Mostra colonne profilo' : 'Mostra tutte le colonne'}
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                {tableColumns.map(column => (
                  <TableHead key={column.key} className={getColumnClassName(column.key)}>
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tableColumns.length} className="text-center py-8 text-gray-500">Nessun risultato</TableCell>
                </TableRow>
              ) : (
                rows.map(r => (
                  <TableRow key={r.id} className="hover:bg-gray-50">
                    {tableColumns.map(column => (
                      <TableCell key={column.key}>
                        {renderProgrammazioneCell(r, column)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="p-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">Mostrando {rows.length} risultati</div>
            <Button onClick={loadMore} disabled={!cursor || loadingMore}>
              {loadingMore ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Caricamento...</> : (cursor ? 'Carica altri' : 'Fine elenco')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
