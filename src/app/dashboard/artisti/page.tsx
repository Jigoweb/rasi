'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { getArtisti } from '@/features/artisti/services/artisti.service'
import { Database } from '@/shared/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Edit, Trash2, Eye, Download, User } from 'lucide-react'
import { SearchInput } from './components/search-input'
import { Input } from '@/shared/components/ui/input'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form'
import { createArtista, updateArtista } from '@/features/artisti/services/artisti.service'

type Artista = Database['public']['Tables']['artisti']['Row']

export default function ArtistiPage() {
  const router = useRouter()
  const [artisti, setArtisti] = useState<Artista[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedArtist, setSelectedArtist] = useState<Artista | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  
  // Fetch when search query or status changes (debounce is now handled in SearchInput)
  useEffect(() => {
    fetchArtisti()
  }, [searchQuery, statusFilter])

  const fetchArtisti = async () => {
    // Only show loading on initial load or if explicitly needed
    // Avoiding full page loading state for search updates to keep UI responsive
    if (artisti.length === 0) setLoading(true)
    
    try {
      const { data, error } = await getArtisti({
        search: searchQuery,
        stato: statusFilter
      })

      if (error) throw error
      setArtisti(data || [])
    } catch (error) {
      console.error('Error fetching artisti:', error)
    } finally {
      setLoading(false)
    }
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
      ['Codice IPN', 'Nome', 'Cognome', 'Nome Arte', 'Codice Fiscale', 'Stato', 'Data Nascita', 'Data Inizio Mandato'].join(','),
      ...artisti.map(artista => [
        artista.codice_ipn,
        artista.nome,
        artista.cognome,
        artista.nome_arte || '',
        artista.codice_fiscale || '',
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

  const schema = z.object({
    codice_ipn: z.string().min(1, 'Codice IPN obbligatorio'),
    nome: z.string().min(1, 'Nome obbligatorio'),
    cognome: z.string().min(1, 'Cognome obbligatorio'),
    nome_arte: z.string().optional().or(z.literal('')),
    codice_fiscale: z.string().max(16, 'Max 16 caratteri').optional().or(z.literal('')),
    data_nascita: z.string().optional().or(z.literal('')),
    data_inizio_mandato: z.string().min(1, 'Data inizio mandato obbligatoria')
  })

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      codice_ipn: '',
      nome: '',
      cognome: '',
      nome_arte: '',
      codice_fiscale: '',
      data_nascita: '',
      data_inizio_mandato: new Date().toISOString().split('T')[0]
    }
  })

  const openCreateForm = () => {
    setFormMode('create')
    setSelectedArtist(null)
    form.reset({
      codice_ipn: '',
      nome: '',
      cognome: '',
      nome_arte: '',
      codice_fiscale: '',
      data_nascita: '',
      data_inizio_mandato: new Date().toISOString().split('T')[0]
    })
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
    form.reset({
      codice_ipn: artista.codice_ipn,
      nome: artista.nome,
      cognome: artista.cognome,
      nome_arte: artista.nome_arte || '',
      codice_fiscale: artista.codice_fiscale || '',
      data_nascita: toDateInput(artista.data_nascita),
      data_inizio_mandato: toDateInput(artista.data_inizio_mandato)
    })
    setShowForm(true)
  }

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      const payload = {
        codice_ipn: values.codice_ipn,
        nome: values.nome,
        cognome: values.cognome,
        nome_arte: values.nome_arte || null,
        codice_fiscale: values.codice_fiscale || null,
        data_nascita: values.data_nascita || null,
        data_inizio_mandato: values.data_inizio_mandato,
      } as any

      if (formMode === 'create') {
        const { error } = await createArtista(payload)
        if (error) throw error
      } else if (selectedArtist) {
        const { error } = await updateArtista(selectedArtist.id, payload)
        if (error) throw error
      }
      setShowForm(false)
      await fetchArtisti()
    } catch (e) {
      console.error(e)
    }
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
        <CardContent className="p-4 lg:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <SearchInput 
                onSearch={setSearchQuery}
                initialValue={searchQuery}
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
            {loading ? (
              <div className="animate-pulse space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codice IPN</TableHead>
                    <TableHead>Nome Completo</TableHead>
                    
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
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Nessun artista trovato
                      </TableCell>
                    </TableRow>
                  ) : (
                    artisti.map((artista) => (
                      <TableRow key={artista.id}>
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
                              <DropdownMenuItem 
                                onClick={() => openEditForm(artista)}
                              >
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
                    Nessun artista trovato
                  </div>
                ) : (
                  artisti.map((artista) => (
                    <Card key={artista.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {artista.codice_ipn}
                            </span>
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? 'Nuovo Artista' : 'Modifica Artista'}</DialogTitle>
            <DialogDescription>
              {formMode === 'create' ? 'Inserisci i dati obbligatori' : 'Aggiorna i dati dell’artista'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="codice_ipn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice IPN</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="IPN0001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cognome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cognome</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="nome_arte"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome d’Arte</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="codice_fiscale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice Fiscale</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data_nascita"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data di Nascita</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data_inizio_mandato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Inizio Mandato</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annulla</Button>
                <Button type="submit">{formMode === 'create' ? 'Crea' : 'Salva'}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
