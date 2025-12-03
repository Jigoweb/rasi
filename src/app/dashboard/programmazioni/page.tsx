'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { supabase } from '@/shared/lib/supabase'
import { Database } from '@/shared/lib/supabase'
import { createCampagnaProgrammazione, getCampagneProgrammazione, uploadProgrammazioni, updateCampagnaStatus, deleteCampagnaProgrammazione, CampagnaProgrammazione, ProgrammazionePayload } from '@/features/programmazioni/services/programmazioni.service'
import { processCampagnaIndividuazioneBatch, BatchProcessingProgress } from '@/features/campagne-individuazione/services/campagne-individuazione.service'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { Search, Plus, MoreHorizontal, Edit, Trash2, Eye, Download, Filter, Calendar, Tv, Radio, CheckCircle, XCircle, FileSpreadsheet, Loader2, FileUp, X, Sparkles, Info, Database as DatabaseIcon } from 'lucide-react'

type Emittente = Database['public']['Tables']['emittenti']['Row']

const formSchema = z.object({
  emittente_id: z.string().min(1, "Seleziona un'emittente"),
  anno: z.coerce.number().min(1900, "Anno non valido").max(2100, "Anno non valido"),
  nome: z.string().min(1, "Il nome è obbligatorio"),
})

export default function ProgrammazioniPage() {
  const router = useRouter()
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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedCampagna, setSelectedCampagna] = useState<CampagnaProgrammazione | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Emittenti State
  const [emittenti, setEmittenti] = useState<Emittente[]>([])
  const [loadingEmittenti, setLoadingEmittenti] = useState(false)
  const [searchEmittentiQuery, setSearchEmittentiQuery] = useState('')
  const [debouncedSearchEmittentiQuery, setDebouncedSearchEmittentiQuery] = useState('')
  const [filteredEmittenti, setFilteredEmittenti] = useState<Emittente[]>([])
  const [selectedEmittente, setSelectedEmittente] = useState<Emittente | null>(null)
  const [showEmittenteDetails, setShowEmittenteDetails] = useState(false)
  
  // Watch values to auto-generate name
  const watchedEmittenteId = form.watch('emittente_id')
  const watchedAnno = form.watch('anno')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [headerError, setHeaderError] = useState<string | null>(null)
  const [isUploadReady, setIsUploadReady] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, { done: number; total: number }>>({})
  const [deleteProgress, setDeleteProgress] = useState<Record<string, { done: number; total: number }>>({})

  // Individuazioni State
  const [isIndividuazioniDialogOpen, setIsIndividuazioniDialogOpen] = useState(false)
  const [campagnaForIndividuazioni, setCampagnaForIndividuazioni] = useState<CampagnaProgrammazione | null>(null)
  const [isProcessingIndividuazioni, setIsProcessingIndividuazioni] = useState(false)
  const [batchProgress, setBatchProgress] = useState<BatchProcessingProgress | null>(null)
  const [individuazioniResult, setIndividuazioniResult] = useState<{
    success: boolean
    stats?: any
    error?: string
    campagneIndividuazioneId?: string
  } | null>(null)

  const handleProcessIndividuazioni = async () => {
    if (!campagnaForIndividuazioni) return

    setIsProcessingIndividuazioni(true)
    setIndividuazioniResult(null)
    setBatchProgress(null)

    try {
      // Aggiorna lo stato locale
      setCampagne(prev => prev.map(c => 
        c.id === campagnaForIndividuazioni.id ? { ...c, stato: 'in_corso' } : c
      ))

      const result = await processCampagnaIndividuazioneBatch(
        campagnaForIndividuazioni.id,
        (progress) => {
          setBatchProgress(progress)
        },
        {
          chunkSize: 25, // Processa 25 programmazioni per chunk (~1.5s, sotto il timeout di 8s)
        }
      )

      if (result.success && result.data) {
        // Aggiorna lo stato della campagna a 'individuata'
        setCampagne(prev => prev.map(c => 
          c.id === campagnaForIndividuazioni.id ? { ...c, stato: 'individuata' } : c
        ))
        
        // Mostra risultato nel dialog
        setIndividuazioniResult({
          success: true,
          stats: result.data.statistiche,
          campagneIndividuazioneId: (result.data.statistiche as any).campagne_individuazione_id
        })
      } else {
        // Ripristina lo stato
        setCampagne(prev => prev.map(c => 
          c.id === campagnaForIndividuazioni.id ? { ...c, stato: 'in_review' } : c
        ))
        setIndividuazioniResult({
          success: false,
          error: result.error || 'Errore sconosciuto durante il processamento'
        })
      }
    } catch (error: any) {
      setCampagne(prev => prev.map(c => 
        c.id === campagnaForIndividuazioni.id ? { ...c, stato: 'in_review' } : c
      ))
      setIndividuazioniResult({
        success: false,
        error: error.message || 'Errore inatteso'
      })
    } finally {
      setIsProcessingIndividuazioni(false)
    }
  }

  const handleCloseIndividuazioniDialog = () => {
    setIsIndividuazioniDialogOpen(false)
    setCampagnaForIndividuazioni(null)
    setIndividuazioniResult(null)
    setBatchProgress(null)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedCampagna) return

    setIsSubmitting(true)
    setSelectedFile(file)

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

      const normalize = (s: string) => s.toLowerCase().trim()
      const requiredHeaders = ['titolo', 'tipo']
      const headers = rows.length > 0 ? Object.keys(rows[0]).map(normalize) : []
      const hasRequired = requiredHeaders.every(h => headers.includes(h))

      if (!hasRequired) {
        setHeaderError('Header non valido: richiesti titolo e tipo')
        setParsedRows([])
        setIsUploadReady(false)
      } else {
        const validRows = rows.filter((r: any) => {
          const titolo = r.titolo ?? r['Titolo']
          const tipo = r.tipo ?? r['type'] ?? r['Type']
          return titolo && tipo
        })

        if (validRows.length === 0) {
          setHeaderError('Nessuna riga valida con titolo e tipo')
          setParsedRows([])
          setIsUploadReady(false)
        } else {
          setHeaderError(null)
          setParsedRows(rows)
          setIsUploadReady(true)
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert(error instanceof Error ? error.message : 'Errore durante la lettura del file.')
    } finally {
      setIsSubmitting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleUploadDatabase = async () => {
    if (!selectedCampagna || parsedRows.length === 0) return
    setIsUploading(true)
    try {
      setCampagne(prev => prev.map(c => c.id === selectedCampagna.id ? { ...c, stato: 'uploading' } : c))
      setUploadProgress(prev => ({ ...prev, [selectedCampagna.id]: { done: 0, total: parsedRows.length } }))
      await updateCampagnaStatus(selectedCampagna.id, 'uploading')
      const allowed = new Set([
        'canale','emittente','tipo','titolo','titolo_originale','numero_episodio','titolo_episodio','titolo_episodio_originale','numero_stagione','anno','production','regia','data_trasmissione','ora_inizio','ora_fine','durata_minuti','data_inizio','data_fine','retail_price','sales_month','track_price_local_currency','views','total_net_ad_revenue','total_revenue'
      ])

      const normalizeKey = (k: string) => k.toLowerCase().trim()
      const coerce = (k: string, v: any) => {
        if (v === undefined || v === null || v === '') return undefined
        switch (k) {
          case 'numero_episodio':
          case 'numero_stagione':
          case 'anno':
          case 'sales_month':
          case 'views':
          case 'durata_minuti':
            return parseInt(v as string)
          case 'retail_price':
          case 'track_price_local_currency':
          case 'total_net_ad_revenue':
          case 'total_revenue':
            return parseFloat((v as string).toString().replace(',', '.'))
          default:
            return v
        }
      }

      const buildPayload = (row: any): ProgrammazionePayload => {
        const payload: any = {
          campagna_programmazione_id: selectedCampagna.id,
          emittente_id: selectedCampagna.emittente_id,
        }
        for (const key of Object.keys(row)) {
          const nk = normalizeKey(key)
          if (allowed.has(nk)) {
            payload[nk] = coerce(nk, row[key])
          }
        }
        // Obbligatori
        payload.titolo = row.titolo ?? row['Titolo'] ?? ''
        payload.tipo = row.tipo ?? row['type'] ?? row['Type'] ?? ''
        return payload as ProgrammazionePayload
      }

      const CHUNK_SIZE = 2000
      for (let i = 0; i < parsedRows.length; i += CHUNK_SIZE) {
        const chunk = parsedRows.slice(i, i + CHUNK_SIZE)
        const programmazioni = chunk.map(buildPayload)
        const { error } = await uploadProgrammazioni(programmazioni)
        if (error) throw error
        setUploadProgress(prev => {
          const curr = prev[selectedCampagna.id]
          const done = (curr?.done || 0) + chunk.length
          return { ...prev, [selectedCampagna.id]: { done, total: parsedRows.length } }
        })
      }

      await updateCampagnaStatus(selectedCampagna.id, 'in_review')
      setCampagne(prev => prev.map(c => c.id === selectedCampagna.id ? { ...c, stato: 'in_review' } : c))
      handleCloseModal()
      setUploadProgress(prev => {
        const next = { ...prev }
        delete next[selectedCampagna.id]
        return next
      })
      await fetchCampagne()
    } catch (error) {
      console.error('Error uploading database:', error)
      alert('Errore durante l\'upload al database. Verifica il file e riprova.')
      await updateCampagnaStatus(selectedCampagna.id, 'error')
      setCampagne(prev => prev.map(c => c.id === selectedCampagna.id ? { ...c, stato: 'error' } : c))
      setUploadProgress(prev => {
        const next = { ...prev }
        delete next[selectedCampagna.id]
        return next
      })
    } finally {
      setIsUploading(false)
      setParsedRows([])
      setIsUploadReady(false)
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
    setSelectedFile(null)
    setParsedRows([])
    setIsUploadReady(false)
    setHeaderError(null)
  }

  const filterCampagne = useCallback(() => {
    let filtered = campagne

    // Filter by search query
    if (debouncedSearchQuery) {
      filtered = filtered.filter(campagna =>
        campagna.nome.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (campagna.emittenti?.nome && campagna.emittenti.nome.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campagna => campagna.stato === statusFilter)
    }

    setFilteredCampagne(filtered)
  }, [campagne, debouncedSearchQuery, statusFilter])

  const filterEmittenti = useCallback(() => {
    let filtered = emittenti

    if (debouncedSearchEmittentiQuery) {
      filtered = filtered.filter(emittente =>
        emittente.nome.toLowerCase().includes(debouncedSearchEmittentiQuery.toLowerCase()) ||
        emittente.codice.toLowerCase().includes(debouncedSearchEmittentiQuery.toLowerCase())
      )
    }

    setFilteredEmittenti(filtered)
  }, [emittenti, debouncedSearchEmittentiQuery])

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

  // Debounce search inputs
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchEmittentiQuery(searchEmittentiQuery), 300)
    return () => clearTimeout(t)
  }, [searchEmittentiQuery])

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
                    <SelectItem value="uploading">Uploading</SelectItem>
                    <SelectItem value="deleting">Deleting</SelectItem>
                    <SelectItem value="in_review">In review</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter('all') }}>Reset</Button>
              </div>
              {/* Filter Chips */}
              <div className="mt-3 flex flex-wrap gap-2">
                {debouncedSearchQuery && (
                  <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3 mr-1" /> Ricerca: {debouncedSearchQuery}
                  </Button>
                )}
                {statusFilter !== 'all' && (
                  <Button variant="outline" size="sm" onClick={() => setStatusFilter('all')}>
                    <X className="h-3 w-3 mr-1" /> Stato: {statusFilter}
                  </Button>
                )}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                Mostrando {filteredCampagne.length} di {campagne.length} campagne
              </div>
            </CardContent>
          </Card>

          {/* Programming Table */}
          <Card>
            <CardContent className="p-0">
              {/* Desktop */}
              <div className="hidden lg:block relative overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="py-4">Nome</TableHead>
                    <TableHead className="py-4">Emittente</TableHead>
                    <TableHead className="py-4 w-24 text-center">Anno</TableHead>
                    <TableHead className="py-4 w-44">Stato</TableHead>
                    <TableHead className="py-4 w-36">Creato il</TableHead>
                    <TableHead className="py-4 w-72">Operazioni</TableHead>
                    <TableHead className="py-4 w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampagne.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                        Nessuna campagna trovata con i criteri di ricerca attuali
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCampagne.map((campagna) => {
                      const hasData = (campagna.programmazioni_count || 0) > 0
                      const canCreateIndividuazioni = hasData && campagna.stato === 'in_review'
                      const isProcessing = campagna.stato === 'in_corso' || campagna.stato === 'uploading' || campagna.stato === 'deleting'
                      const isCompleted = campagna.stato === 'individuata'
                      
                      return (
                      <TableRow
                        key={campagna.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        tabIndex={0}
                        onClick={() => router.push(`/dashboard/programmazioni/${campagna.id}`)}
                        onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/dashboard/programmazioni/${campagna.id}`) }}
                      >
                        <TableCell className="py-4">
                          <div className="font-medium text-foreground">{campagna.nome}</div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Tv className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{campagna.emittenti?.nome || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <span className="font-mono text-muted-foreground">{campagna.anno}</span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            {uploadProgress[campagna.id] ? (
                              <div className="space-y-1.5">
                                <Badge variant="secondary">
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading
                                </Badge>
                                <div className="h-1.5 w-28 bg-muted rounded-full">
                                  <div
                                    className="h-1.5 bg-primary rounded-full transition-all"
                                    style={{ width: `${Math.min(100, Math.round((uploadProgress[campagna.id].done / uploadProgress[campagna.id].total) * 100))}%` }}
                                  />
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {uploadProgress[campagna.id].done.toLocaleString()} / {uploadProgress[campagna.id].total.toLocaleString()}
                                </div>
                              </div>
                            ) : deleteProgress[campagna.id] ? (
                              <div className="space-y-1.5">
                                <Badge variant="outline">
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Eliminazione
                                </Badge>
                                <div className="h-1.5 w-28 bg-muted rounded-full">
                                  <div
                                    className="h-1.5 bg-destructive rounded-full transition-all"
                                    style={{ width: `${Math.min(100, Math.round((deleteProgress[campagna.id].done / deleteProgress[campagna.id].total) * 100))}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                {campagna.stato === 'uploading' ? (
                                  <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading</Badge>
                                ) : campagna.stato === 'deleting' ? (
                                  <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Eliminazione</Badge>
                                ) : campagna.stato === 'error' ? (
                                  <Badge variant="destructive">Errore</Badge>
                                ) : campagna.stato === 'in_review' ? (
                                  <Badge variant="default">In review</Badge>
                                ) : campagna.stato === 'in_corso' ? (
                                  <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processando</Badge>
                                ) : campagna.stato === 'individuata' ? (
                                  <Badge variant="default" className="bg-green-600">Individuata</Badge>
                                ) : campagna.stato === 'bozza' ? (
                                  <Badge variant="outline">Bozza</Badge>
                                ) : (
                                  <Badge variant="secondary">{campagna.stato}</Badge>
                                )}
                                
                                {/* Info Tooltip */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button 
                                      className="text-muted-foreground hover:text-foreground transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Info className="h-4 w-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-sm">
                                    <div className="space-y-3">
                                      <div>
                                        <p className="font-semibold mb-1">Informazioni Campagna</p>
                                        <div className="flex items-center gap-2 text-sm">
                                          <DatabaseIcon className="h-3.5 w-3.5 shrink-0" />
                                          <span>Record caricati: <strong>{(campagna.programmazioni_count || 0).toLocaleString()}</strong></span>
                                        </div>
                                      </div>
                                      <div className="pt-2 border-t border-primary-foreground/20">
                                        <p className="font-medium text-sm mb-1">Stato: {campagna.stato}</p>
                                        <p className="text-xs opacity-90">
                                          {campagna.stato === 'bozza' && 'La campagna è stata creata ma non sono ancora stati caricati dati. Utilizza il pulsante "Carica Dati" per importare un file CSV o Excel.'}
                                          {campagna.stato === 'in_review' && 'I dati sono stati caricati correttamente. Puoi procedere con la creazione delle individuazioni oppure caricare ulteriori file per aggiungere altri record.'}
                                          {campagna.stato === 'individuata' && 'Il processo di individuazione è stato completato con successo. Le individuazioni sono state create e sono pronte per la revisione.'}
                                          {campagna.stato === 'error' && 'Si è verificato un errore durante l\'elaborazione. Verifica i dati e riprova il caricamento.'}
                                          {campagna.stato === 'in_corso' && 'Il sistema sta processando le programmazioni e creando le individuazioni. Attendere il completamento...'}
                                          {campagna.stato === 'uploading' && 'Caricamento dati in corso. Attendere il completamento...'}
                                        </p>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">{formatDate(campagna.created_at)}</span>
                          </div>
                        </TableCell>
                        {/* Colonna Operazioni Primarie */}
                        <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-3">
                            {/* CTA Carica Dati */}
                            {!isCompleted && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isProcessing || !!uploadProgress[campagna.id]}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedCampagna(campagna)
                                  setNewProgrammazioneStep(2)
                                  setIsResumingUpload(true)
                                  setIsNewModalOpen(true)
                                }}
                                className="gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                              >
                                {campagna.stato === 'uploading' || uploadProgress[campagna.id] ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <FileUp className="h-3.5 w-3.5" />
                                )}
                                Carica Dati
                              </Button>
                            )}
                            
                            {/* CTA Crea Individuazioni - sempre visibile ma disabilitato se non ci sono dati */}
                            {!isCompleted && !isProcessing && (
                              <Button
                                size="sm"
                                disabled={!canCreateIndividuazioni}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setCampagnaForIndividuazioni(campagna)
                                  setIsIndividuazioniDialogOpen(true)
                                }}
                                className="gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                Crea Individuazioni
                              </Button>
                            )}

                            {/* Badge stato completato */}
                            {isCompleted && (
                              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1.5 py-1.5 px-3">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Completata
                              </Badge>
                            )}

                            {/* Badge processamento in corso */}
                            {campagna.stato === 'in_corso' && (
                              <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Processamento...
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {/* Colonna Azioni Secondarie */}
                        <TableCell className="py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/programmazioni/${campagna.id}`) }}>
                                <Eye className="h-4 w-4 mr-2" />
                                Dettaglio
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifica
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  const ok = window.confirm('Eliminare la campagna e tutte le programmazioni associate?')
                                  if (!ok) return
                                  try {
                                    setCampagne(prev => prev.map(c => c.id === campagna.id ? { ...c, stato: 'deleting' } : c))
                                    const { error } = await deleteCampagnaProgrammazione(campagna.id)
                                    if (error) throw error
                                    setCampagne(prev => prev.filter(c => c.id !== campagna.id))
                                  } catch (e) {
                                    alert('Errore durante l\'eliminazione della campagna')
                                    setCampagne(prev => prev.map(c => c.id === campagna.id ? { ...c, stato: 'error' } : c))
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Elimina
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
              </div>
              {/* Mobile Cards */}
              <div className="lg:hidden space-y-4 p-4">
                {filteredCampagne.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Nessuna campagna trovata</div>
                ) : (
                  filteredCampagne.map((campagna) => (
                    <Card
                      key={campagna.id}
                      className="p-4 cursor-pointer"
                      tabIndex={0}
                      onClick={() => router.push(`/dashboard/programmazioni/${campagna.id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/dashboard/programmazioni/${campagna.id}`) }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-lg">{campagna.nome}</h3>
                          <div className="mt-1 text-sm text-gray-600 flex items-center gap-2">
                            <Tv className="h-4 w-4 text-gray-400" />
                            <span>{campagna.emittenti?.nome || '—'}</span>
                            <span className="font-mono">{campagna.anno}</span>
                          </div>
                          <div className="mt-1 text-sm text-gray-600 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{formatDate(campagna.created_at)}</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-label="Azioni" variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/programmazioni/${campagna.id}`) }}>
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
              {/* Filter Chips */}
              <div className="mt-3 flex flex-wrap gap-2">
                {debouncedSearchEmittentiQuery && (
                  <Button variant="outline" size="sm" onClick={() => setSearchEmittentiQuery('')}>
                    <X className="h-3 w-3 mr-1" /> Ricerca: {debouncedSearchEmittentiQuery}
                  </Button>
                )}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                Mostrando {filteredEmittenti.length} di {emittenti.length} emittenti
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {/* Desktop */}
              <div className="hidden lg:block relative overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
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
              </div>
              {/* Mobile Cards */}
              <div className="lg:hidden space-y-4 p-4">
                {filteredEmittenti.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Nessuna emittente trovata</div>
                ) : (
                  filteredEmittenti.map((emittente) => (
                    <Card key={emittente.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{emittente.nome}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            Codice: <span className="font-mono">{emittente.codice}</span>
                          </div>
                          <div className="text-xs text-gray-600">{emittente.paese || '—'}</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedEmittente(emittente)
                          setShowEmittenteDetails(true)
                        }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Dettaglio campagna spostato su pagina dedicata */}

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
            onClick={() => { if (!isUploading) fileInputRef.current?.click() }}
          >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
              />
              {!selectedFile ? (
                <>
                  <FileSpreadsheet className="h-10 w-10 text-gray-400 mb-4" />
                  <p className="text-sm font-medium">Clicca per selezionare il file</p>
                  <p className="text-xs text-gray-500 mt-1">Formati supportati: CSV, Excel (.xlsx, .xls)</p>
                  <p className="text-xs text-gray-400 mt-1">Colonne obbligatorie: titolo, tipo</p>
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
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-gray-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button variant="outline" size="sm" className="ml-4" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                    Cambia file
                  </Button>
                </div>
              )}
            </div>
            {headerError && (
              <div className="mt-3 text-sm text-red-600">{headerError}</div>
            )}

            <div className="flex justify-end">
              <Button className="mt-4" disabled={!isUploadReady || isUploading} onClick={handleUploadDatabase}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Upload in corso
                  </>
                ) : (
                  'Upload dati database'
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

      {/* Individuazioni Confirmation Dialog */}
      <Dialog open={isIndividuazioniDialogOpen} onOpenChange={handleCloseIndividuazioniDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {individuazioniResult?.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : individuazioniResult?.success === false ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              {individuazioniResult?.success 
                ? 'Individuazioni Completate' 
                : individuazioniResult?.success === false 
                  ? 'Errore Processamento'
                  : 'Crea Individuazioni'
              }
            </DialogTitle>
            {!individuazioniResult && (
              <DialogDescription>
                Questa operazione creerà le individuazioni per tutte le programmazioni della campagna <span className="font-medium text-foreground">{campagnaForIndividuazioni?.nome}</span>.
              </DialogDescription>
            )}
          </DialogHeader>
          
          {/* Stato: Prima del processamento */}
          {!isProcessingIndividuazioni && !individuazioniResult && (
            <div className="py-4 space-y-4">
              <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Record da processare:</strong> {(campagnaForIndividuazioni?.programmazioni_count || 0).toLocaleString()} programmazioni
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Tempo stimato:</strong> {(() => {
                    const count = campagnaForIndividuazioni?.programmazioni_count || 0
                    const chunkSize = 25
                    const secondsPerChunk = 2.5
                    const totalSeconds = Math.ceil(count / chunkSize) * secondsPerChunk
                    
                    if (totalSeconds < 60) {
                      return `~${Math.ceil(totalSeconds)} secondi`
                    } else if (totalSeconds < 3600) {
                      const minutes = Math.ceil(totalSeconds / 60)
                      return `~${minutes} minut${minutes === 1 ? 'o' : 'i'}`
                    } else {
                      const hours = Math.floor(totalSeconds / 3600)
                      const minutes = Math.ceil((totalSeconds % 3600) / 60)
                      return `~${hours} or${hours === 1 ? 'a' : 'e'}${minutes > 0 ? ` e ${minutes} min` : ''}`
                    }
                  })()}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Il sistema effettuerà il matching automatico tra:</p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li>Programmazioni caricate</li>
                  <li>Opere nel catalogo</li>
                  <li>Partecipazioni degli artisti</li>
                </ul>
              </div>
            </div>
          )}

          {/* Stato: Processamento in corso */}
          {isProcessingIndividuazioni && batchProgress && (
            <div className="py-6 space-y-4">
              {/* Progress header */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {batchProgress.phase === 'init' && 'Inizializzazione...'}
                    {batchProgress.phase === 'processing' && 'Processamento in corso...'}
                    {batchProgress.phase === 'finalizing' && 'Finalizzazione...'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {batchProgress.phase === 'processing' && (
                      <>Chunk {batchProgress.current_chunk}/{batchProgress.total_chunks}</>
                    )}
                    {batchProgress.phase === 'init' && 'Preparazione dati...'}
                    {batchProgress.phase === 'finalizing' && 'Calcolo statistiche finali...'}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">
                    {batchProgress.programmazioni_processate.toLocaleString()}/{batchProgress.programmazioni_totali.toLocaleString()}
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                    style={{ 
                      width: `${batchProgress.programmazioni_totali > 0 
                        ? (batchProgress.programmazioni_processate / batchProgress.programmazioni_totali) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {batchProgress.programmazioni_totali > 0 
                      ? Math.round((batchProgress.programmazioni_processate / batchProgress.programmazioni_totali) * 100) 
                      : 0}% completato
                  </span>
                  <span>
                    {(batchProgress.programmazioni_totali - batchProgress.programmazioni_processate).toLocaleString()} rimanenti
                  </span>
                </div>
              </div>

              {/* Live stats */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-foreground">
                    {batchProgress.individuazioni_create.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Individuazioni create</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-foreground">
                    {batchProgress.current_chunk}/{batchProgress.total_chunks}
                  </p>
                  <p className="text-xs text-muted-foreground">Chunk processati</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800 text-center">
                  ⚠️ Non chiudere questa finestra. Il processo potrebbe richiedere diversi minuti.
                </p>
              </div>
            </div>
          )}

          {/* Stato: Risultato positivo */}
          {individuazioniResult?.success && individuazioniResult.stats && (
            <div className="py-4 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 font-medium">
                  Il processo di individuazione è stato completato con successo.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {(individuazioniResult.stats.individuazioni_create || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Individuazioni create</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {(individuazioniResult.stats.programmazioni_con_match || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Programmazioni con match</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {(individuazioniResult.stats.artisti_distinti || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Artisti individuati</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {(individuazioniResult.stats.opere_distinte || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Opere distinte</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <div className="flex justify-between">
                  <span>Programmazioni totali:</span>
                  <span>{(individuazioniResult.stats.programmazioni_totali || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Programmazioni processate:</span>
                  <span>{(individuazioniResult.stats.programmazioni_processate || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Senza match:</span>
                  <span>{(individuazioniResult.stats.programmazioni_senza_match || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tempo processamento:</span>
                  <span>{(() => {
                    const totalSeconds = (individuazioniResult.stats.tempo_processamento_ms || 0) / 1000
                    
                    if (totalSeconds < 60) {
                      return `${totalSeconds.toFixed(1)} secondi`
                    } else if (totalSeconds < 3600) {
                      const minutes = Math.floor(totalSeconds / 60)
                      const seconds = Math.round(totalSeconds % 60)
                      return `${minutes} min${seconds > 0 ? ` ${seconds}s` : ''}`
                    } else {
                      const hours = Math.floor(totalSeconds / 3600)
                      const minutes = Math.round((totalSeconds % 3600) / 60)
                      return `${hours} or${hours === 1 ? 'a' : 'e'}${minutes > 0 ? ` ${minutes} min` : ''}`
                    }
                  })()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Stato: Errore */}
          {individuazioniResult?.success === false && (
            <div className="py-4 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium mb-1">
                  Si è verificato un errore durante il processamento.
                </p>
                <p className="text-xs text-red-600 font-mono">
                  {individuazioniResult.error}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {/* Prima del processamento */}
            {!isProcessingIndividuazioni && !individuazioniResult && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCloseIndividuazioniDialog}
                >
                  Annulla
                </Button>
                <Button onClick={handleProcessIndividuazioni}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Avvia Processamento
                </Button>
              </>
            )}

            {/* Durante il processamento */}
            {isProcessingIndividuazioni && (
              <Button variant="outline" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processamento in corso...
              </Button>
            )}

            {/* Dopo il processamento - Successo */}
            {individuazioniResult?.success && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCloseIndividuazioniDialog}
                >
                  Chiudi
                </Button>
                <Button 
                  onClick={() => {
                    handleCloseIndividuazioniDialog()
                    router.push(`/dashboard/individuazioni/${individuazioniResult.campagneIndividuazioneId}`)
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Visualizza Individuazioni
                </Button>
              </>
            )}

            {/* Dopo il processamento - Errore */}
            {individuazioniResult?.success === false && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCloseIndividuazioniDialog}
                >
                  Chiudi
                </Button>
                <Button 
                  onClick={() => {
                    setIndividuazioniResult(null)
                  }}
                >
                  Riprova
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
