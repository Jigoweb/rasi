'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCampagnaProgrammazioneById, listProgrammazioniByCampagnaKeyset, CampagnaProgrammazione, ProgrammazioneRow, ProgrammazioniCursor } from '@/features/programmazioni/services/programmazioni.service'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Calendar, Tv, Filter, Loader2, ArrowLeft } from 'lucide-react'

export default function CampagnaDettaglioPage() {
  const params = useParams()
  const router = useRouter()
  const campagnaId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)

  const [campagna, setCampagna] = useState<CampagnaProgrammazione | null>(null)
  const [rows, setRows] = useState<ProgrammazioneRow[]>([])
  const [cursor, setCursor] = useState<ProgrammazioniCursor | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
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
                <TableHead>Data</TableHead>
                <TableHead>Ora Inizio</TableHead>
                <TableHead>Durata</TableHead>
                <TableHead>Titolo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fascia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">Nessun risultato</TableCell>
                </TableRow>
              ) : (
                rows.map(r => (
                  <TableRow key={r.id} className="hover:bg-gray-50">
                    <TableCell>{r.data_trasmissione ? formatDate(r.data_trasmissione) : '-'}</TableCell>
                    <TableCell>{r.ora_inizio}</TableCell>
                    <TableCell>{r.durata_minuti ?? '-'}</TableCell>
                    <TableCell className="font-medium">{r.titolo}</TableCell>
                    <TableCell>{r.tipo_trasmissione || '-'}</TableCell>
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

