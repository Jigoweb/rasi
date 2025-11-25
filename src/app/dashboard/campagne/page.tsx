'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { Database } from '@/shared/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Search, Plus, MoreHorizontal, Edit, Trash2, Eye, Download, Filter, Play, Pause, CheckCircle, Clock, AlertCircle } from 'lucide-react'

type CampagnaIndividuazione = Database['public']['Tables']['campagne_individuazione']['Row']
type CampagnaRipartizione = Database['public']['Tables']['campagne_ripartizione']['Row']

type Campagna = (CampagnaIndividuazione | CampagnaRipartizione) & {
  tipo_campagna: 'individuazione' | 'ripartizione'
}

export default function CampagnePage() {
  const [campagne, setCampagne] = useState<Campagna[]>([])
  const [filteredCampagne, setFilteredCampagne] = useState<Campagna[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tipoFilter, setTipoFilter] = useState<string>('all')
  const [selectedCampagna, setSelectedCampagna] = useState<Campagna | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  

  const filterCampagne = useCallback(() => {
    let filtered = campagne

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(campagna =>
        campagna.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (campagna.descrizione && campagna.descrizione.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campagna => campagna.stato === statusFilter)
    }

    // Filter by campaign type
    if (tipoFilter !== 'all') {
      filtered = filtered.filter(campagna => campagna.tipo_campagna === tipoFilter)
    }

    setFilteredCampagne(filtered)
  }, [campagne, searchQuery, statusFilter, tipoFilter])

  useEffect(() => {
    fetchCampagne()
  }, [])

  useEffect(() => {
    filterCampagne()
  }, [filterCampagne])

  const fetchCampagne = async () => {
    try {
      // Fetch individuazione campaigns
      const { data: individuazioneData, error: individuazioneError } = await supabase
        .from('campagne_individuazione')
        .select('*')
        .order('data_inizio', { ascending: false })

      if (individuazioneError) throw individuazioneError

      // Fetch ripartizione campaigns
      const { data: ripartizioneData, error: ripartizioneError } = await supabase
        .from('campagne_ripartizione')
        .select('*')
        .order('data_inizio', { ascending: false })

      if (ripartizioneError) throw ripartizioneError

      // Combine and mark campaign types
      const individuazioneCampagne = (individuazioneData || []).map((c: any) => ({ ...c, tipo_campagna: 'individuazione' as const }));
      const ripartizioneCampagne = (ripartizioneData || []).map((c: any) => ({ ...c, tipo_campagna: 'ripartizione' as const }));

      const allCampagne: Campagna[] = [...individuazioneCampagne, ...ripartizioneCampagne];

      // Sort by date
      allCampagne.sort((a, b) => new Date(b.data_inizio).getTime() - new Date(a.data_inizio).getTime())

      setCampagne(allCampagne)
    } catch (error) {
      console.error('Error fetching campagne:', error)
    } finally {
      setLoading(false)
    }
  }



  const getStatusBadge = (stato: string) => {
    switch (stato) {
      case 'pianificata':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Pianificata
          </Badge>
        )
      case 'in_corso':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <Play className="h-3 w-3 mr-1" />
            In Corso
          </Badge>
        )
      case 'completata':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completata
          </Badge>
        )
      case 'sospesa':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Pause className="h-3 w-3 mr-1" />
            Sospesa
          </Badge>
        )
      case 'annullata':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Annullata
          </Badge>
        )
      default:
        return <Badge variant="outline">{stato}</Badge>
    }
  }

  const getTipoBadge = (tipo: 'individuazione' | 'ripartizione') => {
    switch (tipo) {
      case 'individuazione':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Search className="h-3 w-3 mr-1" />
            Individuazione
          </Badge>
        )
      case 'ripartizione':
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
            <MoreHorizontal className="h-3 w-3 mr-1" />
            Ripartizione
          </Badge>
        )
      default:
        return <Badge variant="outline">{tipo}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  const exportData = () => {
    const csvContent = [
      ['Nome', 'Tipo', 'Stato', 'Data Inizio', 'Data Fine', 'Descrizione'].join(','),
      ...filteredCampagne.map(campagna => [
        `"${campagna.nome}"`,
        campagna.tipo_campagna,
        campagna.stato,
        formatDate(campagna.data_inizio),
        campagna.data_fine ? formatDate(campagna.data_fine) : '',
        `"${campagna.descrizione || ''}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Report</h1>
        <p className="text-gray-600">Gestione dei report di individuazione e ripartizione</p>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report</h1>
        <p className="text-gray-600">Gestione dei report di individuazione e ripartizione</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Esporta CSV
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Campagna
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtri e Ricerca</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca per nome campagna..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
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
                <SelectItem value="sospesa">Sospesa</SelectItem>
                <SelectItem value="annullata">Annullata</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtra per tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                <SelectItem value="individuazione">Individuazione</SelectItem>
                <SelectItem value="ripartizione">Ripartizione</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Mostrando {filteredCampagne.length} di {campagne.length} report
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome Campagna</TableHead>
                <TableHead className="w-32">Tipo</TableHead>
                <TableHead className="w-32">Stato</TableHead>
                <TableHead className="w-32">Data Inizio</TableHead>
                <TableHead className="w-32">Data Fine</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead className="w-16">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampagne.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Nessuna campagna trovata con i criteri di ricerca attuali
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampagne.map((campagna) => (
                  <TableRow key={`${campagna.tipo_campagna}-${campagna.id}`} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="font-medium">{campagna.nome}</div>
                    </TableCell>
                    <TableCell>
                      {getTipoBadge(campagna.tipo_campagna)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(campagna.stato)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(campagna.data_inizio)}</div>
                    </TableCell>
                    <TableCell>
                      {campagna.data_fine ? (
                        <div className="text-sm">{formatDate(campagna.data_fine)}</div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {campagna.descrizione ? (
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {campagna.descrizione}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedCampagna(campagna)
                              setShowDetails(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizza
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Modifica
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Elimina
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

      {/* Campaign Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Dettagli Campagna</DialogTitle>
            <DialogDescription>
              Informazioni complete per &quot;{selectedCampagna?.nome}&quot;
            </DialogDescription>
          </DialogHeader>
          
          {selectedCampagna && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nome Campagna</label>
                  <p className="text-lg font-medium">{selectedCampagna.nome}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipo</label>
                  <div className="mt-1">{getTipoBadge(selectedCampagna.tipo_campagna)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Stato</label>
                  <div className="mt-1">{getStatusBadge(selectedCampagna.stato)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data Inizio</label>
                  <p>{formatDate(selectedCampagna.data_inizio)}</p>
                </div>
                {selectedCampagna.data_fine && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data Fine</label>
                    <p>{formatDate(selectedCampagna.data_fine)}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Data Creazione</label>
                  <p>{new Date(selectedCampagna.created_at).toLocaleString('it-IT')}</p>
                </div>
                {selectedCampagna.descrizione && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Descrizione</label>
                    <p className="text-sm text-gray-700 mt-1">{selectedCampagna.descrizione}</p>
                  </div>
                )}
                {selectedCampagna.tipo_campagna === 'individuazione' && 'parametri_individuazione' in selectedCampagna && selectedCampagna.parametri_individuazione && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Parametri Individuazione</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedCampagna.parametri_individuazione, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                {selectedCampagna.tipo_campagna === 'ripartizione' && 'parametri_ripartizione' in selectedCampagna && selectedCampagna.parametri_ripartizione && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Parametri Ripartizione</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedCampagna.parametri_ripartizione, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Chiudi
                </Button>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifica
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}