'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, Plus, MoreHorizontal, Edit, Trash2, Eye, Download, Filter, Calendar, Clock, Tv } from 'lucide-react'
import CSVImport from '@/components/csv-import'

type Programmazione = Database['public']['Tables']['programmazioni']['Row']

export default function ProgrammazioniPage() {
  const [programmazioni, setProgrammazioni] = useState<Programmazione[]>([])
  const [filteredProgrammazioni, setFilteredProgrammazioni] = useState<Programmazione[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [fasciaFilter, setFasciaFilter] = useState<string>('all')
  const [selectedProgrammazione, setSelectedProgrammazione] = useState<Programmazione | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  

  useEffect(() => {
    fetchProgrammazioni()
  }, [])

  useEffect(() => {
    filterProgrammazioni()
  }, [programmazioni, searchQuery, fasciaFilter])

  const fetchProgrammazioni = async () => {
    try {
      const { data, error } = await supabase
        .from('programmazioni')
        .select('*')
        .order('data_trasmissione', { ascending: false })
        .limit(100) // Limit for performance

      if (error) throw error
      setProgrammazioni(data || [])
    } catch (error) {
      console.error('Error fetching programmazioni:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterProgrammazioni = () => {
    let filtered = programmazioni

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(prog =>
        prog.titolo_programmazione.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prog.tipo_trasmissione && prog.tipo_trasmissione.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Filter by fascia oraria
    if (fasciaFilter !== 'all') {
      filtered = filtered.filter(prog => prog.fascia_oraria === fasciaFilter)
    }

    setFilteredProgrammazioni(filtered)
  }

  const getFasciaBadge = (fascia: string | null) => {
    if (!fascia) return <Badge variant="outline" className="bg-gray-50 text-gray-700">Non specificata</Badge>
    
    switch (fascia) {
      case 'prima_serata':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Prima Serata</Badge>
      case 'seconda_serata':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Seconda Serata</Badge>
      case 'access':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Access Prime</Badge>
      case 'daytime':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Daytime</Badge>
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">{fascia}</Badge>
    }
  }

  const getTipoTrasmissioneBadge = (tipo: string | null) => {
    if (!tipo) return <Badge variant="secondary">Non specificato</Badge>
    
    switch (tipo) {
      case 'prima_visione':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Prima Visione</Badge>
      case 'replica':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Replica</Badge>
      case 'live':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Live</Badge>
      default:
        return <Badge variant="secondary">{tipo}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5) // HH:MM format
  }

  const exportData = () => {
    const csvContent = [
      ['Data', 'Ora Inizio', 'Ora Fine', 'Titolo', 'Fascia Oraria', 'Tipo Trasmissione', 'Durata'].join(','),
      ...filteredProgrammazioni.map(prog => [
        formatDate(prog.data_trasmissione),
        formatTime(prog.ora_inizio),
        prog.ora_fine ? formatTime(prog.ora_fine) : '',
        `"${prog.titolo_programmazione}"`,
        prog.fascia_oraria || '',
        prog.tipo_trasmissione || '',
        prog.durata_minuti || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `programmazioni_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Programmazioni</h1>
            <p className="text-gray-600">Gestione delle programmazioni televisive</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Programmazioni</h1>
          <p className="text-gray-600">Gestione delle programmazioni televisive</p>
        </div>
        <div className="flex gap-2">
          <CSVImport onImportComplete={fetchProgrammazioni} />
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Esporta CSV
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Programmazione
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
                  placeholder="Cerca per titolo programmazione..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={fasciaFilter} onValueChange={setFasciaFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtra per fascia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le fasce</SelectItem>
                <SelectItem value="prima_serata">Prima Serata</SelectItem>
                <SelectItem value="seconda_serata">Seconda Serata</SelectItem>
                <SelectItem value="access">Access Prime</SelectItem>
                <SelectItem value="daytime">Daytime</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Mostrando {filteredProgrammazioni.length} di {programmazioni.length} programmazioni
          </div>
        </CardContent>
      </Card>

      {/* Programming Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Data</TableHead>
                <TableHead className="w-24">Ora Inizio</TableHead>
                <TableHead className="w-24">Ora Fine</TableHead>
                <TableHead>Titolo Programmazione</TableHead>
                <TableHead className="w-32">Fascia Oraria</TableHead>
                <TableHead className="w-32">Tipo</TableHead>
                <TableHead className="w-20">Durata</TableHead>
                <TableHead className="w-16">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProgrammazioni.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Nessuna programmazione trovata con i criteri di ricerca attuali
                  </TableCell>
                </TableRow>
              ) : (
                filteredProgrammazioni.map((prog) => (
                  <TableRow key={prog.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{formatDate(prog.data_trasmissione)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="font-mono">{formatTime(prog.ora_inizio)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {prog.ora_fine ? (
                        <span className="font-mono">{formatTime(prog.ora_fine)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tv className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{prog.titolo_programmazione}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getFasciaBadge(prog.fascia_oraria)}
                    </TableCell>
                    <TableCell>
                      {getTipoTrasmissioneBadge(prog.tipo_trasmissione)}
                    </TableCell>
                    <TableCell className="text-center">
                      {prog.durata_minuti ? `${prog.durata_minuti}m` : <span className="text-gray-400">—</span>}
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
                              setSelectedProgrammazione(prog)
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

      {/* Programming Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dettagli Programmazione</DialogTitle>
            <DialogDescription>
              Informazioni complete per "{selectedProgrammazione?.titolo_programmazione}"
            </DialogDescription>
          </DialogHeader>
          
          {selectedProgrammazione && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Data Trasmissione</label>
                  <p className="font-medium">{formatDate(selectedProgrammazione.data_trasmissione)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Orario</label>
                  <p className="font-mono">
                    {formatTime(selectedProgrammazione.ora_inizio)}
                    {selectedProgrammazione.ora_fine && ` - ${formatTime(selectedProgrammazione.ora_fine)}`}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Titolo Programmazione</label>
                  <p className="text-lg font-medium">{selectedProgrammazione.titolo_programmazione}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Fascia Oraria</label>
                  <div className="mt-1">{getFasciaBadge(selectedProgrammazione.fascia_oraria)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipo Trasmissione</label>
                  <div className="mt-1">{getTipoTrasmissioneBadge(selectedProgrammazione.tipo_trasmissione)}</div>
                </div>
                {selectedProgrammazione.durata_minuti && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Durata</label>
                    <p>{selectedProgrammazione.durata_minuti} minuti</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Data Inserimento</label>
                  <p>{new Date(selectedProgrammazione.created_at).toLocaleString('it-IT')}</p>
                </div>
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