'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCampagnaProgrammazioneById, listProgrammazioniByCampagnaKeyset, getProgrammazioniHealth, CampagnaProgrammazione, ProgrammazioneRow, ProgrammazioniCursor, ProgrammazioniHealth } from '@/features/programmazioni/services/programmazioni.service'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Calendar, Tv, Filter, Loader2, ArrowLeft, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

export default function CampagnaDettaglioPage() {
  const params = useParams()
  const router = useRouter()
  const campagnaId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)

  const [campagna, setCampagna] = useState<CampagnaProgrammazione | null>(null)
  const [rows, setRows] = useState<ProgrammazioneRow[]>([])
  const [cursor, setCursor] = useState<ProgrammazioniCursor | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [health, setHealth] = useState<ProgrammazioniHealth | null>(null)
  const [loadingHealth, setLoadingHealth] = useState(false)
  const [q, setQ] = useState('')
  const [processato, setProcessato] = useState<string>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const processatoBool = useMemo(() => {
    if (processato === 'true') return true
    if (processato === 'false') return false
    return undefined
  }, [processato])

  const fetchCampagna = useCallback(async () => {
    const { data } = await getCampagnaProgrammazioneById(campagnaId)
    setCampagna(data || null)
  }, [campagnaId])

  const fetchFirstPage = useCallback(async () => {
    setLoading(true)
    const { data, nextCursor } = await listProgrammazioniByCampagnaKeyset(
      campagnaId,
      200,
      undefined,
      { q: q || undefined, processato: typeof processatoBool === 'boolean' ? processatoBool : undefined, fromDate: fromDate || undefined, toDate: toDate || undefined }
    )
    setRows(data || [])
    setCursor(nextCursor)
    setLoading(false)
  }, [campagnaId, q, processatoBool, fromDate, toDate])

  const fetchHealth = useCallback(async () => {
    setLoadingHealth(true)
    const { data } = await getProgrammazioniHealth(campagnaId)
    setHealth(data || null)
    setLoadingHealth(false)
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

  useEffect(() => {
    if (!campagnaId) return
    fetchCampagna()
    fetchHealth()
  }, [campagnaId, fetchCampagna])

  useEffect(() => {
    if (!campagnaId) return
    fetchFirstPage()
  }, [campagnaId, fetchFirstPage])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dettaglio Campagna</h1>
          <p className="text-gray-600">Programmazioni associate</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Indietro
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
            <div className="font-medium">Data Health</div>
            {loadingHealth && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
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
              <div className="text-xs text-gray-500">Titolo mancante</div>
              <div className="text-lg font-semibold">{health?.missing_title ?? 0}</div>
              <Badge variant="outline" className="mt-1">{Math.round(((health?.missing_title ?? 0) / Math.max(1, health?.total ?? 0)) * 100)}%</Badge>
            </div>
            <div>
              <div className="text-xs text-gray-500">Durata mancante</div>
              <div className="text-lg font-semibold">{health?.missing_duration ?? 0}</div>
              <Badge variant="outline" className="mt-1">{Math.round(((health?.missing_duration ?? 0) / Math.max(1, health?.total ?? 0)) * 100)}%</Badge>
            </div>
            <div>
              <div className="text-xs text-gray-500">Errori</div>
              <div className="text-lg font-semibold">{health?.errors_count ?? 0}</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            Periodo: {health?.date_min ? new Date(health.date_min).toLocaleDateString('it-IT') : '-'} → {health?.date_max ? new Date(health.date_max).toLocaleDateString('it-IT') : '-'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Input placeholder="Cerca per titolo..." value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-40">
                <select className="w-full border rounded h-10 px-3" value={processato} onChange={(e) => setProcessato(e.target.value)}>
                  <option value="all">Tutti</option>
                  <option value="true">Processato</option>
                  <option value="false">Non processato</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                <Button variant="outline" onClick={() => { setCursor(undefined); fetchFirstPage() }}>Applica</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Stato</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ora</TableHead>
                <TableHead>Canale</TableHead>
                <TableHead className="min-w-[300px]">Titolo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Durata</TableHead>
                <TableHead>Fascia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">Nessun risultato</TableCell>
                </TableRow>
              ) : (
                rows.map(r => (
                  <TableRow key={r.id} className="hover:bg-gray-50">
                    <TableCell>
                      {r.processato ? (
                        <div title="Processato"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
                      ) : r.errori_processamento ? (
                        <div title={typeof r.errori_processamento === 'string' ? r.errori_processamento : JSON.stringify(r.errori_processamento)}><AlertCircle className="h-5 w-5 text-red-500" /></div>
                      ) : (
                        <div title="In attesa"><Clock className="h-5 w-5 text-gray-400" /></div>
                      )}
                    </TableCell>
                    <TableCell>{r.data_trasmissione ? formatDate(r.data_trasmissione) : '-'}</TableCell>
                    <TableCell>{r.ora_inizio}</TableCell>
                    <TableCell>{r.canale || r.emittente || '-'}</TableCell>
                    <TableCell className="font-medium">
                      <div>{r.titolo}</div>
                      {r.descrizione && <div className="text-xs text-gray-500 truncate max-w-[300px]">{r.descrizione}</div>}
                    </TableCell>
                    <TableCell>{r.tipo_trasmissione || r.tipo || '-'}</TableCell>
                    <TableCell>{r.durata_minuti ? `${r.durata_minuti} min` : '-'}</TableCell>
                    <TableCell>{r.fascia_oraria || '-'}</TableCell>
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
