'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getArtisti, getPartecipazioniCountByArtistaId, deleteArtista, type ArtistaFieldFilter } from '@/features/artisti/services/artisti.service'
import { Database } from '@/shared/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Plus, MoreHorizontal, Edit, Trash2, Eye, Download, AlertTriangle, Loader2, Filter, X } from 'lucide-react'
import { SearchInput } from '@/shared/components/search-input'
import { createArtista, updateArtista } from '@/features/artisti/services/artisti.service'
import { ArtistaFormMultistep } from './components/artista-form-multistep'

type Artista = Database['public']['Tables']['artisti']['Row']

const ARTISTI_FIELD_LABELS: Record<string, string> = {
  nome_arte: 'Nome d\'arte',
  codice_fiscale: 'Codice Fiscale',
  imdb_nconst: 'IMDB nconst',
  data_nascita: 'Data nascita',
  luogo_nascita: 'Luogo nascita',
  territorio: 'Territorio',
  stato: 'Stato',
  tipologia: 'Tipologia (AIE/Produttore)',
}

function ArtistiFilterPopover({ onAdd }: { onAdd: (f: ArtistaFieldFilter) => void }) {
  const [open, setOpen] = useState(false)
  const [field, setField] = useState<string>('')
  const [hasValue, setHasValue] = useState<boolean>(true)
  const [statoValue, setStatoValue] = useState<string>('')
  const [tipologiaValue, setTipologiaValue] = useState<string>('')

  const handleAdd = () => {
    if (!field) return
    if (field === 'stato' && statoValue) {
      onAdd({ field: 'stato', value: statoValue as 'attivo' | 'sospeso' | 'cessato' })
    } else if (field === 'tipologia' && tipologiaValue) {
      onAdd({ field: 'tipologia', value: tipologiaValue as 'AIE' | 'PRODUTTORE' })
    } else if (!['stato', 'tipologia'].includes(field)) {
      onAdd({ field: field as ArtistaFieldFilter['field'], hasValue })
    }
    setOpen(false)
    setField('')
    setStatoValue('')
    setTipologiaValue('')
    setHasValue(true)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Filter className="h-4 w-4 mr-2" />
          Aggiungi filtro
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Filtra per campo</h4>
          <Select value={field} onValueChange={(v) => { setField(v); setStatoValue(''); setTipologiaValue('') }}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona campo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nome_arte">Nome d&apos;arte</SelectItem>
              <SelectItem value="codice_fiscale">Codice Fiscale</SelectItem>
              <SelectItem value="imdb_nconst">IMDB nconst</SelectItem>
              <SelectItem value="data_nascita">Data nascita</SelectItem>
              <SelectItem value="luogo_nascita">Luogo nascita</SelectItem>
              <SelectItem value="territorio">Territorio</SelectItem>
              <SelectItem value="stato">Stato</SelectItem>
              <SelectItem value="tipologia">Tipologia (AIE/Produttore)</SelectItem>
            </SelectContent>
          </Select>
          {field === 'stato' ? (
            <Select value={statoValue} onValueChange={setStatoValue}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attivo">Attivo</SelectItem>
                <SelectItem value="sospeso">Sospeso</SelectItem>
                <SelectItem value="cessato">Cessato</SelectItem>
              </SelectContent>
            </Select>
          ) : field === 'tipologia' ? (
            <Select value={tipologiaValue} onValueChange={setTipologiaValue}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipologia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AIE">AIE</SelectItem>
                <SelectItem value="PRODUTTORE">Produttore</SelectItem>
              </SelectContent>
            </Select>
          ) : field ? (
            <Select value={hasValue ? 'si' : 'no'} onValueChange={(v) => setHasValue(v === 'si')}>
              <SelectTrigger>
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="si">Valorizzato</SelectItem>
                <SelectItem value="no">Non valorizzato</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          <Button
            onClick={handleAdd}
            disabled={!field || (field === 'stato' ? !statoValue : field === 'tipologia' ? !tipologiaValue : false)}
            className="w-full"
          >
            Aggiungi
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function ArtistiPage() {
  const router = useRouter()
  const [artisti, setArtisti] = useState<Artista[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [tipologiaFilter, setTipologiaFilter] = useState<'all' | true | false>('all')
  const [filters, setFilters] = useState<ArtistaFieldFilter[]>([])
  const [selectedArtist, setSelectedArtist] = useState<Artista | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  // Delete confirmation states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [artistToDelete, setArtistToDelete] = useState<Artista | null>(null)
  const [deleteCheckStatus, setDeleteCheckStatus] = useState<'idle' | 'checking' | 'can_delete' | 'has_partecipazioni'>('idle')
  const [partecipazioniCount, setPartecipazioniCount] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  
  useEffect(() => {
    fetchArtisti()
  }, [searchQuery, tipologiaFilter, filters])

  const fetchArtisti = async () => {
    if (artisti.length === 0 && !searchQuery && tipologiaFilter === 'all' && filters.length === 0) setLoading(true)
    try {
      const { data, error } = await getArtisti({
        search: searchQuery,
        is_rasi: tipologiaFilter,
        fieldFilters: filters,
      })
      if (error) throw error
      setArtisti(data || [])
    } catch (error) {
      console.error('Error fetching artisti:', error)
    } finally {
      setLoading(false)
    }
  }

  const addFilter = (filter: ArtistaFieldFilter) => {
    setFilters(prev => {
      const without = prev.filter(x => x.field !== filter.field)
      return [...without, filter]
    })
  }

  const removeFilter = (field: string) => {
    setFilters(prev => prev.filter(f => f.field !== field))
  }

  const hasActiveFilters = searchQuery || tipologiaFilter !== 'all' || filters.length > 0

  const getStatusBadge = (stato: string | null) => {
    if (!stato) return null
    switch (stato) {
      case 'attivo':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Attivo</Badge>
      case 'sospeso':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Sospeso</Badge>
      case 'cessato':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Cessato</Badge>
      default:
        return <Badge variant="outline">Sconosciuto</Badge>
    }
  }

  const getRasiBadge = (isRasi: boolean) => {
    if (isRasi) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">RASI</Badge>
    } else {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Esterno</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  const exportData = () => {
    const csvContent = [
      ['Codice IPN', 'Nome', 'Cognome', 'Nome Arte', 'Codice Fiscale', 'Tipologia', 'Stato', 'Data Nascita', 'Data Inizio Mandato'].join(','),
      ...artisti.map(artista => [
        artista.codice_ipn,
        artista.nome,
        artista.cognome,
        artista.nome_arte || '',
        artista.codice_fiscale || '',
        (artista.is_rasi ?? true) ? 'RASI' : 'Esterno',
        artista.stato,
        artista.data_nascita || '',
        formatDate(artista.data_inizio_mandato)
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

  // Form schema e logica sono ora gestiti dal componente ArtistaFormMultistep

  const openCreateForm = () => {
    setFormMode('create')
    setSelectedArtist(null)
    setSubmitStatus('idle')
    setSubmitError(null)
    setShowForm(true)
  }

  const toDateInput = (s?: string | null) => {
    if (!s) return ''
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0]
  }

  const openEditForm = (artista: Artista) => {
    setFormMode('edit')
    setSelectedArtist(artista)
    setSubmitStatus('idle')
    setSubmitError(null)
    setShowForm(true)
  }

  const openDeleteDialog = async (artista: Artista) => {
    setArtistToDelete(artista)
    setDeleteCheckStatus('checking')
    setShowDeleteDialog(true)
    
    // Check if artist has participations
    const { count, error } = await getPartecipazioniCountByArtistaId(artista.id)
    
    if (error) {
      console.error('Error checking partecipazioni:', error)
      setDeleteCheckStatus('idle')
      return
    }
    
    setPartecipazioniCount(count)
    setDeleteCheckStatus(count > 0 ? 'has_partecipazioni' : 'can_delete')
  }

  const handleDeleteArtista = async () => {
    if (!artistToDelete) return
    
    setIsDeleting(true)
    
    const { error } = await deleteArtista(artistToDelete.id)
    
    if (error) {
      console.error('Error deleting artista:', error)
      setIsDeleting(false)
      return
    }
    
    // Refresh list and close dialog
    await fetchArtisti()
    setShowDeleteDialog(false)
    setArtistToDelete(null)
    setDeleteCheckStatus('idle')
    setIsDeleting(false)
  }

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false)
    setArtistToDelete(null)
    setDeleteCheckStatus('idle')
    setPartecipazioniCount(0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Artisti</h1>
          <p className="text-gray-600">Gestione degli artisti registrati</p>
          <div className="mt-2 flex gap-2 lg:hidden">
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Esporta CSV
            </Button>
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Artista
            </Button>
          </div>
        </div>
        <div className="hidden lg:flex gap-2">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Esporta CSV
          </Button>
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Artista
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput onSearch={setSearchQuery} initialValue={searchQuery} placeholder="Cerca per nome, cognome o codice artista..." />
            </div>
            <Select
              value={tipologiaFilter === 'all' ? 'all' : tipologiaFilter ? 'true' : 'false'}
              onValueChange={(v) => {
                if (v === 'all') setTipologiaFilter('all')
                else setTipologiaFilter(v === 'true')
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtra per tipologia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le tipologie</SelectItem>
                <SelectItem value="true">RASI</SelectItem>
                <SelectItem value="false">Esterni</SelectItem>
              </SelectContent>
            </Select>
            <ArtistiFilterPopover onAdd={addFilter} />
            <Button
              variant="outline"
              onClick={() => { setSearchQuery(''); setTipologiaFilter('all'); setFilters([]) }}
              disabled={!hasActiveFilters}
            >
              Reset
            </Button>
          </div>
          {/* Filter Chips */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {searchQuery && (
                <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="h-8">
                  Ricerca: {searchQuery}
                  <X className="h-3 w-3 ml-2" />
                </Button>
              )}
              {tipologiaFilter !== 'all' && (
                <Button variant="outline" size="sm" onClick={() => setTipologiaFilter('all')} className="h-8">
                  Tipologia: {tipologiaFilter ? 'RASI' : 'Esterni'}
                  <X className="h-3 w-3 ml-2" />
                </Button>
              )}
              {filters.map((f) => (
                <Button
                  key={f.field}
                  variant="outline"
                  size="sm"
                  onClick={() => removeFilter(f.field)}
                  className="h-8"
                >
                  {'value' in f
                    ? `${ARTISTI_FIELD_LABELS[f.field]}: ${f.field === 'stato' ? (f.value === 'attivo' ? 'Attivo' : f.value === 'sospeso' ? 'Sospeso' : 'Cessato') : f.value}`
                    : `${ARTISTI_FIELD_LABELS[f.field]}: ${f.hasValue ? 'Valorizzato' : 'Non valorizzato'}`}
                  <X className="h-3 w-3 ml-2" />
                </Button>
              ))}
            </div>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            {loading ? (
              <span className="animate-pulse">Caricamento...</span>
            ) : (
              <span>
                {artisti.length === 0 ? (
                  hasActiveFilters ? (
                    <>Nessun risultato trovato con i filtri selezionati</>
                  ) : (
                    <>Nessun artista nel catalogo</>
                  )
                ) : (
                  <>Mostrando <strong>{artisti.length}</strong> {artisti.length === 1 ? 'risultato' : 'risultati'}</>
                )}
              </span>
            )}
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
            {loading ? (
              <div className="animate-pulse space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="relative overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Codice IPN</TableHead>
                    <TableHead>Nome Completo</TableHead>
                    <TableHead>Tipologia</TableHead>
                    <TableHead>Codice Fiscale</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Data Nascita</TableHead>
                    <TableHead>Data Inizio Mandato</TableHead>
                    <TableHead className="text-right sticky right-0 bg-background z-10 w-[1%]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {artisti.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Nessun artista trovato con i criteri di ricerca attuali
                      </TableCell>
                    </TableRow>
                  ) : (
                    artisti.map((artista) => (
                      <TableRow
                        key={artista.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        tabIndex={0}
                        onClick={() => router.push(`/dashboard/artisti/${artista.id}`)}
                        onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/dashboard/artisti/${artista.id}`) }}
                      >
                        <TableCell className="font-mono text-sm">
                          {artista.codice_ipn}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="font-medium truncate max-w-[180px]">
                              {artista.nome} {artista.cognome}
                            </div>
                            {artista.nome_arte && (
                              <span className="text-sm text-gray-500 italic truncate max-w-[160px]">
                                &quot;{artista.nome_arte}&quot;
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getRasiBadge(artista.is_rasi ?? true)}
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
                          {formatDate(artista.data_inizio_mandato)}
                        </TableCell>
                        <TableCell className="sticky right-0 bg-background z-10 w-[1%]">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-label="Azioni" variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/artisti/${artista.id}`) }}>
                                <Eye className="h-4 w-4 mr-2" />
                                Dettaglio
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => { e.stopPropagation(); openEditForm(artista) }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Modifica
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); openDeleteDialog(artista) }}>
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
            )}
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {loading ? (
              <div className="animate-pulse space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <>
                {artisti.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nessun artista trovato con i criteri di ricerca attuali
                  </div>
                ) : (
                  artisti.map((artista) => (
                    <Card
                      key={artista.id}
                      className="p-4 cursor-pointer"
                      tabIndex={0}
                      onClick={() => router.push(`/dashboard/artisti/${artista.id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/dashboard/artisti/${artista.id}`) }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {artista.codice_ipn}
                            </span>
                            {getRasiBadge(artista.is_rasi ?? true)}
                            {getStatusBadge(artista.stato)}
                          </div>
                          <h3 className="font-medium text-lg">
                            {artista.nome} {artista.cognome}
                          </h3>
                          {artista.nome_arte && (
                            <p className="text-sm text-gray-500 italic mb-2">
                              &quot;{artista.nome_arte}&quot;
                            </p>
                          )}
                          <div className="space-y-1 text-sm text-gray-600">
                            {artista.codice_fiscale && (
                              <p className="font-mono">{artista.codice_fiscale}</p>
                            )}
                            {artista.data_nascita && (
                              <p>Nato il {formatDate(artista.data_nascita)}</p>
                            )}
                            <p>Mandato iniziato il {formatDate(artista.data_inizio_mandato)}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-label="Azioni" variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/artisti/${artista.id}`) }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Dettaglio
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditForm(artista) }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); openDeleteDialog(artista) }}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  ))
                )}
              </>
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
                  <label className="text-sm font-medium text-gray-500">Codice IPN</label>
                  <p className="font-mono">{selectedArtist.codice_ipn}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Stato</label>
                  <div className="mt-1">{getStatusBadge(selectedArtist.stato)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipologia</label>
                  <div className="mt-1">{getRasiBadge(selectedArtist.is_rasi ?? true)}</div>
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
                    <label className="text-sm font-medium text-gray-500">Nome d&apos;Arte</label>
                    <p className="italic">&quot;{selectedArtist.nome_arte}&quot;</p>
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
                  <label className="text-sm font-medium text-gray-500">Data Inizio Mandato</label>
                  <p>{formatDate(selectedArtist.data_inizio_mandato)}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Chiudi
                </Button>
                <Button onClick={() => selectedArtist && openEditForm(selectedArtist)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifica
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open && submitStatus !== 'loading') {
          setShowForm(false)
        }
      }}>
        <DialogContent className="max-w-4xl overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle>{formMode === 'create' ? 'Nuovo Artista' : 'Modifica Artista'}</DialogTitle>
          </DialogHeader>
          
          {submitStatus === 'success' ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-center">
                {formMode === 'create' ? 'Artista creato con successo!' : 'Artista aggiornato con successo!'}
              </h3>
              <p className="text-muted-foreground text-center">
                {formMode === 'create' 
                  ? 'Il nuovo artista è stato aggiunto al database.' 
                  : 'Le modifiche sono state salvate.'}
              </p>
              <Button onClick={() => setShowForm(false)} className="mt-4">
                Chiudi
              </Button>
            </div>
          ) : submitStatus === 'error' ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-center text-red-600">
                Errore durante il salvataggio
              </h3>
              <p className="text-muted-foreground text-center">
                {submitError || 'Si è verificato un errore. Riprova.'}
              </p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setSubmitStatus('idle')}>
                  Riprova
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Chiudi
                </Button>
              </div>
            </div>
          ) : (
            <ArtistaFormMultistep
              mode={formMode}
              artista={selectedArtist}
              onSubmit={async (data) => {
                setSubmitStatus('loading')
                try {
                  if (formMode === 'create') {
                    const { error } = await createArtista(data)
                    if (error) throw error
                  } else if (selectedArtist) {
                    const { error } = await updateArtista(selectedArtist.id, data)
                    if (error) throw error
                  }
                  setSubmitStatus('success')
                  await fetchArtisti()
                } catch (e) {
                  console.error(e)
                  setSubmitError(e instanceof Error ? e.message : 'Errore sconosciuto')
                  setSubmitStatus('error')
                }
              }}
              onCancel={() => setShowForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={closeDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Conferma Eliminazione
            </DialogTitle>
            <DialogDescription>
              {artistToDelete && (
                <>Stai per eliminare l&apos;artista <strong>{artistToDelete.nome} {artistToDelete.cognome}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {deleteCheckStatus === 'checking' && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifica partecipazioni in corso...
              </div>
            )}

            {deleteCheckStatus === 'has_partecipazioni' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Impossibile eliminare</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Questo artista ha <strong>{partecipazioniCount} partecipazion{partecipazioniCount === 1 ? 'e' : 'i'}</strong> associate. 
                      Rimuovi prima tutte le partecipazioni dalla pagina di dettaglio dell&apos;artista.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {deleteCheckStatus === 'can_delete' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  Questa azione è irreversibile. Tutti i dati dell&apos;artista verranno eliminati permanentemente.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDeleteDialog}>
              Annulla
            </Button>
            {deleteCheckStatus === 'can_delete' && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteArtista}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina Artista
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
