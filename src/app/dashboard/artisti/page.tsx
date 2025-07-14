'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, Plus, MoreHorizontal, Edit, Trash2, Eye, Download, Filter, User } from 'lucide-react'

type Artista = Database['public']['Tables']['artisti']['Row']

export default function ArtistiPage() {
  const router = useRouter()
  const [artisti, setArtisti] = useState<Artista[]>([])
  const [filteredArtisti, setFilteredArtisti] = useState<Artista[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedArtist, setSelectedArtist] = useState<Artista | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  

  useEffect(() => {
    fetchArtisti()
  }, [])

  useEffect(() => {
    filterArtisti()
  }, [artisti, searchQuery, statusFilter])

  const fetchArtisti = async () => {
    try {
      const { data, error } = await supabase
        .from('artisti')
        .select('*')
        .order('cognome', { ascending: true })

      if (error) throw error
      setArtisti(data || [])
    } catch (error) {
      console.error('Error fetching artisti:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterArtisti = () => {
    let filtered = artisti

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(artista =>
        artista.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artista.cognome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artista.codice_artista.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (artista.nome_arte && artista.nome_arte.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(artista => artista.stato === statusFilter)
    }

    setFilteredArtisti(filtered)
  }

  const getStatusBadge = (stato: string) => {
    switch (stato) {
      case 'attivo':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Attivo</Badge>
      case 'sospeso':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Sospeso</Badge>
      case 'inattivo':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Inattivo</Badge>
      default:
        return <Badge variant="outline">Sconosciuto</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  const exportData = () => {
    const csvContent = [
      ['Codice', 'Nome', 'Cognome', 'Nome Arte', 'Codice Fiscale', 'Stato', 'Data Nascita', 'Data Iscrizione'].join(','),
      ...filteredArtisti.map(artista => [
        artista.codice_artista,
        artista.nome,
        artista.cognome,
        artista.nome_arte || '',
        artista.codice_fiscale || '',
        artista.stato,
        artista.data_nascita || '',
        formatDate(artista.data_iscrizione)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `artisti_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Artisti</h1>
            <p className="text-gray-600">Gestione degli artisti registrati</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Artisti</h1>
          <p className="text-gray-600">Gestione degli artisti registrati</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Esporta CSV
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Artista
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <Input
                placeholder="Cerca per nome, cognome o codice artista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="attivo">Attivo</SelectItem>
                  <SelectItem value="inattivo">Inattivo</SelectItem>
                  <SelectItem value="sospeso">Sospeso</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Artists Table */}
      <Card>
        <CardHeader>
          <CardTitle>Artisti Registrati</CardTitle>
          <CardDescription>
            Gestisci gli artisti registrati nel sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codice</TableHead>
                  <TableHead>Nome Completo</TableHead>
                  <TableHead>Nome Arte</TableHead>
                  <TableHead>Codice Fiscale</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Data Nascita</TableHead>
                  <TableHead>Data Iscrizione</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArtisti.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      Nessun artista trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredArtisti.map((artista) => (
                    <TableRow key={artista.id}>
                      <TableCell className="font-mono text-sm">
                        {artista.codice_artista}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {artista.nome} {artista.cognome}
                          </div>
                          {artista.nome_arte && (
                            <div className="text-sm text-gray-500 italic">
                              "{artista.nome_arte}"
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {artista.nome_arte || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {artista.codice_fiscale || '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(artista.stato)}
                      </TableCell>
                      <TableCell>
                        {artista.data_nascita ? formatDate(artista.data_nascita) : '-'}
                      </TableCell>
                      <TableCell>
                        {formatDate(artista.data_iscrizione)}
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
                              onClick={() => router.push(`/dashboard/artisti/${artista.id}`)}
                            >
                              <User className="h-4 w-4 mr-2" />
                              Profilo
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedArtist(artista)
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
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {filteredArtisti.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nessun artista trovato
              </div>
            ) : (
              filteredArtisti.map((artista) => (
                <Card key={artista.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {artista.codice_artista}
                        </span>
                        {getStatusBadge(artista.stato)}
                      </div>
                      <h3 className="font-medium text-lg">
                        {artista.nome} {artista.cognome}
                      </h3>
                      {artista.nome_arte && (
                        <p className="text-sm text-gray-500 italic mb-2">
                          "{artista.nome_arte}"
                        </p>
                      )}
                      <div className="space-y-1 text-sm text-gray-600">
                        {artista.codice_fiscale && (
                          <p className="font-mono">{artista.codice_fiscale}</p>
                        )}
                        {artista.data_nascita && (
                          <p>Nato il {formatDate(artista.data_nascita)}</p>
                        )}
                        <p>Iscritto il {formatDate(artista.data_iscrizione)}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => router.push(`/dashboard/artisti/${artista.id}`)}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Profilo
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedArtist(artista)
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
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Artist Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dettagli Artista</DialogTitle>
            <DialogDescription>
              Informazioni complete per {selectedArtist?.nome} {selectedArtist?.cognome}
            </DialogDescription>
          </DialogHeader>
          
          {selectedArtist && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Codice Artista</label>
                  <p className="font-mono">{selectedArtist.codice_artista}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Stato</label>
                  <div className="mt-1">{getStatusBadge(selectedArtist.stato)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Nome</label>
                  <p>{selectedArtist.nome}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Cognome</label>
                  <p>{selectedArtist.cognome}</p>
                </div>
                {selectedArtist.nome_arte && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Nome d'Arte</label>
                    <p className="italic">"{selectedArtist.nome_arte}"</p>
                  </div>
                )}
                {selectedArtist.codice_fiscale && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Codice Fiscale</label>
                    <p className="font-mono">{selectedArtist.codice_fiscale}</p>
                  </div>
                )}
                {selectedArtist.data_nascita && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data di Nascita</label>
                    <p>{formatDate(selectedArtist.data_nascita)}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Data Iscrizione</label>
                  <p>{formatDate(selectedArtist.data_iscrizione)}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
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