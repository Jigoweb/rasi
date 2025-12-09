'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/shared/lib/supabase-client'
import { Database } from '@/shared/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Search, Plus, MoreHorizontal, Edit, Trash2, Eye, Download, Filter, Film, Tv, FileText } from 'lucide-react'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form'
import { createOpera, updateOpera, getOperaById } from '@/features/opere/services/opere.service'
import { getTitleById, mapImdbToOpera } from '@/features/opere/services/external/imdb.service'

type Opera = Database['public']['Tables']['opere']['Row']

export default function OperePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [opere, setOpere] = useState<Opera[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedOpera, setSelectedOpera] = useState<Opera | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  
  

  // Server-side filtering with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOpere()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, typeFilter])

  useEffect(() => {
    const editId = searchParams?.get('edit')
    if (editId && !showForm) {
      ;(async () => {
        const { data } = await getOperaById(editId)
        if (data) {
          openEditForm(data as Opera)
        }
      })()
    }
  }, [searchParams, showForm])

  const fetchOpere = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('opere')
        .select('*')
        .order('anno_produzione', { ascending: false })
        .limit(100) // Limit results for performance, rely on search to find specific items

      if (searchQuery) {
        query = query.or(`titolo.ilike.%${searchQuery}%,codice_opera.ilike.%${searchQuery}%,titolo_originale.ilike.%${searchQuery}%`)
      }

      if (typeFilter !== 'all') {
        query = query.eq('tipo', typeFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setOpere(data || [])
    } catch (error) {
      console.error('Error fetching opere:', error)
    } finally {
      setLoading(false)
    }
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
      ['Codice', 'Titolo', 'Titolo Originale', 'Tipo', 'Anno'].join(','),
      ...opere.map(opera => [
        opera.codice_opera,
        `"${opera.titolo}"`,
        `"${opera.titolo_originale || ''}"`,
        opera.tipo,
        opera.anno_produzione
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

  const schema = z.object({
    codice_opera: z.string().min(1, 'Codice opera obbligatorio'),
    titolo: z.string().min(1, 'Titolo obbligatorio'),
    tipo: z.enum(['film', 'serie_tv', 'documentario', 'cartoon', 'altro'], {
      required_error: 'Tipo obbligatorio'
    }),
    titolo_originale: z.string().optional().or(z.literal('')),
    anno_produzione: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => {
        if (val === undefined || val === '') return undefined
        const n = typeof val === 'string' ? Number(val) : val
        return Number.isNaN(n) ? undefined : n
      }),
    imdb_tconst: z.string().optional(),
  })

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      codice_opera: '',
      titolo: '',
      tipo: undefined as any,
      titolo_originale: '',
      anno_produzione: undefined,
      imdb_tconst: '',
    }
  })

  const openCreateForm = () => {
    setFormMode('create')
    setSelectedOpera(null)
    form.reset({
      codice_opera: '',
      titolo: '',
      tipo: undefined as any,
      titolo_originale: '',
      anno_produzione: undefined,
      imdb_tconst: '',
    })
    setShowForm(true)
  }

  const openEditForm = (opera: Opera) => {
    setFormMode('edit')
    setSelectedOpera(opera)
    form.reset({
      codice_opera: opera.codice_opera,
      titolo: opera.titolo,
      tipo: opera.tipo as any,
      titolo_originale: opera.titolo_originale || '',
      anno_produzione: opera.anno_produzione ?? undefined,
      imdb_tconst: opera.imdb_tconst || '',
    })
    setShowForm(true)
  }

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      const payload = {
        codice_opera: values.codice_opera,
        titolo: values.titolo,
        tipo: values.tipo,
        titolo_originale: values.titolo_originale || null,
        anno_produzione: values.anno_produzione ?? null,
        imdb_tconst: values.imdb_tconst || null,
        codici_esterni: values.imdb_tconst ? { imdb: values.imdb_tconst } : undefined,
      } as any

      if (formMode === 'create') {
        const { error } = await createOpera(payload)
        if (error) throw error
      } else if (selectedOpera) {
        const { error } = await updateOpera(selectedOpera.id, payload)
        if (error) throw error
      }
      setShowForm(false)
      fetchOpere()
    } catch (e) {
      console.error('Errore salvataggio opera', e)
    }
  }

  

  const fetchImdbById = async () => {
    const id = (form.getValues().imdb_tconst || '').trim()
    if (!id) return
    const { ok, result } = await getTitleById(id)
    if (ok && result) {
      const mapped = mapImdbToOpera({ title: result.title, originalTitle: result.originalTitle, year: result.year, type: result.type, id: result.id })
      form.setValue('titolo', mapped.titolo)
      form.setValue('titolo_originale', mapped.titolo_originale || '')
      form.setValue('tipo', mapped.tipo as any)
      form.setValue('anno_produzione', mapped.anno_produzione ?? undefined)
      form.setValue('imdb_tconst', mapped.imdb_tconst || '')
    }
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
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Opere</h1>
          <p className="text-gray-600">Gestione del catalogo opere</p>
          <div className="mt-2 flex gap-2 lg:hidden">
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Esporta CSV
            </Button>
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Opera
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
            Nuova Opera
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
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
            <Button variant="outline" onClick={() => { setSearchQuery(''); setTypeFilter('all') }}>Reset</Button>
          </div>
          {/* Filter Chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {searchQuery && (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Ricerca: {searchQuery}
              </Button>
            )}
            {typeFilter !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setTypeFilter('all')}>
                Tipo: {typeFilter}
              </Button>
            )}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Mostrando {opere.length} risultati
          </div>
        </CardContent>
      </Card>

      {/* Works Table */}
      <Card>
        <CardContent className="p-0">
          {/* Desktop */}
          <div className="hidden lg:block relative overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="py-3 px-4 pl-6 w-32">Codice</TableHead>
                <TableHead className="py-3 px-4">Titolo</TableHead>
                <TableHead className="py-3 px-4">Titolo Originale</TableHead>
                <TableHead className="py-3 px-4 w-32">Tipo</TableHead>
                <TableHead className="py-3 px-4 w-20 text-center">Anno</TableHead>
                <TableHead className="py-3 px-4 pr-6 text-right sticky right-0 bg-background z-10 w-[1%]">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opere.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nessuna opera trovata con i criteri di ricerca attuali
                  </TableCell>
                </TableRow>
              ) : (
                opere.map((opera) => (
                  <TableRow
                    key={opera.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    tabIndex={0}
                    onClick={(e) => { 
                      e.preventDefault()
                      e.stopPropagation()
                      router.push(`/dashboard/opere/${opera.id}`)
                    }}
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        router.push(`/dashboard/opere/${opera.id}`)
                      }
                    }}
                  >
                    <TableCell className="py-4 px-4 pl-6 font-mono text-sm">
                      {opera.codice_opera}
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="font-medium">{opera.titolo}</div>
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      {opera.titolo_originale ? (
                        <span className="text-muted-foreground italic">{opera.titolo_originale}</span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      {getTypeBadge(opera.tipo)}
                    </TableCell>
                    <TableCell className="py-4 px-4 text-center font-mono text-muted-foreground">
                      {opera.anno_produzione || '—'}
                    </TableCell>
                    <TableCell className="py-4 px-4 pr-6 sticky right-0 bg-background z-10 w-[1%]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-label="Azioni" variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { 
                            e.stopPropagation()
                            router.push(`/dashboard/opere/${opera.id}`)
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Dettaglio
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditForm(opera) }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Modifica
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={(e) => e.stopPropagation()}>
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
          <div className="lg:hidden space-y-4 p-4">
            {opere.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nessuna opera trovata</div>
            ) : (
              opere.map((opera) => (
                <Card
                  key={opera.id}
                  className="p-4 cursor-pointer"
                  tabIndex={0}
                  onClick={(e) => { 
                    e.preventDefault()
                    e.stopPropagation()
                    router.push(`/dashboard/opere/${opera.id}`)
                  }}
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      router.push(`/dashboard/opere/${opera.id}`)
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{opera.titolo}</div>
                      {opera.titolo_originale && (
                        <div className="text-xs text-gray-600 italic">{opera.titolo_originale}</div>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        {getTypeBadge(opera.tipo)}
                        <span className="text-xs text-gray-600">{opera.anno_produzione || '—'}</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Codice: <span className="font-mono">{opera.codice_opera}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-label="Azioni" variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { 
                          e.stopPropagation()
                          router.push(`/dashboard/opere/${opera.id}`)
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Dettaglio
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditForm(opera) }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={(e) => e.stopPropagation()}>
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

      {/* Opera Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Dettagli Opera</DialogTitle>
            <DialogDescription>
              Informazioni complete per &quot;{selectedOpera?.titolo}&quot;
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
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Chiudi
                </Button>
                <Button onClick={() => selectedOpera && openEditForm(selectedOpera)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifica
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    if (!selectedOpera?.imdb_tconst) return
                    const { ok, result } = await getTitleById(selectedOpera.imdb_tconst)
                    if (ok && result) {
                      const mapped = mapImdbToOpera({ title: result.title, originalTitle: result.originalTitle, year: result.year, type: result.type, id: result.id })
                      await updateOpera(selectedOpera.id, {
                        titolo: mapped.titolo,
                        titolo_originale: mapped.titolo_originale || null,
                        tipo: mapped.tipo,
                        anno_produzione: mapped.anno_produzione ?? null,
                        imdb_tconst: mapped.imdb_tconst,
                        codici_esterni: mapped.codici_esterni,
                      } as any)
                      await fetchOpere()
                      setShowDetails(false)
                    }
                  }}
                >
                  Importa da IMDB
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? 'Nuova Opera' : 'Modifica Opera'}</DialogTitle>
            <DialogDescription>
              {formMode === 'create' ? 'Inserisci i dati obbligatori' : 'Aggiorna i dati dell’opera'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="codice_opera"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice Opera</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="OP0001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="titolo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titolo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleziona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="film">Film</SelectItem>
                        <SelectItem value="serie_tv">Serie TV</SelectItem>
                        <SelectItem value="documentario">Documentario</SelectItem>
                        <SelectItem value="cartoon">Cartoon</SelectItem>
                        <SelectItem value="altro">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="titolo_originale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titolo Originale</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="anno_produzione"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anno Produzione</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imdb_tconst"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IMDB ID (tt...)</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input {...field} placeholder="tt1234567" />
                          <Button type="button" variant="secondary" onClick={fetchImdbById}>Carica da IMDB</Button>
                        </div>
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
