'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/shared/lib/supabase'
import { Database } from '@/shared/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Search, MoreHorizontal, Eye, Download, Filter, Play, Pause, CheckCircle, Clock, AlertCircle, Euro } from 'lucide-react'

type CampagnaRipartizione = Database['public']['Tables']['campagne_ripartizione']['Row']

export default function RipartizioniPage() {
  const router = useRouter()
  const [campagne, setCampagne] = useState<CampagnaRipartizione[]>([])
  const [filtered, setFiltered] = useState<CampagnaRipartizione[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

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
    try {
      const { data, error } = await supabase
        .from('campagne_ripartizione')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCampagne(data || [])
    } catch (error) {
      console.error('Error fetching campagne ripartizione:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (stato: string | null) => {
    switch (stato) {
      case 'pianificata':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Clock className="h-3 w-3 mr-1" />Pianificata</Badge>
      case 'in_corso':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200"><Play className="h-3 w-3 mr-1" />In Corso</Badge>
      case 'completata':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Completata</Badge>
      case 'distribuita':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><Euro className="h-3 w-3 mr-1" />Distribuita</Badge>
      case 'sospesa':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Pause className="h-3 w-3 mr-1" />Sospesa</Badge>
      case 'annullata':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="h-3 w-3 mr-1" />Annullata</Badge>
      default:
        return stato ? <Badge variant="outline">{stato}</Badge> : null
    }
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
    const rows = [
      ['Nome', 'Stato', 'Periodo Inizio', 'Periodo Fine', 'Importo Disponibile', 'Descrizione'].join(','),
      ...filtered.map(c => [
        `"${c.nome}"`,
        c.stato || '',
        c.periodo_riferimento_inizio ? formatDate(c.periodo_riferimento_inizio) : '',
        c.periodo_riferimento_fine ? formatDate(c.periodo_riferimento_fine) : '',
        c.importo_totale_disponibile ?? '',
        `"${c.descrizione || ''}"`,
      ].join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + rows], { type: 'text/csv;charset=utf-8' })
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
        <Card><CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
          </div>
        </CardContent></Card>
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
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca per nome..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtra per stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="pianificata">Pianificata</SelectItem>
                <SelectItem value="in_corso">In Corso</SelectItem>
                <SelectItem value="completata">Completata</SelectItem>
                <SelectItem value="distribuita">Distribuita</SelectItem>
                <SelectItem value="sospesa">Sospesa</SelectItem>
                <SelectItem value="annullata">Annullata</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter('all') }}>
              Reset
            </Button>
          </div>
          <div className="mt-3 text-sm text-gray-500">
            {filtered.length} di {campagne.length} campagne
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
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
                    Nessuna campagna trovata
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(c => (
                  <TableRow
                    key={c.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/ripartizioni/${c.id}`)}
                  >
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{getStatusBadge(c.stato)}</TableCell>
                    <TableCell className="text-sm">{formatDate(c.periodo_riferimento_inizio)}</TableCell>
                    <TableCell className="text-sm">{formatDate(c.periodo_riferimento_fine)}</TableCell>
                    <TableCell className="text-sm font-mono">{formatImporto(c.importo_totale_disponibile)}</TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-xs truncate">{c.descrizione || '—'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={e => e.stopPropagation()}>
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
        </CardContent>
      </Card>
    </div>
  )
}
