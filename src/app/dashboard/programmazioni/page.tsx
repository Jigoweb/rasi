'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/shared/lib/supabase'
import {
  createCampagnaProgrammazione,
  type CampagnaProgrammazione,
  getCampagneProgrammazione,
  getLatestProcessingJobsForCampagne,
  getProcessingProgress,
  updateCampagnaProgrammazioneMetadata,
  type ProcessingActivityJob,
  type ProcessingProgress,
} from '@/features/programmazioni/services/programmazioni.service'
import {
  getLatestUploadJobsForCampagne,
} from '@/features/programmazioni/services/programmazioni-upload-worker.service'
import {
  filterCampagneProgrammazione,
  getUniqueAnni,
  getUniqueEmittenti,
} from '@/features/programmazioni/services/programmazioni-filters.service'
import { createCoalescedOperationalSnapshotLoader } from '@/features/programmazioni/services/programmazioni-operational-snapshot.service'
import { getIndividuazioneRuntimeMode } from '@/features/campagne-individuazione/services/campagne-individuazione.service'
import EmittentiTab from './components/EmittentiTab'
import MappingWizard from './components/MappingWizard'
import ProgrammazioniTable from './components/ProgrammazioniTable'
import UploadProgrammazioniDialog from './components/UploadProgrammazioniDialog'
import { useProgrammazioniDelete } from './hooks/useProgrammazioniDelete'
import { useProgrammazioniEmittenti } from './hooks/useProgrammazioniEmittenti'
import { useProgrammazioniUpload } from './hooks/useProgrammazioniUpload'
import { useIndividuazioneProcess } from '@/shared/contexts/individuazione-process-context'
import { ProcessBlockedDialog } from '@/shared/components/individuazione-progress-indicator'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Textarea } from '@/shared/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Search, Plus, Trash2, Eye, Download, Filter, Calendar, Tv, Radio, CheckCircle, XCircle, Loader2, X, Sparkles, Info, Users, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import { notifyError, notifySuccess } from '@/shared/lib/toast'

type ImportRow = Record<string, unknown>
type ArtistOption = {
  id: string
  nome: string
  cognome: string
  nome_arte: string | null
  data_inizio_mandato: string
  data_fine_mandato: string | null
  stato: string | null
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const details = (error as { details?: unknown }).details
    if (typeof details === 'string') return details
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
    return JSON.stringify(error)
  }
  return String(error)
}

function getYearFromDate(dateString: string | null | undefined): number | null {
  if (!dateString) return null
  const year = new Date(dateString).getFullYear()
  return Number.isFinite(year) ? year : null
}

function artistMandateCoversYear(artist: ArtistOption, year: number | null | undefined): boolean {
  if (!year) return true
  const startYear = getYearFromDate(artist.data_inizio_mandato)
  const endYear = getYearFromDate(artist.data_fine_mandato)

  if (startYear !== null && startYear > year) return false
  if (endYear !== null && endYear < year) return false
  return true
}

function getMandateExclusionReason(artist: ArtistOption, year: number): string {
  const startYear = getYearFromDate(artist.data_inizio_mandato)
  const endYear = getYearFromDate(artist.data_fine_mandato)

  if (startYear !== null && startYear > year) {
    return `Mandato dal ${startYear}, programmazione ${year}`
  }

  if (endYear !== null && endYear < year) {
    return `Mandato terminato nel ${endYear}, programmazione ${year}`
  }

  return `Mandato non valido per programmazione ${year}`
}

function artistMatchesSearch(artist: ArtistOption, query: string): boolean {
  if (!query) return true
  const searchLower = query.toLowerCase()
  const fullName = `${artist.nome} ${artist.cognome}`.toLowerCase()
  const reverseName = `${artist.cognome} ${artist.nome}`.toLowerCase()
  const nomeArte = artist.nome_arte?.toLowerCase() || ''
  return fullName.includes(searchLower) || reverseName.includes(searchLower) || nomeArte.includes(searchLower)
}

const formSchema = z.object({
  emittente_id: z.string().min(1, "Seleziona un'emittente"),
  anno: z.coerce.number().min(1900, "Anno non valido").max(2100, "Anno non valido"),
  nome: z.string().min(1, "Il nome è obbligatorio"),
  descrizione: z.string().optional(),
})

export default function ProgrammazioniPage() {
  const router = useRouter()
  const [currentTab, setCurrentTab] = useState<'programmazioni' | 'emittenti'>('programmazioni')
  
  // New Programmazione Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [newProgrammazioneStep, setNewProgrammazioneStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResumingUpload, setIsResumingUpload] = useState(false)
  const [campagnaToEdit, setCampagnaToEdit] = useState<CampagnaProgrammazione | null>(null)
  const [editMetadataDraft, setEditMetadataDraft] = useState({ nome: '', descrizione: '' })
  const [isSavingMetadata, setIsSavingMetadata] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emittente_id: '',
      anno: new Date().getFullYear(),
      nome: '',
      descrizione: '',
    },
  })

  // Campagne State
  const [campagne, setCampagne] = useState<CampagnaProgrammazione[]>([])
  const [filteredCampagne, setFilteredCampagne] = useState<CampagnaProgrammazione[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [emittenteFilter, setEmittenteFilter] = useState<string>('all')
  const [annoFilter, setAnnoFilter] = useState<string>('all')
  const [selectedCampagna, setSelectedCampagna] = useState<CampagnaProgrammazione | null>(null)

  const {
    emittenti,
    loadingEmittenti,
    searchEmittentiQuery,
    debouncedSearchEmittentiQuery,
    filteredEmittenti,
    selectedEmittente,
    showEmittenteDetails,
    showEmittenteForm,
    emittenteFormMode,
    emittenteFormData,
    emittenteFormSaving,
    emittenteFormError,
    fetchEmittenti,
    setSearchEmittentiQuery,
    setShowEmittenteDetails,
    setShowEmittenteForm,
    setEmittenteFormData,
    openCreateEmittente,
    openEditEmittente,
    handleSaveEmittente,
    openManageEmittente,
  } = useProgrammazioniEmittenti()

  // Watch values to auto-generate name
  const watchedEmittenteId = form.watch('emittente_id')
  const watchedAnno = form.watch('anno')

  const [deleteProgress] = useState<Record<string, { done: number; total: number }>>({})
  const [processingProgressMap, setProcessingProgressMap] = useState<Record<string, ProcessingProgress | null>>({})
  const [processingJobMap, setProcessingJobMap] = useState<Record<string, ProcessingActivityJob | null>>({})
  const [loadingProgressMap, setLoadingProgressMap] = useState<Record<string, boolean>>({})
  const refreshCampagneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const operationalSnapshotLoaderRef = useRef(createCoalescedOperationalSnapshotLoader({
    workerMode: getIndividuazioneRuntimeMode() === 'worker',
    getCampagneProgrammazione,
    getLatestProcessingJobsForCampagne,
    getLatestUploadJobsForCampagne,
    getProcessingProgress,
  }))

  // Individuazioni - use global context
  const { startProcess, canStartProcess, isCampagnaProcessing } = useIndividuazioneProcess()
  const [showProcessBlockedDialog, setShowProcessBlockedDialog] = useState(false)
  const [showIndividuazioniConfirmDialog, setShowIndividuazioniConfirmDialog] = useState(false)
  const [campagnaForIndividuazioni, setCampagnaForIndividuazioni] = useState<CampagnaProgrammazione | null>(null)
  const [individuazioneName, setIndividuazioneName] = useState('')
  const [individuazioneDescription, setIndividuazioneDescription] = useState('')
  const [showIndividuazioneNote, setShowIndividuazioneNote] = useState(false)
  const lastSuggestedNameRef = useRef('')
  // Guard per inizializzare la selezione artisti una sola volta per apertura dialog.
  const selectionInitializedRef = useRef(false)
  
  // Artist filter for individuazioni
  const [showArtistFilter, setShowArtistFilter] = useState(false)
  const [allArtists, setAllArtists] = useState<ArtistOption[]>([])
  const [loadingArtists, setLoadingArtists] = useState(false)
  const [selectedArtistIds, setSelectedArtistIds] = useState<Set<string>>(new Set())
  const [mandatoOverrideArtistIds, setMandatoOverrideArtistIds] = useState<Set<string>>(new Set())
  const [artistSearchQuery, setArtistSearchQuery] = useState('')

  const {
    isDeleteDialogOpen,
    campagnaToDelete,
    deleteInfo,
    isLoadingDeleteInfo,
    isDeletingCampagna,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  } = useProgrammazioniDelete({ updateCampagne: setCampagne })

  const {
    fileInputRef,
    selectedFile,
    parsedRows,
    parsedRowCount,
    uploadDecision,
    headerError,
    isUploadReady,
    isUploading,
    isPreparingUpload,
    uploadProgress,
    uploadError,
    mappingWizardOpen,
    mappingWizardInitial,
    formatWarning,
    setUploadError,
    setFormatWarning,
    setMappingWizardOpen,
    resetUploadState,
    applyUploadJobSnapshot,
    attachUploadJobPolling,
    handleFileUpload,
    handleWizardSave,
    proceedDespiteFormatChange: handleProceedDespiteFormatChange,
    updateMappingFromWarning: handleUpdateMappingFromWarning,
    handleUploadDatabase,
  } = useProgrammazioniUpload({
    selectedCampagna,
    updateCampagne: setCampagne,
    refreshCampagne: requestCampagneRefresh,
    refreshEmittenti: fetchEmittenti,
    closeModal: handleCloseModal,
  })

  // Load all artists for filter selection
  const loadArtists = useCallback(async () => {
    if (allArtists.length > 0) return // Already loaded
    
    setLoadingArtists(true)
    try {
      const { data, error } = await supabase
        .from('artisti')
        .select('id, nome, cognome, nome_arte, data_inizio_mandato, data_fine_mandato, stato')
        .order('cognome', { ascending: true })
        .order('nome', { ascending: true })
        .limit(5000)
      
      if (error) throw error
      const artists = (data || []) as ArtistOption[]
      setAllArtists(artists)
      // La selezione di default viene inizializzata all'apertura del dialog
      // (dipende dall'anno campagna, quindi non qui).
    } catch (error) {
      console.error('Errore caricamento artisti:', error)
      notifyError('Impossibile caricare gli artisti', error)
    } finally {
      setLoadingArtists(false)
    }
  }, [allArtists.length])

  // Fetch processing progress for a specific campaign
  const fetchProcessingProgress = useCallback(async (campagnaId: string) => {
    setLoadingProgressMap(prev => {
      if (prev[campagnaId]) return prev // Already loading, no change
      return { ...prev, [campagnaId]: true }
    })
    try {
      const { data, error } = await getProcessingProgress(campagnaId)
      if (error) throw error
      setProcessingProgressMap(prev => ({ ...prev, [campagnaId]: data }))
    } catch (error) {
      console.error('Error fetching processing progress:', error)
      notifyError('Impossibile caricare l\'avanzamento', error)
    } finally {
      setLoadingProgressMap(prev => ({ ...prev, [campagnaId]: false }))
    }
  }, [])

  // Handle starting individuazioni process - show confirmation first
  const handleStartIndividuazioni = (campagna: CampagnaProgrammazione) => {
    if (!canStartProcess(campagna.id)) {
      // Show blocked dialog if this campaign is already running.
      setShowProcessBlockedDialog(true)
      return
    }

    // Show confirmation dialog first
    setCampagnaForIndividuazioni(campagna)
    setIndividuazioneName(buildIndividuazioneName(campagna.nome))
    setIndividuazioneDescription('')
    setShowIndividuazioneNote(false)
    setShowIndividuazioniConfirmDialog(true)
    setShowArtistFilter(false) // Reset filter panel
    setArtistSearchQuery('') // Reset search
    setMandatoOverrideArtistIds(new Set())
    loadArtists() // Load artists if not already loaded
  }

  // Actually start the process after confirmation
  const handleConfirmStartIndividuazioni = async () => {
    if (!campagnaForIndividuazioni) return

    setShowIndividuazioniConfirmDialog(false)

    // Update local state to show processing
      setCampagne(prev => prev.map(c => 
        c.id === campagnaForIndividuazioni.id ? { ...c, stato: 'in_corso' } : c
      ))

    const mandatoOverrideIds = Array.from(mandatoOverrideArtistIds)
    const effectiveArtistIds = new Set([...selectedArtistIds, ...mandatoOverrideIds])

    // Se tutti gli eleggibili sono selezionati passiamo artistaIds null: il backend
    // considera tutti gli artisti e applica da solo l'esclusione per mandato sull'anno.
    // Gli override viaggiano sul parametro dedicato. Con un subset, l'allowlist deve
    // includere anche gli override, altrimenti il matcher base li scarterebbe.
    const artistaIds = allEligibleSelected || effectiveArtistIds.size === 0
      ? null
      : Array.from(effectiveArtistIds)

    // Start the global process with optional artist filter
    const result = await startProcess(campagnaForIndividuazioni, {
      artistaIds,
      mandatoOverrideArtistIds: mandatoOverrideIds.length > 0 ? mandatoOverrideIds : null,
      nomeCampagna: individuazioneName.trim() || undefined,
      descrizione: individuazioneDescription.trim() || undefined,
    })

    // Update local state based on result
    if (result.success) {
        setCampagne(prev => prev.map(c => 
          c.id === campagnaForIndividuazioni.id ? { ...c, stato: 'individuata' } : c
        ))
      } else {
        fetchCampagne()
    }

    setCampagnaForIndividuazioni(null)
  }

  // Riprende un processo di individuazione interrotto (stato in_corso + stale).
  // Riusa la campagna_individuazione esistente e salta le programmazioni già
  // processate (resume), senza ricominciare da capo.
  const handleResumeIndividuazioni = async (campagna: CampagnaProgrammazione) => {
    if (!canStartProcess(campagna.id)) {
      setShowProcessBlockedDialog(true)
      return
    }
    setCampagne(prev => prev.map(c =>
      c.id === campagna.id ? { ...c, stato: 'in_corso' } : c
    ))
    const result = await startProcess(campagna, { resume: true })
    if (result.success) {
      setCampagne(prev => prev.map(c =>
        c.id === campagna.id ? { ...c, stato: 'individuata' } : c
      ))
    } else {
      // Resume fallito (es. lock di altro utente): riallinea allo stato reale
      fetchCampagne()
    }
  }

  function requestCampagneRefresh() {
    if (refreshCampagneTimeoutRef.current) return
    refreshCampagneTimeoutRef.current = setTimeout(() => {
      refreshCampagneTimeoutRef.current = null
      void fetchCampagne()
    }, 250)
  }

  useEffect(() => {
    if (watchedEmittenteId && watchedAnno) {
      const emittente = emittenti.find(e => e.id === watchedEmittenteId)
      if (emittente) {
        const suggestedName = `${emittente.nome} ${watchedAnno}`
        const currentName = form.getValues('nome')
        if (!currentName || currentName === lastSuggestedNameRef.current) {
          form.setValue('nome', suggestedName, { shouldValidate: true })
        }
        lastSuggestedNameRef.current = suggestedName
      }
    }
  }, [watchedEmittenteId, watchedAnno, emittenti, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    try {
      const { data, error } = await createCampagnaProgrammazione({
        ...values,
        nome: values.nome.trim(),
        descrizione: values.descrizione?.trim() || undefined,
      })
      if (error) throw error
      
      await fetchCampagne()
      setSelectedCampagna((data as unknown) as CampagnaProgrammazione)
      setNewProgrammazioneStep(2)
      notifySuccess('Campagna creata', 'Puoi procedere con il caricamento dei dati.')
    } catch (error) {
      console.error('Error creating campagna:', error)
      notifyError('Creazione campagna non riuscita', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCloseModal() {
    setIsNewModalOpen(false)
    setNewProgrammazioneStep(1)
    setIsResumingUpload(false)
    setSelectedCampagna(null)
    form.reset()
    lastSuggestedNameRef.current = ''
    resetUploadState()
  }

  function openEditMetadataDialog(campagna: CampagnaProgrammazione) {
    setCampagnaToEdit(campagna)
    setEditMetadataDraft({
      nome: campagna.nome,
      descrizione: campagna.descrizione || '',
    })
  }

  async function handleSaveProgrammazioneMetadata() {
    if (!campagnaToEdit) return
    const nome = editMetadataDraft.nome.trim()
    if (!nome) return

    setIsSavingMetadata(true)
    try {
      const { data, error } = await updateCampagnaProgrammazioneMetadata(campagnaToEdit.id, {
        nome,
        descrizione: editMetadataDraft.descrizione,
      })
      if (error) throw error

      setCampagne(prev => prev.map(campagna => (
        campagna.id === campagnaToEdit.id
          ? {
              ...campagna,
              ...(data || {}),
              nome,
              descrizione: editMetadataDraft.descrizione.trim() || null,
            }
          : campagna
      )))
      setCampagnaToEdit(null)
      notifySuccess('Dettagli campagna aggiornati')
    } catch (error) {
      console.error('Error updating campagna metadata:', error)
      notifyError('Salvataggio dettagli non riuscito', error)
    } finally {
      setIsSavingMetadata(false)
    }
  }

  const filterCampagne = useCallback(() => {
    setFilteredCampagne(filterCampagneProgrammazione(campagne, {
      searchQuery: debouncedSearchQuery,
      statusFilter,
      emittenteFilter,
      annoFilter,
    }))
  }, [campagne, debouncedSearchQuery, statusFilter, emittenteFilter, annoFilter])

  // Get unique anni from campagne for filter dropdown
  const uniqueAnni = useMemo(() => getUniqueAnni(campagne), [campagne])

  // Get unique emittenti from campagne for filter dropdown
  const uniqueEmittenti = useMemo(() => getUniqueEmittenti(campagne), [campagne])

  const annoIndividuazione = campagnaForIndividuazioni?.anno ?? null
  const mandateExcludedArtists = useMemo(() => {
    if (!annoIndividuazione) return []
    return allArtists.filter(artist => !artistMandateCoversYear(artist, annoIndividuazione))
  }, [allArtists, annoIndividuazione])
  const mandateExcludedArtistIds = useMemo(
    () => new Set(mandateExcludedArtists.map(artist => artist.id)),
    [mandateExcludedArtists]
  )
  const eligibleArtists = useMemo(
    () => allArtists.filter(artist => !mandateExcludedArtistIds.has(artist.id)),
    [allArtists, mandateExcludedArtistIds]
  )
  const allEligibleSelected = useMemo(
    () => eligibleArtists.length > 0 && eligibleArtists.every(artist => selectedArtistIds.has(artist.id)),
    [eligibleArtists, selectedArtistIds]
  )
  // Stato di default: tutti gli eleggibili selezionati e nessun override mandato.
  const isDefaultSelection = allEligibleSelected && mandatoOverrideArtistIds.size === 0
  const filteredEligibleArtists = useMemo(
    () => eligibleArtists.filter(artist => artistMatchesSearch(artist, artistSearchQuery)),
    [eligibleArtists, artistSearchQuery]
  )
  const filteredMandateExcludedArtists = useMemo(
    () => mandateExcludedArtists.filter(artist => artistMatchesSearch(artist, artistSearchQuery)),
    [mandateExcludedArtists, artistSearchQuery]
  )
  const effectiveSelectedArtistCount = useMemo(
    () => new Set([...selectedArtistIds, ...mandatoOverrideArtistIds]).size,
    [selectedArtistIds, mandatoOverrideArtistIds]
  )

  useEffect(() => {
    if (isNewModalOpen && emittenti.length === 0) {
      fetchEmittenti()
    }
  }, [isNewModalOpen, emittenti.length])

  // Inizializza la selezione di default a ogni apertura del dialog: tutti gli
  // artisti eleggibili per l'anno campagna selezionati, nessun override mandato.
  // L'eleggibilità dipende dall'anno, quindi si ricalcola per ogni apertura.
  useEffect(() => {
    if (!showIndividuazioniConfirmDialog) {
      selectionInitializedRef.current = false
      return
    }
    if (selectionInitializedRef.current) return
    if (loadingArtists || allArtists.length === 0) return
    setSelectedArtistIds(new Set(eligibleArtists.map(artist => artist.id)))
    setMandatoOverrideArtistIds(new Set())
    selectionInitializedRef.current = true
  }, [showIndividuazioniConfirmDialog, loadingArtists, allArtists, eligibleArtists])

  useEffect(() => {
    if (currentTab === 'programmazioni') {
      fetchCampagne()
    } else {
      fetchEmittenti()
    }
  }, [currentTab])

  useEffect(() => {
    return () => {
      if (refreshCampagneTimeoutRef.current) {
        clearTimeout(refreshCampagneTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    filterCampagne()
  }, [filterCampagne])

  // Debounce search inputs
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const fetchCampagne = async () => {
    setLoading(true)
    try {
      const snapshot = await operationalSnapshotLoaderRef.current.load()

      if (snapshot.error && snapshot.campagne.length === 0) {
        const errorMessage = getErrorMessage(snapshot.error)
        console.error('Error fetching campagne:', errorMessage, snapshot.error)
        notifyError('Impossibile caricare le programmazioni', snapshot.error)
        setCampagne([])
        return
      }

      if (snapshot.error) {
        console.warn('[programmazioni] Operational snapshot partially unavailable:', snapshot.error)
      }

      const campagneList = snapshot.campagne
      setCampagne(campagneList)
      setProcessingJobMap(snapshot.processingJobMap)
      setProcessingProgressMap(prev => ({
        ...prev,
        ...snapshot.processingProgressMap,
      }))

      for (const job of snapshot.uploadJobs) {
        const campagna = campagneList.find(c => c.id === job.campagna_programmazione_id)
        const fallbackTotal = campagna?.programmazioni_count ?? 0

        if (job.stato === 'queued' || job.stato === 'running') {
          attachUploadJobPolling(job, fallbackTotal)
        } else {
          applyUploadJobSnapshot(job, fallbackTotal)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null
        ? JSON.stringify(error)
        : String(error)
      console.error('Error fetching campagne:', errorMessage, error)
      notifyError('Impossibile caricare le programmazioni', error)
      setCampagne([])
    } finally {
      setLoading(false)
    }
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

  const programmazioneDetailsForm = (
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
                <div className="space-y-2">
                  <Input {...field} placeholder="Es. Rai 1 2026 - Test palinsesto A" />
                  {lastSuggestedNameRef.current && field.value !== lastSuggestedNameRef.current && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto px-0 text-xs text-muted-foreground"
                      onClick={() => form.setValue('nome', lastSuggestedNameRef.current, { shouldValidate: true })}
                    >
                      Ripristina suggerimento: {lastSuggestedNameRef.current}
                    </Button>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descrizione"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione / Note (opzionale)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Aggiungi informazioni aggiuntive sulla campagna..."
                  className="resize-none"
                  rows={3}
                />
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
  )

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
              <div className="flex flex-col gap-4">
                {/* Prima riga: Ricerca */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cerca per nome o emittente..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
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
                    <SelectItem value="bozza">Bozza</SelectItem>
                    <SelectItem value="uploading">Uploading</SelectItem>
                    <SelectItem value="in_review">In review</SelectItem>
                      <SelectItem value="in_corso">In elaborazione</SelectItem>
                      <SelectItem value="individuata">Individuata</SelectItem>
                      <SelectItem value="deleting">In eliminazione</SelectItem>
                      <SelectItem value="error">Errore</SelectItem>
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
                    onClick={() => { 
                      setSearchQuery('')
                      setStatusFilter('all')
                      setEmittenteFilter('all')
                      setAnnoFilter('all')
                    }}
                    className="sm:ml-auto"
                  >
                    Reset filtri
                  </Button>
              </div>
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
                    <X className="h-3 w-3 mr-1" /> Stato: {statusFilter === 'in_corso' ? 'In elaborazione' : statusFilter}
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

              <div className="mt-4 text-sm text-gray-600">
                Mostrando {filteredCampagne.length} di {campagne.length} campagne
              </div>
            </CardContent>
          </Card>

          <ProgrammazioniTable
            campagne={filteredCampagne}
            uploadProgress={uploadProgress}
            deleteProgress={deleteProgress}
            processingProgressMap={processingProgressMap}
            processingJobMap={processingJobMap}
            loadingProgressMap={loadingProgressMap}
            isCampagnaProcessing={isCampagnaProcessing}
            canStartProcess={canStartProcess}
            fetchProcessingProgress={fetchProcessingProgress}
            onUpload={(campagna) => {
              setSelectedCampagna(campagna)
              setNewProgrammazioneStep(2)
              setIsResumingUpload(true)
              setIsNewModalOpen(true)
            }}
            onStartIndividuazioni={handleStartIndividuazioni}
            onResumeIndividuazioni={handleResumeIndividuazioni}
            onEdit={openEditMetadataDialog}
            onDelete={openDeleteDialog}
          />
        </>
      )}

      {/* Emittenti Content */}
      {currentTab === 'emittenti' && (
        <EmittentiTab
          emittenti={emittenti}
          loadingEmittenti={loadingEmittenti}
          searchEmittentiQuery={searchEmittentiQuery}
          debouncedSearchEmittentiQuery={debouncedSearchEmittentiQuery}
          filteredEmittenti={filteredEmittenti}
          selectedEmittente={selectedEmittente}
          showEmittenteDetails={showEmittenteDetails}
          showEmittenteForm={showEmittenteForm}
          emittenteFormMode={emittenteFormMode}
          emittenteFormData={emittenteFormData}
          emittenteFormSaving={emittenteFormSaving}
          emittenteFormError={emittenteFormError}
          fetchEmittenti={fetchEmittenti}
          setSearchEmittentiQuery={setSearchEmittentiQuery}
          setShowEmittenteDetails={setShowEmittenteDetails}
          setShowEmittenteForm={setShowEmittenteForm}
          setEmittenteFormData={setEmittenteFormData}
          openCreateEmittente={openCreateEmittente}
          openEditEmittente={openEditEmittente}
          handleSaveEmittente={handleSaveEmittente}
          openManageEmittente={openManageEmittente}
        />
      )}

      {/* Dettaglio campagna spostato su pagina dedicata */}

      <UploadProgrammazioniDialog
        open={isNewModalOpen}
        onOpenChange={handleCloseModal}
        step={newProgrammazioneStep}
        isResumingUpload={isResumingUpload}
        detailsForm={programmazioneDetailsForm}
        selectedCampagna={selectedCampagna}
        selectedFile={selectedFile}
        fileInputRef={fileInputRef}
        onFileUpload={handleFileUpload}
        isPreparingUpload={isPreparingUpload}
        isUploading={isUploading}
        parsedRowCount={parsedRowCount}
        headerError={headerError}
        uploadError={uploadError}
        onDismissUploadError={() => setUploadError(null)}
        uploadProgress={uploadProgress}
        isUploadReady={isUploadReady}
        onUploadDatabase={handleUploadDatabase}
        onClose={handleCloseModal}
      />

      <Dialog open={Boolean(campagnaToEdit)} onOpenChange={(open) => { if (!open) setCampagnaToEdit(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica dettagli programmazione</DialogTitle>
            <DialogDescription>
              Aggiorna il nome visualizzato e le note della campagna. I dati caricati e il matching non vengono modificati.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="edit-programmazione-name">Nome campagna</label>
              <Input
                id="edit-programmazione-name"
                value={editMetadataDraft.nome}
                onChange={(event) => setEditMetadataDraft(prev => ({ ...prev, nome: event.target.value }))}
                placeholder="Es. Rai 1 2026 - Test palinsesto A"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="edit-programmazione-description">Note</label>
              <Textarea
                id="edit-programmazione-description"
                value={editMetadataDraft.descrizione}
                onChange={(event) => setEditMetadataDraft(prev => ({ ...prev, descrizione: event.target.value }))}
                placeholder="Annotazioni interne, test, iterazioni o contesto del caricamento..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampagnaToEdit(null)}>Annulla</Button>
            <Button
              onClick={handleSaveProgrammazioneMetadata}
              disabled={isSavingMetadata || !editMetadataDraft.nome.trim()}
            >
              {isSavingMetadata && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva dettagli
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Campagna Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={closeDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Elimina Campagna
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
              {/* Scenario 1.1: Nessun dato */}
              {deleteInfo.scenario === 'empty' && (
                <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <p className="font-medium">Campagna vuota</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Non ci sono programmazioni associate a questa campagna. Puoi eliminarla in sicurezza.
                  </p>
                </div>
              )}

              {/* Scenario 1.2: Ha dati ma nessuna individuazione */}
              {deleteInfo.scenario === 'has_data' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-600">
                    <Info className="h-5 w-5" />
                    <p className="font-medium">Campagna con dati</p>
                  </div>
                  <p className="text-sm text-amber-700">
                    Questa campagna contiene <strong>{deleteInfo.programmazioni_count.toLocaleString()}</strong> programmazioni. 
                    Eliminando la campagna, verranno eliminate anche tutte le programmazioni associate.
                  </p>
                </div>
              )}

              {/* Scenario 1.3: Ha individuazione collegata - BLOCCO */}
              {deleteInfo.scenario === 'has_individuazione' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <p className="font-medium">Eliminazione non consentita</p>
                  </div>
                  <p className="text-sm text-red-700">
                    Questa campagna ha una <strong>campagna di individuazione collegata</strong>:
                  </p>
                  <div className="bg-white/60 rounded p-3 space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {deleteInfo.campagna_individuazione_nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {deleteInfo.individuazioni_count?.toLocaleString()} individuazioni create
                    </p>
                  </div>
                  <p className="text-sm text-red-700">
                    Per eliminare questa campagna, devi prima eliminare la campagna di individuazione dalla pagina <strong>Individuazioni</strong>.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Errore nel caricamento delle informazioni
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDeleteDialog} disabled={isDeletingCampagna}>
              Annulla
            </Button>
            {deleteInfo?.scenario !== 'has_individuazione' && (
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                disabled={isLoadingDeleteInfo || isDeletingCampagna}
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
            )}
            {deleteInfo?.scenario === 'has_individuazione' && (
              <Button onClick={() => {
                closeDeleteDialog()
                router.push('/dashboard/individuazioni')
              }}>
                <Eye className="mr-2 h-4 w-4" />
                Vai a Individuazioni
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Individuazioni Confirmation Dialog - shown before starting process */}
      <Dialog open={showIndividuazioniConfirmDialog} onOpenChange={setShowIndividuazioniConfirmDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Crea Individuazioni
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Come funziona il matching"
                    className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 text-sm">
                  <p className="font-medium mb-2">Il sistema effettuerà il matching automatico tra:</p>
                  <ul className="list-disc list-inside space-y-1 ml-1 text-muted-foreground">
                    <li>Programmazioni caricate</li>
                    <li>Opere nel catalogo</li>
                    <li>Partecipazioni degli artisti</li>
                  </ul>
                </PopoverContent>
              </Popover>
            </DialogTitle>
              <DialogDescription>
                Questa operazione creerà le individuazioni per tutte le programmazioni della campagna <span className="font-medium text-foreground">{campagnaForIndividuazioni?.nome}</span>.
              </DialogDescription>
          </DialogHeader>
          
            <div className="py-4 space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="individuazione-name">Nome individuazione</label>
                  <Input
                    id="individuazione-name"
                    value={individuazioneName}
                    onChange={(event) => setIndividuazioneName(event.target.value)}
                    placeholder="Es. Individuazione - Rai 1 2026"
                  />
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowIndividuazioneNote(v => !v)}
                    className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground/80"
                  >
                    {showIndividuazioneNote ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    Note individuazione (opzionale)
                    {!showIndividuazioneNote && individuazioneDescription.trim() && (
                      <Badge variant="secondary" className="ml-1">Compilate</Badge>
                    )}
                  </button>
                  {showIndividuazioneNote && (
                    <>
                      <Textarea
                        id="individuazione-description"
                        value={individuazioneDescription}
                        onChange={(event) => setIndividuazioneDescription(event.target.value)}
                        placeholder="Annotazioni su soglia, subset artisti, ipotesi o obiettivo del test..."
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Queste note saranno salvate solo sulla campagna di individuazione.
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                <span>
                  <strong className="text-foreground">{(campagnaForIndividuazioni?.programmazioni_count || 0).toLocaleString()}</strong> programmazioni
                </span>
                <span aria-hidden>·</span>
                <span>
                  Tempo stimato <strong className="text-foreground">{(() => {
                    const count = campagnaForIndividuazioni?.programmazioni_count || 0
                    const chunkSize = 25
                    // Ottimizzato: ~1s per chunk (SQL veloce con indice trigram + overhead rete)
                    const secondsPerChunk = 1.0
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
                  })()}</strong>
                </span>
                {campagnaForIndividuazioni?.descrizione && (
                  <span className="w-full text-xs">
                    <strong className="text-foreground">Note programmazione:</strong> {campagnaForIndividuazioni.descrizione}
                  </span>
                )}
              </div>

            {/* Artist Filter Section */}
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => setShowArtistFilter(!showArtistFilter)}
                className="w-full flex items-center justify-between p-3 text-sm hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Filtra Artisti</span>
                  {!isDefaultSelection && (
                    <Badge variant="secondary" className="ml-2">
                      {effectiveSelectedArtistCount} selezionati
                    </Badge>
                  )}
                </div>
                {showArtistFilter ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              
              {showArtistFilter && (
                <div className="border-t p-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Gli artisti eleggibili per l&apos;anno {annoIndividuazione || 'della programmazione'} sono selezionati di default. Gli artisti fuori periodo mandato sono esclusi e non conteggiati: puoi includerli singolarmente dalla sezione dedicata.
                  </p>

                  {/* Search and bulk actions */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cerca artista..."
                        value={artistSearchQuery}
                        onChange={(e) => setArtistSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-sm"
                      />
                </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedArtistIds(new Set(eligibleArtists.map(a => a.id)))
                        setMandatoOverrideArtistIds(new Set())
                      }}
                      className="text-xs"
                    >
                      Tutti eleggibili
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedArtistIds(new Set())
                        setMandatoOverrideArtistIds(new Set())
                      }}
                      className="text-xs"
                    >
                      Nessuno
                    </Button>
              </div>

                  {/* Artists list */}
                  {loadingArtists ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Caricamento artisti...</span>
                </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-foreground">Artisti eleggibili</p>
                          <span className="text-xs text-muted-foreground">{filteredEligibleArtists.length}</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto border rounded-md">
                          {filteredEligibleArtists.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-muted-foreground">Nessun artista eleggibile trovato.</p>
                          ) : filteredEligibleArtists.map(artist => (
                            <label
                              key={artist.id}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                            >
                              <Checkbox
                                checked={selectedArtistIds.has(artist.id)}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(selectedArtistIds)
                                  if (checked) {
                                    newSet.add(artist.id)
                                  } else {
                                    newSet.delete(artist.id)
                                  }
                                  setSelectedArtistIds(newSet)
                                }}
                              />
                              <span className="text-sm">
                                {artist.cognome} {artist.nome}
                                {artist.nome_arte && (
                                  <span className="text-muted-foreground ml-1">({artist.nome_arte})</span>
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {mandateExcludedArtists.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium text-foreground">Esclusi per mandato</p>
                            <span className="text-xs text-muted-foreground">{filteredMandateExcludedArtists.length} di {mandateExcludedArtists.length}</span>
                          </div>
                          <div className="max-h-40 overflow-y-auto border rounded-md bg-muted/20">
                            {filteredMandateExcludedArtists.length === 0 ? (
                              <p className="px-3 py-2 text-xs text-muted-foreground">Nessun escluso per mandato trovato.</p>
                            ) : filteredMandateExcludedArtists.map(artist => (
                              <label
                                key={artist.id}
                                className="flex items-start gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                              >
                                <Checkbox
                                  checked={mandatoOverrideArtistIds.has(artist.id)}
                                  onCheckedChange={(checked) => {
                                    const newSet = new Set(mandatoOverrideArtistIds)
                                    if (checked) {
                                      newSet.add(artist.id)
                                    } else {
                                      newSet.delete(artist.id)
                                    }
                                    setMandatoOverrideArtistIds(newSet)
                                  }}
                                />
                                <span className="text-sm">
                                  {artist.cognome} {artist.nome}
                                  {artist.nome_arte && (
                                    <span className="text-muted-foreground ml-1">({artist.nome_arte})</span>
                                  )}
                                  {annoIndividuazione && (
                                    <span className="block text-xs text-muted-foreground">
                                      {getMandateExclusionReason(artist, annoIndividuazione)}. Seleziona per includere comunque.
                                    </span>
                                  )}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
          )}

                  {/* Summary */}
                  <p className="text-xs text-muted-foreground text-right">
                    {selectedArtistIds.size} di {eligibleArtists.length} eleggibili selezionati
                    {mandateExcludedArtists.length > 0 && ` · ${mandateExcludedArtists.length} esclusi per mandato`}
                    {mandatoOverrideArtistIds.size > 0 && ` · ${mandatoOverrideArtistIds.size} inclusi comunque`}
                  </p>
            </div>
          )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowIndividuazioniConfirmDialog(false)}>
                  Annulla
                </Button>
                <Button 
              onClick={handleConfirmStartIndividuazioni}
              disabled={effectiveSelectedArtistCount === 0 || !individuazioneName.trim()}
                >
              <Sparkles className="mr-2 h-4 w-4" />
              {isDefaultSelection
                ? 'Avvia Processamento'
                : `Avvia con ${effectiveSelectedArtistCount} artisti`}
                </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Blocked Dialog - shown when trying to start a new process while one is running */}
      <ProcessBlockedDialog
        open={showProcessBlockedDialog}
        onClose={() => setShowProcessBlockedDialog(false)}
      />

      {/* Mapping Wizard (inline durante upload o modifica da format-warning) */}
      <MappingWizard
        open={mappingWizardOpen}
        onClose={() => setMappingWizardOpen(false)}
        initialConfig={mappingWizardInitial}
        prefillFile={selectedFile}
        onSave={handleWizardSave}
      />

      {/* Format change warning */}
      <Dialog open={!!formatWarning} onOpenChange={v => { if (!v) setFormatWarning(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Formato file cambiato</DialogTitle>
            <DialogDescription>
              Il file caricato ha colonne diverse rispetto alla mappatura salvata.
            </DialogDescription>
          </DialogHeader>
          {formatWarning && (
            <div className="space-y-3 py-2 text-sm">
              {formatWarning.mappedRemoved.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <div className="font-medium text-red-700 mb-1">
                    Colonne mappate non più presenti ({formatWarning.mappedRemoved.length}):
                  </div>
                  <div className="text-xs text-red-600 font-mono">
                    {formatWarning.mappedRemoved.join(', ')}
                  </div>
                </div>
              )}
              {formatWarning.diff.added.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="font-medium text-blue-700 mb-1">
                    Nuove colonne nel file ({formatWarning.diff.added.length}):
                  </div>
                  <div className="text-xs text-blue-600 font-mono">
                    {formatWarning.diff.added.join(', ')}
                  </div>
                </div>
              )}
              <p className="text-gray-600">
                Vuoi aggiornare la mappatura o procedere con quella corrente?
                Procedere ignorerà le colonne mancanti — i campi mappati su di esse resteranno vuoti.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFormatWarning(null)}>
              Annulla upload
            </Button>
            <Button variant="outline" onClick={handleProceedDespiteFormatChange}>
              Procedi così com&apos;è
            </Button>
            <Button onClick={handleUpdateMappingFromWarning}>
              Aggiorna mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function buildIndividuazioneName(programmazioneName: string): string {
  return `Individuazione - ${programmazioneName}`
}
