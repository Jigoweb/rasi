'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCampagneIndividuazione, CampagnaIndividuazione, getDeleteCampagnaIndividuazioneInfo, deleteCampagnaIndividuazione, DeleteCampagnaIndividuazioneInfo, getIndividuazioneProcessingProgress, IndividuazioneProcessingProgress } from '@/features/individuazioni/services/individuazioni.service'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { isProcessingStale } from '@/features/programmazioni/services/programmazioni.service'
import { useIndividuazioneProcess } from '@/shared/contexts/individuazione-process-context'
import { EmptyState, PageErrorState, PageLoadingState } from '@/shared/components/page-states'
import { SearchInput } from '@/shared/components/search-input'
import { clickableRowClassName, handleClickableRowKeyDown } from '@/shared/lib/clickable-row'
import { 
  Sparkles, 
  Eye, 
  Download, 
  Calendar,
  Users,
  FileText,
  CheckCircle,
  Clock,
  Loader2,
  RotateCw,
  Info,
  BarChart3,
  Trash2,
  MoreHorizontal,
  Filter,
  Tv,
  X,
  AlertCircle
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

export default function IndividuazioniPage() {
  const router = useRouter()
  const { resumeById, canStartProcess } = useIndividuazioneProcess()
  const [resumingId, setResumingId] = useState<string | null>(null)
  const [campagne, setCampagne] = useState<CampagnaIndividuazione[]>([])
  const [filteredCampagne, setFilteredCampagne] = useState<CampagnaIndividuazione[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [emittenteFilter, setEmittenteFilter] = useState<string>('all')
  const [annoFilter, setAnnoFilter] = useState<string>('all')

  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [campagnaToDelete, setCampagnaToDelete] = useState<CampagnaIndividuazione | null>(null)
  const [deleteInfo, setDeleteInfo] = useState<DeleteCampagnaIndividuazioneInfo | null>(null)
  const [isLoadingDeleteInfo, setIsLoadingDeleteInfo] = useState(false)
  
  // Processing Progress State
  const [processingProgressMap, setProcessingProgressMap] = useState<Record<string, IndividuazioneProcessingProgress | null>>({})
  const [loadingProgressMap, setLoadingProgressMap] = useState<Record<string, boolean>>({})
  const [isDeletingCampagna, setIsDeletingCampagna] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState<{ phase: string; deleted?: number; total?: number } | null>(null)
  const hasActiveFilters = searchTerm.trim().length > 0 || statusFilter !== 'all' || emittenteFilter !== 'all' || annoFilter !== 'all'

  useEffect(() => {
    loadCampagne()
  }, [])

  // Load processing progress for all in_corso campaigns when campagne are loaded
  useEffect(() => {
    if (campagne.length > 0) {
      campagne
        .filter(c => c.stato === 'in_corso' && !processingProgressMap[c.id] && !loadingProgressMap[c.id])
        .forEach(campagna => {
          fetchProcessingProgress(campagna.id)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campagne])

  const loadCampagne = async () => {
    setError(null)
    setLoading(true)
    try {
    const { data, error } = await getCampagneIndividuazione()
      if (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : String(error)
        console.error('Errore caricamento campagne:', errorMessage, error)
        setError(errorMessage)
        setCampagne([])
        return
      }
    if (data) {
      setCampagne(data)
      } else {
        setCampagne([])
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null
        ? JSON.stringify(error)
        : String(error)
      console.error('Errore caricamento campagne:', errorMessage, error)
      setError(errorMessage)
      setCampagne([])
    } finally {
    setLoading(false)
    }
  }

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setEmittenteFilter('all')
    setAnnoFilter('all')
  }

  // Fetch processing progress for a specific campaign
  const fetchProcessingProgress = useCallback(async (campagnaId: string) => {
    if (loadingProgressMap[campagnaId]) return // Already loading
    
    setLoadingProgressMap(prev => ({ ...prev, [campagnaId]: true }))
    try {
      const { data, error } = await getIndividuazioneProcessingProgress(campagnaId)
      if (error) throw error
      setProcessingProgressMap(prev => ({ ...prev, [campagnaId]: data }))
    } catch (error) {
      console.error('Error fetching processing progress:', error)
    } finally {
      setLoadingProgressMap(prev => ({ ...prev, [campagnaId]: false }))
    }
  }, [loadingProgressMap])

  // Riprende un processo interrotto direttamente dalla pagina Individuazioni
  // (locality of action: agisci dove vedi lo stato "Interrotto").
  const handleResume = async (campagna: CampagnaIndividuazione) => {
    if (!canStartProcess(campagna.campagne_programmazione_id)) return
    setResumingId(campagna.id)
    try {
      await resumeById(
        campagna.campagne_programmazione_id,
        campagna.campagne_programmazione?.nome ?? campagna.nome
      )
      // Riallinea la lista col nuovo stato dopo il processo
      loadCampagne()
    } finally {
      setResumingId(null)
    }
  }

  // Delete Handlers
  const handleOpenDeleteDialog = async (campagna: CampagnaIndividuazione) => {
    setCampagnaToDelete(campagna)
    setIsDeleteDialogOpen(true)
    setIsLoadingDeleteInfo(true)
    setDeleteInfo(null)
    setDeleteProgress(null)

    try {
      const { data, error } = await getDeleteCampagnaIndividuazioneInfo(campagna.id)
      if (error) throw error
      setDeleteInfo(data)
    } catch (error) {
      console.error('Error loading delete info:', error)
    } finally {
      setIsLoadingDeleteInfo(false)
    }
  }

  const handleCloseDeleteDialog = () => {
    if (isDeletingCampagna) return // Prevent closing during deletion
    setIsDeleteDialogOpen(false)
    setCampagnaToDelete(null)
    setDeleteInfo(null)
    setDeleteProgress(null)
  }

  const handleConfirmDelete = async () => {
    if (!campagnaToDelete) return

    setIsDeletingCampagna(true)
    setDeleteProgress({ phase: 'starting' })
    
    try {
      const { error } = await deleteCampagnaIndividuazione(
        campagnaToDelete.id,
        (progress) => setDeleteProgress(progress)
      )

      if (error) {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
        console.error('Error deleting campagna:', errorMessage)
        alert(`Errore durante l'eliminazione: ${errorMessage}`)
        return
      }
      
      // Remove from list and close dialog
      setCampagne(prev => prev.filter(c => c.id !== campagnaToDelete.id))
      setIsDeleteDialogOpen(false)
      setCampagnaToDelete(null)
      setDeleteInfo(null)
      setDeleteProgress(null)
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
      console.error('Error deleting campagna:', errorMessage)
      alert(`Errore durante l'eliminazione: ${errorMessage}`)
    } finally {
      setIsDeletingCampagna(false)
      setDeleteProgress(null)
    }
  }

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Filter logic
  const filterCampagne = useCallback(() => {
    let filtered = campagne

    // Filter by search query
    if (debouncedSearchTerm) {
      filtered = filtered.filter(c =>
        c.nome?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        c.emittenti?.nome?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.stato === statusFilter)
    }

    // Filter by emittente
    if (emittenteFilter !== 'all') {
      filtered = filtered.filter(c => c.emittente_id === emittenteFilter)
    }

    // Filter by anno
    if (annoFilter !== 'all') {
      filtered = filtered.filter(c => c.anno?.toString() === annoFilter)
    }

    setFilteredCampagne(filtered)
  }, [campagne, debouncedSearchTerm, statusFilter, emittenteFilter, annoFilter])

  useEffect(() => {
    filterCampagne()
  }, [filterCampagne])

  // Get unique anni from campagne for filter dropdown
  const uniqueAnni = useMemo(() => {
    const anni = campagne.map(c => c.anno).filter((v): v is number => v !== null && v !== undefined)
    const uniqueSet = [...new Set(anni)]
    return uniqueSet.sort((a, b) => b - a) // Sort descending (most recent first)
  }, [campagne])

  // Get unique emittenti from campagne for filter dropdown
  const uniqueEmittenti = useMemo(() => {
    const emittentiMap = new Map<string, { id: string; nome: string }>()
    campagne.forEach(c => {
      if (c.emittente_id && c.emittenti?.nome) {
        emittentiMap.set(c.emittente_id, { id: c.emittente_id, nome: c.emittenti.nome })
      }
    })
    return Array.from(emittentiMap.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [campagne])

  const canShowResume = (campagna: CampagnaIndividuazione) => {
    const progress = processingProgressMap[campagna.id]
    return campagna.stato === 'in_corso' && (
      progress?.job_stato === 'error' ||
      isProcessingStale(progress) ||
      (!progress?.last_activity_at && progress?.job_stato !== 'running')
    )
  }

  const getStatoBadge = (stato: string, campagnaId?: string) => {
    switch (stato) {
      case 'completata':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completata</Badge>
      case 'in_corso': {
        const progress = campagnaId ? processingProgressMap[campagnaId] : null
        if (progress?.job_stato === 'error' || isProcessingStale(progress)) {
          return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="w-3 h-3 mr-1" /> Interrotto
          </Badge>
          )
        }

        if (!progress?.last_activity_at && progress?.job_stato !== 'running') {
          return <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">Da verificare</Badge>
        }

        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In corso</Badge>
      }
      case 'bozza':
        return <Badge variant="secondary">Bozza</Badge>
      case 'archiviata':
        return <Badge variant="outline">Archiviata</Badge>
      default:
        return <Badge variant="secondary">{stato}</Badge>
    }
  }

  const formatNumber = (num: number | undefined) => {
    return (num || 0).toLocaleString('it-IT')
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Individuazioni
          </h1>
          <p className="text-muted-foreground">Gestione delle campagne di individuazione artisti</p>
        </div>
        <PageLoadingState
          title="Caricamento individuazioni"
          description="Stiamo recuperando le campagne di individuazione e il loro stato operativo."
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Individuazioni
          </h1>
          <p className="text-muted-foreground">Gestione delle campagne di individuazione artisti</p>
        </div>
        <PageErrorState
          description="Non siamo riusciti a caricare le campagne di individuazione. Riprova."
          onRetry={loadCampagne}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Individuazioni
          </h1>
          <p className="text-muted-foreground">
            Gestione delle campagne di individuazione artisti
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campagne.length}</p>
                <p className="text-sm text-muted-foreground">Campagne totali</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campagne.filter(c => c.stato === 'completata').length}
                </p>
                <p className="text-sm text-muted-foreground">Completate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatNumber(campagne.reduce((acc, c) => acc + (c.statistiche?.individuazioni_create || 0), 0))}
                </p>
                <p className="text-sm text-muted-foreground">Individuazioni totali</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatNumber(campagne.reduce((acc, c) => acc + (c.statistiche?.artisti_distinti || 0), 0))}
                </p>
                <p className="text-sm text-muted-foreground">Artisti individuati</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Prima riga: Ricerca */}
            <div>
              <SearchInput
                placeholder="Cerca per nome o emittente..."
                initialValue={searchTerm}
                onSearch={setSearchTerm}
              />
            </div>
            
            {/* Seconda riga: Filtri */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Filtro Stato */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <Filter className="h-4 w-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="completata">Completata</SelectItem>
                  <SelectItem value="in_corso">In corso</SelectItem>
                  <SelectItem value="bozza">Bozza</SelectItem>
                  <SelectItem value="archiviata">Archiviata</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro Emittente */}
              <Select value={emittenteFilter} onValueChange={setEmittenteFilter}>
                <SelectTrigger className="w-full sm:w-52">
                  <Tv className="h-4 w-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Emittente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le emittenti</SelectItem>
                  {uniqueEmittenti.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro Anno */}
              <Select value={annoFilter} onValueChange={setAnnoFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <Calendar className="h-4 w-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Anno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli anni</SelectItem>
                  {uniqueAnni.map((anno) => (
                    <SelectItem key={anno} value={anno.toString()}>{anno}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Reset */}
              <Button 
                variant="outline" 
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="sm:ml-auto"
              >
                Reset filtri
              </Button>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {debouncedSearchTerm && (
              <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                <X className="h-3 w-3 mr-1" /> Ricerca: {debouncedSearchTerm}
              </Button>
            )}
            {statusFilter !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setStatusFilter('all')}>
                <X className="h-3 w-3 mr-1" /> Stato: {statusFilter === 'in_corso' ? 'In corso' : statusFilter}
              </Button>
            )}
            {emittenteFilter !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setEmittenteFilter('all')}>
                <X className="h-3 w-3 mr-1" /> Emittente: {uniqueEmittenti.find(e => e.id === emittenteFilter)?.nome}
              </Button>
            )}
            {annoFilter !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setAnnoFilter('all')}>
                <X className="h-3 w-3 mr-1" /> Anno: {annoFilter}
              </Button>
            )}
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Mostrando {filteredCampagne.length} di {campagne.length} campagne
            {hasActiveFilters ? ' filtrate' : ''}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="py-4 px-6">Nome Campagna</TableHead>
                <TableHead className="py-4">Emittente</TableHead>
                <TableHead className="py-4">Anno</TableHead>
                <TableHead className="py-4 text-right">Individuazioni</TableHead>
                <TableHead className="py-4 text-right">Artisti</TableHead>
                <TableHead className="py-4 text-right">Opere</TableHead>
                <TableHead className="py-4">Stato</TableHead>
                <TableHead className="py-4">Creata il</TableHead>
                <TableHead className="py-4 w-32">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampagne.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    {hasActiveFilters ? 'Nessuna campagna corrisponde ai filtri attuali.' : 'Non ci sono campagne di individuazione disponibili.'}
                    {hasActiveFilters && (
                      <div className="mt-3">
                        <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                          Cancella filtri
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampagne.map((campagna) => (
                  <TableRow 
                    key={campagna.id}
                    className={clickableRowClassName}
                    role="link"
                    tabIndex={0}
                    aria-label={`Apri dettaglio individuazione ${campagna.nome}`}
                    onClick={() => router.push(`/dashboard/individuazioni/${campagna.id}`)}
                    onKeyDown={(event) => handleClickableRowKeyDown(event, () => router.push(`/dashboard/individuazioni/${campagna.id}`))}
                  >
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{campagna.nome}</span>
                        <Tooltip
                          onOpenChange={(open) => {
                            // Load processing progress when tooltip opens for in_corso campaigns
                            if (open && campagna.stato === 'in_corso' && !processingProgressMap[campagna.id] && !loadingProgressMap[campagna.id]) {
                              fetchProcessingProgress(campagna.id)
                            }
                          }}
                        >
                          <TooltipTrigger asChild>
                            <button 
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              aria-label={`Informazioni su ${campagna.nome}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-sm">
                            <div className="space-y-2">
                              <p className="font-semibold">Informazioni Campagna</p>
                              <div className="text-sm space-y-1">
                                <p>Individuazioni: <strong>{formatNumber(campagna.statistiche?.individuazioni_create)}</strong></p>
                                {campagna.statistiche && (
                                  <>
                                    <p>Programmazioni totali: <strong>{formatNumber(campagna.statistiche.programmazioni_totali)}</strong></p>
                                    <p>Con match: <strong>{formatNumber(campagna.statistiche.programmazioni_con_match)}</strong></p>
                                    <p>Senza match: <strong>{formatNumber(campagna.statistiche.programmazioni_senza_match)}</strong></p>
                                  </>
                                )}
                              </div>
                              {campagna.descrizione && (
                                <div className="pt-2 border-t">
                                  <p className="text-xs font-medium">Note:</p>
                                  <p className="text-xs">{campagna.descrizione}</p>
                                </div>
                              )}
                              
                              {/* Processing progress for in_corso state */}
                              {campagna.stato === 'in_corso' && (() => {
                                const progress = processingProgressMap[campagna.id]
                                const isInterrupted = progress?.job_stato === 'error' || isProcessingStale(progress)
                                const needsReview = !progress?.last_activity_at && progress?.job_stato !== 'running'
                                
                                return (
                                  <div className="pt-2 border-t border-primary-foreground/20">
                                    <p className="font-medium text-sm mb-2 flex items-center gap-1.5">
                                      {isInterrupted ? (
                                        <>
                                          <AlertCircle className="h-3 w-3 text-yellow-500" />
                                          Processo interrotto
                                        </>
                                      ) : needsReview ? (
                                        <>
                                          <AlertCircle className="h-3 w-3 text-yellow-500" />
                                          Stato da verificare
                                        </>
                                      ) : (
                                        <>
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          Elaborazione in corso
                                        </>
                                      )}
                                    </p>
                                  {!processingProgressMap[campagna.id] && !loadingProgressMap[campagna.id] ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        fetchProcessingProgress(campagna.id)
                                      }}
                                      className="text-xs opacity-80 hover:opacity-100 underline"
                                    >
                                      Mostra avanzamento dettagliato
                                    </button>
                                  ) : loadingProgressMap[campagna.id] ? (
                                    <div className="flex items-center gap-2 text-xs opacity-80">
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      <span>Caricamento...</span>
                                    </div>
                                  ) : processingProgressMap[campagna.id] ? (
                                    <div className="space-y-2 text-xs">
                                      <div className="space-y-1.5">
                                        <div className="flex justify-between opacity-90">
                                          <span>Individuazioni create:</span>
                                          <span className="font-medium">{processingProgressMap[campagna.id]!.individuazioni_create.toLocaleString()} / {processingProgressMap[campagna.id]!.programmazioni_totali.toLocaleString()} programmazioni</span>
                                        </div>
                                        {(() => {
                                          // Calculate estimated progress based on individuazioni created
                                          // Estimate: ~1-2% of programmazioni generate individuazioni on average
                                          // Scale by 10x to make progress more visible (so 1% completion = 10% bar)
                                          const estimatedProgress = processingProgressMap[campagna.id]!.programmazioni_totali > 0
                                            ? Math.min(100, Math.round((processingProgressMap[campagna.id]!.individuazioni_create / processingProgressMap[campagna.id]!.programmazioni_totali) * 10 * 100))
                                            : 0
                                          
                                          return (
                                            <div className="h-1.5 bg-primary-foreground/20 rounded-full overflow-hidden">
                                              <div 
                                                className="h-full bg-primary-foreground/80 rounded-full transition-all"
                                                style={{ width: `${estimatedProgress}%` }}
                                              />
                                            </div>
                                          )
                                        })()}
                                        <div className="flex justify-between opacity-70 text-[11px]">
                                          <span>Programmazioni totali:</span>
                                          <span>{processingProgressMap[campagna.id]!.programmazioni_totali.toLocaleString()}</span>
                                        </div>
                                      </div>
                                      {processingProgressMap[campagna.id]!.processing_started_at && (
                                        <div className="flex justify-between opacity-70 pt-1.5 border-t border-primary-foreground/10 text-[11px]">
                                          <span>Avviato il:</span>
                                          <span>{new Date(processingProgressMap[campagna.id]!.processing_started_at!).toLocaleString('it-IT')}</span>
                                        </div>
                                      )}
                                      {processingProgressMap[campagna.id]!.job_stato === 'error' && (
                                        <div className="pt-1.5 text-[11px] text-yellow-300 flex items-center gap-1.5">
                                          <AlertCircle className="h-3 w-3" />
                                          <span>Job in errore — puoi riprendere il processo.</span>
                                        </div>
                                      )}
                                      {processingProgressMap[campagna.id]!.last_activity_at && (() => {
                                        const lastActivity = new Date(processingProgressMap[campagna.id]!.last_activity_at!)
                                        const minutesSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / 1000 / 60)
                                        const isStale = minutesSinceActivity > 10
                                        
                                        return (
                                          <>
                                            <div className={`flex justify-between pt-1.5 border-t border-primary-foreground/10 text-[11px] ${isStale ? 'text-yellow-300' : 'opacity-70'}`}>
                                              <span>Ultima attività:</span>
                                              <span>{lastActivity.toLocaleString('it-IT')}</span>
                                            </div>
                                            {isStale && (
                                              <div className="pt-1.5 text-[11px] text-yellow-300 flex items-center gap-1.5">
                                                <span>⚠️</span>
                                                <span>Processo interrotto ({minutesSinceActivity} minuti senza attività) — riprendibile</span>
                                              </div>
                                            )}
                                          </>
                                        )
                                      })()}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          fetchProcessingProgress(campagna.id)
                                        }}
                                        className="opacity-70 hover:opacity-100 text-[11px] flex items-center gap-1"
                                      >
                                        ↻ Aggiorna stato
                                      </button>
                                    </div>
                                  ) : null}
                                  </div>
                                )
                              })()}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      {campagna.emittenti?.nome || '-'}
                    </TableCell>
                    <TableCell className="py-4">
                      {campagna.anno || '-'}
                    </TableCell>
                    <TableCell className="py-4 text-right font-medium">
                      {formatNumber(campagna.statistiche?.individuazioni_create)}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      {formatNumber(campagna.statistiche?.artisti_distinti)}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      {formatNumber(campagna.statistiche?.opere_distinte)}
                    </TableCell>
                    <TableCell className="py-4">
                        {getStatoBadge(campagna.stato, campagna.id)}
                    </TableCell>
                    <TableCell className="py-4">
                      {formatDate(campagna.created_at)}
                    </TableCell>
                    <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {/* Riprendi — processo interrotto (in_corso + stale) */}
                        {canShowResume(campagna) && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canStartProcess(campagna.campagne_programmazione_id) || resumingId === campagna.id}
                            onClick={() => handleResume(campagna)}
                            className="gap-1.5 border-yellow-500 text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400"
                          >
                            {resumingId === campagna.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCw className="h-4 w-4" />
                            )}
                            Riprendi
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Apri dettaglio ${campagna.nome}`}
                          onClick={() => router.push(`/dashboard/individuazioni/${campagna.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Azioni per ${campagna.nome}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/individuazioni/${campagna.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Dettaglio
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              variant="destructive"
                              onClick={() => handleOpenDeleteDialog(campagna)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          <div className="lg:hidden space-y-4 p-4">
            {filteredCampagne.length === 0 ? (
              <EmptyState
                title={hasActiveFilters ? 'Nessuna campagna corrisponde ai filtri attuali' : 'Non ci sono campagne di individuazione disponibili'}
                description={hasActiveFilters ? 'Cancella i filtri per tornare alla lista completa.' : 'Quando verranno create campagne di individuazione, le troverai qui.'}
                actionLabel={hasActiveFilters ? 'Cancella filtri' : undefined}
                onAction={hasActiveFilters ? resetFilters : undefined}
              />
            ) : (
              filteredCampagne.map((campagna) => {
                const progress = processingProgressMap[campagna.id]
                const canResume = canShowResume(campagna)

                return (
                  <Card
                    key={campagna.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`Apri dettaglio individuazione ${campagna.nome}`}
                    className={`p-4 ${clickableRowClassName}`}
                    onClick={() => router.push(`/dashboard/individuazioni/${campagna.id}`)}
                    onKeyDown={(event) => handleClickableRowKeyDown(event, () => router.push(`/dashboard/individuazioni/${campagna.id}`))}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-muted-foreground" />
                            <h2 className="font-medium text-foreground">{campagna.nome}</h2>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {campagna.emittenti?.nome || 'Emittente non indicata'} • {campagna.anno || '-'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {getStatoBadge(campagna.stato, campagna.id)}
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(campagna.created_at)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Individuazioni</p>
                            <p className="font-medium">{formatNumber(campagna.statistiche?.individuazioni_create)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Artisti</p>
                            <p className="font-medium">{formatNumber(campagna.statistiche?.artisti_distinti)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Opere</p>
                            <p className="font-medium">{formatNumber(campagna.statistiche?.opere_distinte)}</p>
                          </div>
                        </div>
                        {progress?.job_stato === 'error' && (
                          <p className="text-sm text-yellow-700">Processo interrotto, puoi riprenderlo.</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col gap-2" onClick={(event) => event.stopPropagation()}>
                        {canResume && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canStartProcess(campagna.campagne_programmazione_id) || resumingId === campagna.id}
                            onClick={() => handleResume(campagna)}
                            className="border-yellow-500 text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400"
                          >
                            {resumingId === campagna.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCw className="h-4 w-4" />
                            )}
                            Riprendi
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Apri dettaglio ${campagna.nome}`}
                          onClick={() => router.push(`/dashboard/individuazioni/${campagna.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                          Dettaglio
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>

        </CardContent>
      </Card>

      {/* Delete Campagna Individuazione Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={handleCloseDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Elimina Campagna Individuazione
            </DialogTitle>
            <DialogDescription>
              Conferma l&apos;eliminazione della campagna <span className="font-medium text-foreground">{campagnaToDelete?.nome}</span>
            </DialogDescription>
          </DialogHeader>

          {isLoadingDeleteInfo ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Verifica in corso...</p>
            </div>
          ) : deleteInfo ? (
            <div className="py-4 space-y-4">
              {/* Warning message */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-600">
                  <Info className="h-5 w-5" />
                  <p className="font-medium">Attenzione</p>
                </div>
                <p className="text-sm text-amber-700">
                  Questa operazione eliminerà <strong>{deleteInfo.individuazioni_count.toLocaleString()}</strong> individuazioni associate alla campagna.
                </p>
              </div>

              {/* Additional info */}
              <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Campagna Programmazione:</strong> {deleteInfo.campagne_programmazione_nome}
                </p>
                <p className="text-sm text-muted-foreground">
                  La campagna programmazione tornerà allo stato &quot;In review&quot; e potrai eventualmente ricreare le individuazioni.
                </p>
              </div>

              {/* Progress during deletion */}
              {isDeletingCampagna && deleteProgress && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">
                      {deleteProgress.phase === 'deleting_individuazioni' && 'Eliminazione individuazioni...'}
                      {deleteProgress.phase === 'updating_programmazione' && 'Aggiornamento campagna programmazione...'}
                      {deleteProgress.phase === 'deleting_campagna' && 'Eliminazione campagna...'}
                    </span>
                  </div>
                  {deleteProgress.phase === 'deleting_individuazioni' && deleteProgress.total && (
                    <div className="space-y-1">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-destructive transition-all"
                          style={{ width: `${((deleteProgress.deleted || 0) / deleteProgress.total) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-right">
                        {(deleteProgress.deleted || 0).toLocaleString()} / {deleteProgress.total.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Errore nel caricamento delle informazioni
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={handleCloseDeleteDialog} 
              disabled={isDeletingCampagna}
            >
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={isLoadingDeleteInfo || isDeletingCampagna || !deleteInfo}
            >
              {isDeletingCampagna ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Elimina Campagna
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


