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
import { Search, Plus, MoreHorizontal, Edit, Trash2, Eye, Download, Filter, Film, Tv, FileText } from 'lucide-react'

type Opera = Database['public']['Tables']['opere']['Row']

export default function OperePage() {
  const [opere, setOpere] = useState<Opera[]>([])
  const [filteredOpere, setFilteredOpere] = useState<Opera[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedOpera, setSelectedOpera] = useState<Opera | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  

  useEffect(() => {
    fetchOpere()
  }, [])

  useEffect(() => {
    filterOpere()
  }, [opere, searchQuery, typeFilter])

  const fetchOpere = async () => {
    try {
      const { data, error } = await supabase
        .from('opere')
        .select('*')
        .order('anno_produzione', { ascending: false })

      if (error) throw error
      setOpere(data || [])
    } catch (error) {
      console.error('Error fetching opere:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterOpere = () => {
    let filtered = opere

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(opera =>
        opera.titolo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opera.codice_opera.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opera.titolo_originale && opera.titolo_originale.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (opera.casa_produzione && opera.casa_produzione.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(opera => opera.tipo === typeFilter)
    }

    setFilteredOpere(filtered)
  }

  const getTypeBadge = (tipo: string) => {
    switch (tipo) {
      case 'film':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Film className="h-3 w-3 mr-1" />
            Film
          </Badge>
        )
      case 'serie_tv':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Tv className="h-3 w-3 mr-1" />
            Serie TV
          </Badge>
        )
      case 'documentario':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <FileText className="h-3 w-3 mr-1" />
            Documentario
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            {tipo}
          </Badge>
        )
    }
  }

  const exportData = () => {
    const csvContent = [
      ['Codice', 'Titolo', 'Titolo Originale', 'Tipo', 'Anno', 'Durata', 'Generi', 'Paese', 'Casa Produzione'].join(','),
      ...filteredOpere.map(opera => [
        opera.codice_opera,
        `"${opera.titolo}"`,
        `"${opera.titolo_originale || ''}"`,
        opera.tipo,
        opera.anno_produzione,
        opera.durata_minuti || '',
        `"${opera.generi?.join(', ') || ''}"`,
        `"${opera.paese_produzione?.join(', ') || ''}"`,
        `"${opera.casa_produzione || ''}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `opere_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Opere</h1>
            <p className="text-gray-600">Gestione del catalogo opere</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Opere</h1>
          <p className="text-gray-600">Gestione del catalogo opere</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Esporta CSV
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Opera
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
                  placeholder="Cerca per titolo, codice opera, casa produzione..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtra per tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                <SelectItem value="film">Film</SelectItem>
                <SelectItem value="serie_tv">Serie TV</SelectItem>
                <SelectItem value="documentario">Documentario</SelectItem>
                <SelectItem value="altro">Altro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Mostrando {filteredOpere.length} di {opere.length} opere
          </div>
        </CardContent>
      </Card>

      {/* Works Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Codice</TableHead>
                <TableHead>Titolo</TableHead>
                <TableHead>Titolo Originale</TableHead>
                <TableHead className="w-32">Tipo</TableHead>
                <TableHead className="w-20">Anno</TableHead>
                <TableHead className="w-24">Durata</TableHead>
                <TableHead>Generi</TableHead>
                <TableHead>Casa Produzione</TableHead>
                <TableHead className="w-16">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOpere.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    Nessuna opera trovata con i criteri di ricerca attuali
                  </TableCell>
                </TableRow>
              ) : (
                filteredOpere.map((opera) => (
                  <TableRow key={opera.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">
                      {opera.codice_opera}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{opera.titolo}</div>
                    </TableCell>
                    <TableCell>
                      {opera.titolo_originale ? (
                        <span className="text-gray-600 italic">{opera.titolo_originale}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(opera.tipo)}
                    </TableCell>
                    <TableCell className="text-center">
                      {opera.anno_produzione}
                    </TableCell>
                    <TableCell className="text-center">
                      {opera.durata_minuti ? `${opera.durata_minuti}m` : <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {opera.generi?.slice(0, 2).map((genere, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {genere}
                          </Badge>
                        ))}
                        {(opera.generi?.length || 0) > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{(opera.generi?.length || 0) - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {opera.casa_produzione ? (
                        <span className="text-sm">{opera.casa_produzione}</span>
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
                              setSelectedOpera(opera)
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

      {/* Opera Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Dettagli Opera</DialogTitle>
            <DialogDescription>
              Informazioni complete per "{selectedOpera?.titolo}"
            </DialogDescription>
          </DialogHeader>
          
          {selectedOpera && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Codice Opera</label>
                  <p className="font-mono">{selectedOpera.codice_opera}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipo</label>
                  <div className="mt-1">{getTypeBadge(selectedOpera.tipo)}</div>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Titolo</label>
                  <p className="text-lg font-medium">{selectedOpera.titolo}</p>
                </div>
                {selectedOpera.titolo_originale && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Titolo Originale</label>
                    <p className="italic">{selectedOpera.titolo_originale}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Anno Produzione</label>
                  <p>{selectedOpera.anno_produzione}</p>
                </div>
                {selectedOpera.durata_minuti && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Durata</label>
                    <p>{selectedOpera.durata_minuti} minuti</p>
                  </div>
                )}
                {selectedOpera.casa_produzione && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Casa di Produzione</label>
                    <p>{selectedOpera.casa_produzione}</p>
                  </div>
                )}
                {selectedOpera.generi && selectedOpera.generi.length > 0 && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Generi</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedOpera.generi.map((genere, index) => (
                        <Badge key={index} variant="secondary">
                          {genere}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedOpera.paese_produzione && selectedOpera.paese_produzione.length > 0 && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Paesi di Produzione</label>
                    <p>{selectedOpera.paese_produzione.join(', ')}</p>
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