'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { supabase } from '@/shared/lib/supabase'
import { Database } from '@/shared/lib/supabase'
import { createCampagnaProgrammazione, getCampagneProgrammazione, uploadProgrammazioni, updateCampagnaStatus, CampagnaProgrammazione, ProgrammazionePayload } from '@/features/programmazioni/services/programmazioni.service'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form'
import { Search, Plus, MoreHorizontal, Edit, Trash2, Eye, Download, Filter, Calendar, Tv, Radio, CheckCircle, XCircle, FileSpreadsheet, Loader2, FileUp } from 'lucide-react'
import CSVImport from '@/shared/components/csv-import'

type Emittente = Database['public']['Tables']['emittenti']['Row']

const formSchema = z.object({
  emittente_id: z.string().min(1, "Seleziona un'emittente"),
  anno: z.coerce.number().min(1900, "Anno non valido").max(2100, "Anno non valido"),
  nome: z.string().min(1, "Il nome è obbligatorio"),
})

export default function ProgrammazioniPage() {
  const [currentTab, setCurrentTab] = useState<'programmazioni' | 'emittenti'>('programmazioni')
  
  // New Programmazione Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [newProgrammazioneStep, setNewProgrammazioneStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResumingUpload, setIsResumingUpload] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emittente_id: '',
      anno: new Date().getFullYear(),
      nome: '',
    },
  })

  // Campagne State
  const [campagne, setCampagne] = useState<CampagnaProgrammazione[]>([])
  const [filteredCampagne, setFilteredCampagne] = useState<CampagnaProgrammazione[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedCampagna, setSelectedCampagna] = useState<CampagnaProgrammazione | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Emittenti State
  const [emittenti, setEmittenti] = useState<Emittente[]>([])
  const [loadingEmittenti, setLoadingEmittenti] = useState(false)
  const [searchEmittentiQuery, setSearchEmittentiQuery] = useState('')
  const [filteredEmittenti, setFilteredEmittenti] = useState<Emittente[]>([])
  const [selectedEmittente, setSelectedEmittente] = useState<Emittente | null>(null)
  const [showEmittenteDetails, setShowEmittenteDetails] = useState(false)
  
  // Watch values to auto-generate name
  const watchedEmittenteId = form.watch('emittente_id')
  const watchedAnno = form.watch('anno')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedCampagna) return

    setIsSubmitting(true)

    try {
      let rows: any[] = []

      if (file.name.endsWith('.csv')) {
        await new Promise<void>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors.length > 0) {
                console.error('CSV Parsing Errors:', results.errors)
              }
              rows = results.data
              resolve()
            },
            error: (error) => reject(error)
          })
        })
      } else if (file.name.match(/\.xlsx?$/)) {
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data)
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json(worksheet, { raw: false }) // raw: false ensures dates are formatted as strings
      } else {
        throw new Error('Formato file non supportato. Usa CSV o Excel.')
      }

      const programmazioni: ProgrammazionePayload[] = rows
        .filter((row: any) => row.data && row.ora)
        .map((row: any) => ({
          campagna_id: selectedCampagna.id,
          emittente_id: selectedCampagna.emittente_id,
          data_trasmissione: row.data, 
          ora_inizio: row.ora,
          titolo_programmazione: row.titolo || 'Titolo Sconosciuto',
          durata_minuti: row.durata ? parseInt(row.durata) : undefined,
          descrizione: row.descrizione
        }))

      if (programmazioni.length === 0) {
        throw new Error("Nessuna riga valida trovata. Verifica le intestazioni: data, ora, titolo, durata")
      }

      const { error } = await uploadProgrammazioni(programmazioni)
      if (error) throw error

      // Update campaign status to 'aperta' after successful upload
      await updateCampagnaStatus(selectedCampagna.id, 'aperta')

      handleCloseModal()
      await fetchCampagne()
    } catch (error) {
      console.error('Error uploading file:', error)
      alert(error instanceof Error ? error.message : 'Errore durante il caricamento del file.')
    } finally {
      setIsSubmitting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    if (watchedEmittenteId && watchedAnno) {
      const emittente = emittenti.find(e => e.id === watchedEmittenteId)
      if (emittente) {
        form.setValue('nome', `${emittente.nome} ${watchedAnno}`)
      }
    }
  }, [watchedEmittenteId, watchedAnno, emittenti, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    try {
      const { data, error } = await createCampagnaProgrammazione(values)
      if (error) throw error
      
      await fetchCampagne()
      setSelectedCampagna((data as unknown) as CampagnaProgrammazione)
      setNewProgrammazioneStep(2)
    } catch (error) {
      console.error('Error creating campagna:', error)
      // In a real app we would show a toast here
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseModal = () => {
    setIsNewModalOpen(false)
    setNewProgrammazioneStep(1)
    setIsResumingUpload(false)
    setSelectedCampagna(null)
    form.reset()
  }

  const filterCampagne = useCallback(() => {
    let filtered = campagne

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(campagna =>
        campagna.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (campagna.emittenti?.nome && campagna.emittenti.nome.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campagna => campagna.stato === statusFilter)
    }

    setFilteredCampagne(filtered)
  }, [campagne, searchQuery, statusFilter])

  const filterEmittenti = useCallback(() => {
    let filtered = emittenti

    if (searchEmittentiQuery) {
      filtered = filtered.filter(emittente =>
        emittente.nome.toLowerCase().includes(searchEmittentiQuery.toLowerCase()) ||
        emittente.codice.toLowerCase().includes(searchEmittentiQuery.toLowerCase())
      )
    }

    setFilteredEmittenti(filtered)
  }, [emittenti, searchEmittentiQuery])

  useEffect(() => {
    if (isNewModalOpen && emittenti.length === 0) {
      fetchEmittenti()
    }
  }, [isNewModalOpen, emittenti.length])

  useEffect(() => {
    if (currentTab === 'programmazioni') {
      fetchCampagne()
    } else {
      fetchEmittenti()
    }
  }, [currentTab])

  useEffect(() => {
    filterCampagne()
  }, [filterCampagne])

  useEffect(() => {
    filterEmittenti()
  }, [filterEmittenti])

  const fetchCampagne = async () => {
    setLoading(true)
    try {
      const { data, error } = await getCampagneProgrammazione()

      if (error) throw error
      setCampagne(data || [])
    } catch (error) {
      console.error('Error fetching campagne:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmittenti = async () => {
    try {
      setLoadingEmittenti(true)
      const { data, error } = await supabase
        .from('emittenti')
        .select('*')
        .order('nome', { ascending: true })

      if (error) throw error
      setEmittenti(data || [])
    } catch (error) {
      console.error('Error fetching emittenti:', error)
    } finally {
      setLoadingEmittenti(false)
    }
  }

  const getAttivaBadge = (attiva: boolean | null) => {
    if (attiva === true) return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Attiva</Badge>
    if (attiva === false) return <Badge variant="outline" className="bg-gray-50 text-gray-700"><XCircle className="w-3 h-3 mr-1" /> Inattiva</Badge>
    return <Badge variant="outline" className="bg-gray-50 text-gray-700">Non specificato</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  const exportData = () => {
    const csvContent = [
      ['Nome', 'Emittente', 'Anno', 'Stato', 'Creato il'].join(','),
      ...filteredCampagne.map(campagna => [
        `"${campagna.nome}"`,
        `"${campagna.emittenti?.nome || ''}"`,
        campagna.anno,
        campagna.stato,
        formatDate(campagna.created_at)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campagne_${new Date().toISOString().split('T')[0]}.csv`
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
          <h1 className="text-3xl font-bold tracking-tight">Programmazioni & Emittenti</h1>
          <p className="text-gray-600">Gestione delle programmazioni televisive e delle emittenti</p>
        </div>

      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        <Button
          variant={currentTab === 'programmazioni' ? 'default' : 'outline'}
          onClick={() => setCurrentTab('programmazioni')}
        >
          <Tv className="h-4 w-4 mr-2" />
          Campagne Programmazione
        </Button>
        <Button
          variant={currentTab === 'emittenti' ? 'default' : 'outline'}
          onClick={() => setCurrentTab('emittenti')}
        >
          <Radio className="h-4 w-4 mr-2" />
          Emittenti
        </Button>
      </div>

      {/* Programmazioni Content */}
      {currentTab === 'programmazioni' && (
        <>
          <div className="flex justify-end gap-2 mb-4">
            <CSVImport onImportComplete={fetchCampagne} />
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Esporta CSV
            </Button>
            <Button onClick={() => setIsNewModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Programmazione
            </Button>
          </div>
          {/* Filters */}
          <Card>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cerca per nome o emittente..."
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
                    <SelectItem value="bozza">Bozza</SelectItem>
                    <SelectItem value="aperta">Aperta</SelectItem>
                    <SelectItem value="chiusa">Chiusa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                Mostrando {filteredCampagne.length} di {campagne.length} campagne
              </div>
            </CardContent>
          </Card>

          {/* Programming Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Emittente</TableHead>
                    <TableHead className="w-32">Anno</TableHead>
                    <TableHead className="w-32">Stato</TableHead>
                    <TableHead className="w-48">Creato il</TableHead>
                    <TableHead className="w-16">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampagne.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nessuna campagna trovata con i criteri di ricerca attuali
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCampagne.map((campagna) => (
                      <TableRow key={campagna.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium">{campagna.nome}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Tv className="h-4 w-4 text-gray-400" />
                            <span>{campagna.emittenti?.nome || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">{campagna.anno}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={campagna.stato === 'aperta' ? 'default' : campagna.stato === 'bozza' ? 'outline' : 'secondary'}>
                            {campagna.stato}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{formatDate(campagna.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {campagna.stato === 'bozza' && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedCampagna(campagna)
                                    setNewProgrammazioneStep(2)
                                    setIsResumingUpload(true)
                                    setIsNewModalOpen(true)
                                  }}
                                >
                                  <FileUp className="h-4 w-4 mr-2" />
                                  Carica Dati
                                </DropdownMenuItem>
                              )}
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
        </>
      )}

      {/* Emittenti Content */}
      {currentTab === 'emittenti' && (
        <>
          <Card>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cerca per nome o codice emittente..."
                      value={searchEmittentiQuery}
                      onChange={(e) => setSearchEmittentiQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                Mostrando {filteredEmittenti.length} di {emittenti.length} emittenti
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codice</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Paese</TableHead>
                    <TableHead>Attiva</TableHead>
                    <TableHead className="w-16">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingEmittenti ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredEmittenti.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nessuna emittente trovata
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmittenti.map((emittente) => (
                      <TableRow key={emittente.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-xs">{emittente.codice}</TableCell>
                        <TableCell className="font-medium">{emittente.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{emittente.tipo}</Badge>
                        </TableCell>
                        <TableCell>{emittente.paese || '-'}</TableCell>
                        <TableCell>{getAttivaBadge(emittente.attiva)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setSelectedEmittente(emittente)
                            setShowEmittenteDetails(true)
                          }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Campagna Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dettagli Campagna</DialogTitle>
            <DialogDescription>
              Informazioni complete per &quot;{selectedCampagna?.nome}&quot;
            </DialogDescription>
          </DialogHeader>
          
          {selectedCampagna && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Nome Campagna</label>
                  <p className="text-lg font-medium">{selectedCampagna.nome}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Emittente</label>
                  <p className="font-medium">{selectedCampagna.emittenti?.nome || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Anno</label>
                  <p className="font-mono">{selectedCampagna.anno}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Stato</label>
                  <div className="mt-1">
                    <Badge variant={selectedCampagna.stato === 'aperta' ? 'default' : selectedCampagna.stato === 'bozza' ? 'outline' : 'secondary'}>
                      {selectedCampagna.stato}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data Creazione</label>
                  <p>{selectedCampagna.created_at ? new Date(selectedCampagna.created_at).toLocaleString('it-IT') : '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Creato Da</label>
                  <p className="font-mono text-xs">{selectedCampagna.created_by || 'Sistema'}</p>
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

      {/* Emittenti Details Dialog */}
      <Dialog open={showEmittenteDetails} onOpenChange={setShowEmittenteDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dettagli Emittente</DialogTitle>
            <DialogDescription>
              Informazioni per &quot;{selectedEmittente?.nome}&quot;
            </DialogDescription>
          </DialogHeader>
          
          {selectedEmittente && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Codice</label>
                  <p className="font-mono">{selectedEmittente.codice}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Nome</label>
                  <p className="font-medium">{selectedEmittente.nome}</p>
                </div>
                 <div>
                  <label className="text-sm font-medium text-gray-500">Tipo</label>
                  <p><Badge variant="outline">{selectedEmittente.tipo}</Badge></p>
                </div>
                 <div>
                  <label className="text-sm font-medium text-gray-500">Paese</label>
                  <p>{selectedEmittente.paese || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Stato</label>
                  <div className="mt-1">{getAttivaBadge(selectedEmittente.attiva)}</div>
                </div>
                 <div>
                  <label className="text-sm font-medium text-gray-500">Data Creazione</label>
                  <p>{selectedEmittente.created_at ? new Date(selectedEmittente.created_at).toLocaleString('it-IT') : '-'}</p>
                </div>
              </div>
               <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEmittenteDetails(false)}>
                  Chiudi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* New Programmazione Modal */}
      <Dialog open={isNewModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {newProgrammazioneStep === 1 ? 'Nuova Programmazione' : 'Caricamento Dati'}
            </DialogTitle>
            <DialogDescription>
              {newProgrammazioneStep === 1 
                ? 'Inserisci i dettagli per creare una nuova campagna di programmazione.' 
                : 'Carica il file con i dati della programmazione.'}
            </DialogDescription>
          </DialogHeader>

          {newProgrammazioneStep === 1 && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="emittente_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emittente</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona emittente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {emittenti.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="anno"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anno</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Campagna</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly className="bg-gray-50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseModal}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Aggiungi Programmazione
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}

          {newProgrammazioneStep === 2 && (
            <div className="space-y-6 py-4">
              {!isResumingUpload ? (
                <div className="flex flex-col items-center justify-center space-y-2 text-center">
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Campagna creata con successo!</h3>
                  <p className="text-sm text-gray-500">
                    Ora puoi procedere con il caricamento del file Excel o CSV contenente i dati della programmazione.
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-2 mb-6">
                  <h3 className="font-semibold text-lg">Caricamento Dati</h3>
                  <p className="text-sm text-gray-500">
                    Carica il file per la campagna <span className="font-medium text-gray-900">{selectedCampagna?.nome}</span>
                  </p>
                </div>
              )}

              <div 
              className="border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
              />
              <FileSpreadsheet className="h-10 w-10 text-gray-400 mb-4" />
              <p className="text-sm font-medium">
                Clicca per selezionare il file
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Formati supportati: CSV, Excel (.xlsx, .xls)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Colonne richieste: data, ora, titolo, durata
              </p>
              <Button variant="outline" className="mt-4" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Caricamento...
                  </>
                ) : (
                  'Seleziona File'
                )}
              </Button>
            </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseModal}>
                  {isResumingUpload ? 'Annulla' : 'Chiudi e completa dopo'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}