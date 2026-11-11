'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/shared/lib/supabase'
import { Database } from '@/shared/lib/supabase'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { EmptyState, PageErrorState, PageLoadingState } from '@/shared/components/page-states'
import { SearchInput } from '@/shared/components/search-input'
import { clickableRowClassName, handleClickableRowKeyDown } from '@/shared/lib/clickable-row'
import { MoreHorizontal, Eye, Download, Filter, Calendar } from 'lucide-react'
import { RipartizioneStatusBadge } from '@/features/ripartizioni/components/RipartizioneStatusBadge'
import { buildRipartizioniCsv } from '@/features/ripartizioni/lib/ripartizioni-csv'
import {
  RIPARTIZIONE_STATUS_LABELS,
  RIPARTIZIONE_STATUSES,
} from '@/shared/lib/dashboard-status-vocabulary'

type CampagnaRipartizione = Database['public']['Tables']['campagne_ripartizione']['Row']

export default function RipartizioniPage() {
  const router = useRouter()
  const [campagne, setCampagne] = useState<CampagnaRipartizione[]>([])
  const [filtered, setFiltered] = useState<CampagnaRipartizione[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const hasActiveFilters = searchQuery.trim().length > 0 || statusFilter !== 'all'

  const applyFilters = useCallback(() => {
    let result = campagne
    if (searchQuery) {
      result = result.filter(c =>
        c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.descrizione && c.descrizione.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    if (statusFilter !== 'all') {
      result = result.filter(c => c.stato === statusFilter)
    }
    setFiltered(result)
  }, [campagne, searchQuery, statusFilter])

  useEffect(() => { fetchCampagne() }, [])
  useEffect(() => { applyFilters() }, [applyFilters])

  const fetchCampagne = async () => {
    setError(null)
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('campagne_ripartizione')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCampagne(data || [])
    } catch (error) {
      console.error('Error fetching campagne ripartizione:', error)
      setError(error instanceof Error ? error.message : 'Errore sconosciuto')
      setCampagne([])
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  const formatImporto = (value: unknown) => {
    const n = parseFloat(String(value))
    if (isNaN(n)) return '—'
    return `€${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const exportCsv = () => {
    const rows = buildRipartizioniCsv(filtered.map(c => ({
      nome: c.nome,
      stato: c.stato,
      periodoInizio: c.periodo_riferimento_inizio ? formatDate(c.periodo_riferimento_inizio) : '',
      periodoFine: c.periodo_riferimento_fine ? formatDate(c.periodo_riferimento_fine) : '',
      importoDisponibile: c.importo_totale_disponibile ?? '',
      descrizione: c.descrizione,
    })))

    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ripartizioni_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold tracking-tight">Ripartizioni</h1></div>
        <PageLoadingState title="Caricamento ripartizioni" description="Stiamo recuperando le campagne di ripartizione." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold tracking-tight">Ripartizioni</h1></div>
        <PageErrorState
          description="Non siamo riusciti a caricare le campagne di ripartizione. Riprova."
          onRetry={fetchCampagne}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ripartizioni</h1>
          <p className="text-gray-600">Campagne di ripartizione dei diritti</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-2" />
          Esporta CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="gap-4 py-4">
        <CardContent className="px-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                placeholder="Cerca per nome o descrizione..."
                initialValue={searchQuery}
                onSearch={setSearchQuery}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtra per stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                {RIPARTIZIONE_STATUSES.map(stato => (
                  <SelectItem key={stato} value={stato}>
                    {RIPARTIZIONE_STATUS_LABELS[stato]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={resetFilters} disabled={!hasActiveFilters}>
              Reset
            </Button>
          </div>
          <div className="mt-3 text-sm text-gray-500">
            {filtered.length} di {campagne.length} campagne
            {hasActiveFilters ? ' filtrate' : ''}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="w-36">Stato</TableHead>
                <TableHead className="w-32">Periodo Inizio</TableHead>
                <TableHead className="w-32">Periodo Fine</TableHead>
                <TableHead className="w-40">Importo Disponibile</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {hasActiveFilters ? 'Nessuna campagna corrisponde ai filtri attuali.' : 'Non ci sono campagne disponibili.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(c => (
                  <TableRow
                    key={c.id}
                    className={clickableRowClassName}
                    role="link"
                    tabIndex={0}
                    aria-label={`Apri dettaglio ripartizione ${c.nome}`}
                    onClick={() => router.push(`/dashboard/ripartizioni/${c.id}`)}
                    onKeyDown={(event) => handleClickableRowKeyDown(event, () => router.push(`/dashboard/ripartizioni/${c.id}`))}
                  >
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell><RipartizioneStatusBadge stato={c.stato} /></TableCell>
                    <TableCell className="text-sm">{formatDate(c.periodo_riferimento_inizio)}</TableCell>
                    <TableCell className="text-sm">{formatDate(c.periodo_riferimento_fine)}</TableCell>
                    <TableCell className="text-sm font-mono">{formatImporto(c.importo_totale_disponibile)}</TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-xs truncate">{c.descrizione || '—'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Azioni per ${c.nome}`}
                            onClick={e => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); router.push(`/dashboard/ripartizioni/${c.id}`) }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Dettaglio
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          <div className="lg:hidden space-y-4 p-4">
            {filtered.length === 0 ? (
              <EmptyState
                title={hasActiveFilters ? 'Nessuna campagna corrisponde ai filtri attuali' : 'Non ci sono campagne disponibili'}
                description={hasActiveFilters ? 'Cancella i filtri per tornare alla lista completa.' : 'Quando verranno create campagne di ripartizione, le troverai qui.'}
                actionLabel={hasActiveFilters ? 'Cancella filtri' : undefined}
                onAction={hasActiveFilters ? resetFilters : undefined}
              />
            ) : (
              filtered.map(c => (
                <Card
                  key={c.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Apri dettaglio ripartizione ${c.nome}`}
                  className={`p-4 ${clickableRowClassName}`}
                  onClick={() => router.push(`/dashboard/ripartizioni/${c.id}`)}
                  onKeyDown={(event) => handleClickableRowKeyDown(event, () => router.push(`/dashboard/ripartizioni/${c.id}`))}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div>
                        <h2 className="font-medium text-foreground">{c.nome}</h2>
                        <p className="text-sm text-muted-foreground line-clamp-2">{c.descrizione || 'Nessuna descrizione'}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <RipartizioneStatusBadge stato={c.stato} />
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(c.periodo_riferimento_inizio)} - {formatDate(c.periodo_riferimento_fine)}
                        </span>
                      </div>
                      <div className="text-sm font-mono font-medium">{formatImporto(c.importo_totale_disponibile)}</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Azioni per ${c.nome}`}
                          onClick={e => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); router.push(`/dashboard/ripartizioni/${c.id}`) }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Dettaglio
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
