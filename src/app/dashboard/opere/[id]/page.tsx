'use client'

import { useCallback, useEffect, useState, ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Database } from '@/shared/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { getOperaById, getPartecipazioniByOperaId, getEpisodiByOperaId, upsertEpisodi, updatePartecipazione, deletePartecipazione, deletePartecipazioniMultiple, getRuoliTipologie, updateEpisodio } from '@/features/opere/services/opere.service'
import { getTitleById, mapImdbToOpera, searchTitles, getTitleCredits, getEpisodesByTitleId, ImdbTitleDetails, ImdbEpisode, ImdbEpisodesResponse } from '@/features/opere/services/external/imdb.service'
import { ArrowLeft, Film, Tv, FileText, Hash, Calendar, User, BadgeInfo, PlayCircle, Search, Plus, Loader2, Download, Check, X, ArrowRight, ListVideo, ChevronDown, ChevronRight, Clapperboard, PenTool, Star, Users, Video, Music, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { Checkbox as CheckboxUI } from '@/shared/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Textarea } from '@/shared/components/ui/textarea'
import { DialogFooter } from '@/shared/components/ui/dialog'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Label } from '@/shared/components/ui/label'

type Opera = Database['public']['Tables']['opere']['Row']

export default function OperaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const operaId = params.id as string

  const [opera, setOpera] = useState<Opera | null>(null)
  const [partecipazioni, setPartecipazioni] = useState<any[]>([])
  const [episodi, setEpisodi] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  
  // IMDb Integration State
  const [showImdbSearch, setShowImdbSearch] = useState(false)
  const [imdbSearchResults, setImdbSearchResults] = useState<any[]>([])
  const [isSearchingImdb, setIsSearchingImdb] = useState(false)
  const [imdbSearchError, setImdbSearchError] = useState<string | null>(null)
  const [imdbCredits, setImdbCredits] = useState<any[]>([])
  const [imdbCreditsGrouped, setImdbCreditsGrouped] = useState<any>(null)
  const [loadingImdbCredits, setLoadingImdbCredits] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [pendingImdbTconst, setPendingImdbTconst] = useState<string | null>(null) // IMDb ID selezionato ma non ancora salvato
  
  // IMDb Import Dialog State
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [imdbDataToImport, setImdbDataToImport] = useState<ImdbTitleDetails | null>(null)
  const [loadingImdbData, setLoadingImdbData] = useState(false)
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({})
  const [isSavingImport, setIsSavingImport] = useState(false)
  
  // IMDb Episodes Import State
  const [imdbEpisodesData, setImdbEpisodesData] = useState<ImdbEpisodesResponse | null>(null)
  const [loadingImdbEpisodes, setLoadingImdbEpisodes] = useState(false)
  const [selectedSeasons, setSelectedSeasons] = useState<Record<number, boolean>>({})
  const [expandedSeasons, setExpandedSeasons] = useState<Record<number, boolean>>({})
  const [importEpisodesResult, setImportEpisodesResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null)

  // Partecipazioni Edit/Delete State
  const [ruoli, setRuoli] = useState<{ id: string; nome: string; descrizione: string | null; categoria: string | null }[]>([])
  const [showEditPartecipazioneDialog, setShowEditPartecipazioneDialog] = useState(false)
  const [showDeletePartecipazioneDialog, setShowDeletePartecipazioneDialog] = useState(false)
  const [selectedPartecipazione, setSelectedPartecipazione] = useState<any>(null)
  const [editPartecipazioneForm, setEditPartecipazioneForm] = useState({
    ruolo_id: '',
    personaggio: '',
    note: '',
    stato_validazione: ''
  })
  const [isSavingPartecipazione, setIsSavingPartecipazione] = useState(false)
  const [isDeletingPartecipazione, setIsDeletingPartecipazione] = useState(false)
  
  // Multi-select state for partecipazioni
  const [selectedPartecipazioniIds, setSelectedPartecipazioniIds] = useState<Set<string>>(new Set())
  const [showBulkDeletePartecipazioniDialog, setShowBulkDeletePartecipazioniDialog] = useState(false)
  const [isBulkDeletingPartecipazioni, setIsBulkDeletingPartecipazioni] = useState(false)

  // Episodi Edit State
  const [showEditEpisodioDialog, setShowEditEpisodioDialog] = useState(false)
  const [selectedEpisodio, setSelectedEpisodio] = useState<any>(null)
  const [editEpisodioForm, setEditEpisodioForm] = useState({
    titolo_episodio: '',
    descrizione: '',
    durata_minuti: '',
    data_prima_messa_in_onda: '',
    imdb_tconst: '',
    codice_isan: ''
  })
  const [isSavingEpisodio, setIsSavingEpisodio] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: oData, error: oErr } = await getOperaById(operaId)
      if (oErr) {
        if (oErr.code === 'PGRST116') {
          setError('Opera non trovata')
          return
        }
        throw oErr
      }
      setOpera(oData || null)

      const { data: pData, error: pErr } = await getPartecipazioniByOperaId(operaId)
      if (pErr) throw pErr
      
      // Ordina partecipazioni: per serie TV ordina per stagione/episodio, altrimenti per nome artista
      const sortedPartecipazioni = [...(pData || [])].sort((a: any, b: any) => {
        // Se è una serie TV e ci sono episodi, ordina per stagione e episodio
        if ((oData?.tipo || '').toLowerCase() === 'serie_tv') {
          const stagA = a.episodi?.numero_stagione ?? 9999
          const stagB = b.episodi?.numero_stagione ?? 9999
          if (stagA !== stagB) return stagA - stagB
          
          const epA = a.episodi?.numero_episodio ?? 9999
          const epB = b.episodi?.numero_episodio ?? 9999
          if (epA !== epB) return epA - epB
        }
        
        // Poi ordina per nome artista
        const nomeA = `${a.artisti?.cognome || ''} ${a.artisti?.nome || ''}`.toLowerCase()
        const nomeB = `${b.artisti?.cognome || ''} ${b.artisti?.nome || ''}`.toLowerCase()
        return nomeA.localeCompare(nomeB)
      })
      setPartecipazioni(sortedPartecipazioni)

      if ((oData?.tipo || '').toLowerCase() === 'serie_tv') {
        const { data: eData, error: eErr } = await getEpisodiByOperaId(operaId)
        if (eErr) throw eErr
        setEpisodi(eData || [])
      } else {
        setEpisodi([])
      }
    } catch (e) {
      setError('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }, [operaId])

  useEffect(() => {
    if (operaId) fetchData()
    // Load ruoli
    getRuoliTipologie().then(({ data }) => {
      if (data) setRuoli(data)
    })
  }, [operaId, fetchData])

  // Partecipazione handlers
  const openEditPartecipazioneDialog = (p: any) => {
    setSelectedPartecipazione(p)
    setEditPartecipazioneForm({
      ruolo_id: p.ruolo_id || p.ruoli_tipologie?.id || '',
      personaggio: p.personaggio || '',
      note: p.note || '',
      stato_validazione: p.stato_validazione || 'da_validare'
    })
    setShowEditPartecipazioneDialog(true)
  }

  const openDeletePartecipazioneDialog = (p: any) => {
    setSelectedPartecipazione(p)
    setShowDeletePartecipazioneDialog(true)
  }

  const handleSavePartecipazione = async () => {
    if (!selectedPartecipazione) return
    
    setIsSavingPartecipazione(true)
    try {
      const { error } = await updatePartecipazione(selectedPartecipazione.id, {
        ruolo_id: editPartecipazioneForm.ruolo_id,
        personaggio: editPartecipazioneForm.personaggio || null,
        note: editPartecipazioneForm.note || null,
        stato_validazione: editPartecipazioneForm.stato_validazione
      })
      
      if (error) {
        throw new Error(error.message || 'Errore durante l\'aggiornamento')
      }
      
      setShowEditPartecipazioneDialog(false)
      fetchData()
    } catch (e: any) {
      alert('Errore durante l\'aggiornamento: ' + (e?.message || 'Errore sconosciuto'))
    } finally {
      setIsSavingPartecipazione(false)
    }
  }

  const handleDeletePartecipazione = async () => {
    if (!selectedPartecipazione) return
    
    setIsDeletingPartecipazione(true)
    try {
      const { error } = await deletePartecipazione(selectedPartecipazione.id)
      
      if (error) throw error
      
      setShowDeletePartecipazioneDialog(false)
      fetchData()
    } catch (e) {
      console.error('Error deleting partecipazione:', e)
    } finally {
      setIsDeletingPartecipazione(false)
    }
  }

  // Multi-select handlers for partecipazioni
  const toggleSelectPartecipazione = (id: string) => {
    setSelectedPartecipazioniIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelectAllPartecipazioni = () => {
    if (selectedPartecipazioniIds.size === partecipazioni.length) {
      setSelectedPartecipazioniIds(new Set())
    } else {
      setSelectedPartecipazioniIds(new Set(partecipazioni.map((p: any) => p.id)))
    }
  }

  const clearPartecipazioniSelection = () => {
    setSelectedPartecipazioniIds(new Set())
  }

  const handleBulkDeletePartecipazioni = async () => {
    if (selectedPartecipazioniIds.size === 0) return
    
    setIsBulkDeletingPartecipazioni(true)
    try {
      const { error } = await deletePartecipazioniMultiple(Array.from(selectedPartecipazioniIds))
      
      if (error) throw error
      
      setShowBulkDeletePartecipazioniDialog(false)
      setSelectedPartecipazioniIds(new Set())
      fetchData()
    } catch (e: any) {
      alert('Errore durante l\'eliminazione: ' + (e?.message || 'Errore sconosciuto'))
    } finally {
      setIsBulkDeletingPartecipazioni(false)
    }
  }

  // Episodio handlers
  const openEditEpisodioDialog = (e: any) => {
    setSelectedEpisodio(e)
    setEditEpisodioForm({
      titolo_episodio: e.titolo_episodio || '',
      descrizione: e.descrizione || '',
      durata_minuti: e.durata_minuti ? String(e.durata_minuti) : '',
      data_prima_messa_in_onda: e.data_prima_messa_in_onda || '',
      imdb_tconst: e.imdb_tconst || '',
      codice_isan: e.codice_isan || ''
    })
    setShowEditEpisodioDialog(true)
  }

  const handleSaveEpisodio = async () => {
    if (!selectedEpisodio) return
    
    setIsSavingEpisodio(true)
    try {
      const updates: any = {
        titolo_episodio: editEpisodioForm.titolo_episodio || null,
        descrizione: editEpisodioForm.descrizione || null,
        durata_minuti: editEpisodioForm.durata_minuti ? parseInt(editEpisodioForm.durata_minuti) : null,
        data_prima_messa_in_onda: editEpisodioForm.data_prima_messa_in_onda || null,
        imdb_tconst: editEpisodioForm.imdb_tconst || null,
        codice_isan: editEpisodioForm.codice_isan || null
      }
      
      const { error } = await updateEpisodio(selectedEpisodio.id, updates)
      
      if (error) {
        throw new Error(error.message || 'Errore durante l\'aggiornamento')
      }
      
      setShowEditEpisodioDialog(false)
      fetchData()
    } catch (e: any) {
      alert('Errore durante l\'aggiornamento: ' + (e?.message || 'Errore sconosciuto'))
    } finally {
      setIsSavingEpisodio(false)
    }
  }

  const performSearch = async (term: string, year?: number, type?: string) => {
    if (!term || !term.trim()) {
      setImdbSearchResults([])
      setImdbSearchError(null)
      return
    }
    
    setIsSearchingImdb(true)
    setImdbSearchResults([]) // Clear previous results
    setImdbSearchError(null) // Clear previous errors
    
    try {
      // Search by title, year and type to get more accurate results (with directors)
      let { ok, results } = await searchTitles(term.trim(), year, type, true)

      // Intelligent fallback: if no results and we had strict filters, relax them
      if (ok && results.length === 0 && year) {
        // Retry without year
        const retry = await searchTitles(term.trim(), undefined, type, true)
        if (retry.ok && retry.results.length > 0) {
          results = retry.results
          ok = retry.ok
        }
      }
      
      // If still no results and we had a type, try without type (broadest search)
      if (ok && results.length === 0 && type) {
        const retry = await searchTitles(term.trim(), undefined, undefined, true)
        if (retry.ok && retry.results.length > 0) {
          results = retry.results
          ok = retry.ok
        }
      }

      if (ok) {
        setImdbSearchResults(results || [])
        if ((results || []).length === 0) {
          setImdbSearchError('Nessun risultato trovato. Prova con un termine di ricerca diverso.')
        }
      } else {
        setImdbSearchError('Errore durante la ricerca. Riprova più tardi.')
        setImdbSearchResults([])
      }
    } catch (e) {
      console.error('Error performing IMDb search:', e)
      setImdbSearchError('Errore durante la ricerca. Verifica la connessione e riprova.')
      setImdbSearchResults([])
    } finally {
      setIsSearchingImdb(false)
    }
  }

  const handleSearchImdb = async () => {
    if (!opera) return
    setShowImdbSearch(true)
    setImdbSearchError(null)
    setImdbSearchResults([])

    // 1. Try to find by IMDb ID if available
    if (opera.imdb_tconst) {
      setSearchTerm(opera.imdb_tconst)
      setIsSearchingImdb(true)
      try {
        const { ok, result } = await getTitleById(opera.imdb_tconst)
        if (ok && result) {
          // Extract directors names
          let directorsStr: string | null = null
          if (result.directors) {
            if (Array.isArray(result.directors)) {
              directorsStr = result.directors
                .slice(0, 2)
                .map((d: any) => typeof d === 'string' ? d : d?.displayName || d?.name || d?.primaryName || '')
                .filter(Boolean)
                .join(', ')
            } else if (typeof result.directors === 'string') {
              directorsStr = result.directors
            }
          }
          
          setImdbSearchResults([{
            title: result.title,
            year: result.year,
            type: result.type,
            id: result.id,
            directors: directorsStr
          }])
          setIsSearchingImdb(false)
          return
        }
      } catch (e) {
        console.error('Failed to fetch by ID, falling back to search', e)
        setImdbSearchError('Impossibile caricare i dettagli IMDb. Passo alla ricerca per titolo.')
      }
    }

    // 2. Fallback to search by title/year/type
    const searchTitle = opera.titolo || ''
    setSearchTerm(searchTitle)
    if (searchTitle.trim()) {
      performSearch(searchTitle, opera.anno_produzione ?? undefined, opera.tipo)
    }
  }

  const handleSelectImdbTitle = async (imdbId: string) => {
    try {
      setLoadingImdbCredits(true)
      // Fetch credits
      const { ok, result } = await getTitleCredits(imdbId)
      if (ok && result) {
        setImdbCredits(result.cast || [])
        setImdbCreditsGrouped(result.grouped || null)
      }
      
      // Store the selected IMDb ID temporarily (not saved to DB yet)
      // This will be saved when user confirms in the import dialog
      setPendingImdbTconst(imdbId)
      
      setShowImdbSearch(false)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingImdbCredits(false)
    }
  }

  // Open import dialog and fetch full IMDb data
  const handleOpenImportDialog = async () => {
    // Use pending (newly selected) or existing imdb_tconst
    const imdbId = pendingImdbTconst || opera?.imdb_tconst
    if (!imdbId) {
      alert('L\'opera deve avere un IMDb tconst prima di poter importare dati da IMDb. Cerca e seleziona prima il titolo corretto su IMDb.')
      return
    }
    
    setLoadingImdbData(true)
    setShowImportDialog(true)
    setImdbEpisodesData(null)
    setSelectedSeasons({})
    setExpandedSeasons({})
    setImportEpisodesResult(null)
    
    try {
      const { ok, result } = await getTitleById(imdbId)
      if (ok && result) {
        setImdbDataToImport(result)
        // Pre-select fields that are missing in DB
        const preSelected: Record<string, boolean> = {}
        if (!opera?.titolo_originale && result.originalTitle) preSelected['titolo_originale'] = true
        if (!opera?.anno_produzione && result.year) preSelected['anno_produzione'] = true
        // Pre-select imdb_tconst if not already in DB (check actual DB value, not pending)
        if (!opera?.imdb_tconst && result.id) preSelected['imdb_tconst'] = true
        // Pre-select regista if missing in DB
        const currentRegista = (opera as any)?.regista
        if ((!currentRegista || currentRegista.length === 0) && result.directorsFormatted) {
          preSelected['regista'] = true
        }
        setSelectedFields(preSelected)
        
        // If it's a TV series, fetch episodes
        if (result.type === 'tvSeries' || result.type === 'tvMiniSeries' || opera?.tipo === 'serie_tv') {
          setLoadingImdbEpisodes(true)
          try {
            const episodesRes = await getEpisodesByTitleId(imdbId)
            if (episodesRes.ok && episodesRes.data) {
              setImdbEpisodesData(episodesRes.data)
            }
          } catch (e) {
            console.error('Error fetching episodes:', e)
          } finally {
            setLoadingImdbEpisodes(false)
          }
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingImdbData(false)
    }
  }

  // Import selected episodes
  const handleImportEpisodes = async () => {
    if (!opera || !imdbEpisodesData) return
    
    // Verifica che l'opera abbia imdb_tconst prima di permettere l'importazione
    const imdbId = pendingImdbTconst || opera?.imdb_tconst
    if (!imdbId) {
      alert('L\'opera deve avere un IMDb tconst prima di poter importare gli episodi.')
      return
    }
    
    const selectedSeasonsArray = Object.entries(selectedSeasons)
      .filter(([_, selected]) => selected)
      .map(([season]) => parseInt(season))
    
    if (selectedSeasonsArray.length === 0) return
    
    setIsSavingImport(true)
    try {
      // Filter episodes from selected seasons
      const episodesToImport = imdbEpisodesData.episodes
        .filter(ep => selectedSeasonsArray.includes(ep.season))
        .map(ep => ({
          numero_stagione: ep.season,
          numero_episodio: ep.episodeNumber,
          titolo_episodio: ep.title || null,
          descrizione: ep.plot || null,
          durata_minuti: ep.runtimeMinutes,
          data_prima_messa_in_onda: ep.releaseDate 
            ? `${ep.releaseDate.year}-${String(ep.releaseDate.month || 1).padStart(2, '0')}-${String(ep.releaseDate.day || 1).padStart(2, '0')}`
            : null,
          imdb_tconst: ep.id || null, // Salva imdb_tconst nel campo dedicato
          metadati: { imdb_rating: ep.rating }, // Mantieni altri metadati come rating
        }))
      
      const result = await upsertEpisodi(opera.id, episodesToImport)
      setImportEpisodesResult(result)
      
      // Refresh episodes list
      const { data: newEpisodi } = await getEpisodiByOperaId(opera.id)
      if (newEpisodi) setEpisodi(newEpisodi)
      
    } catch (e) {
      console.error(e)
    } finally {
      setIsSavingImport(false)
    }
  }

  // Save selected fields to database
  const handleSaveImport = async () => {
    if (!opera || !imdbDataToImport) return
    
    setIsSavingImport(true)
    try {
      const updates: any = {}
      
      if (selectedFields['titolo_originale']) {
        // IMDb title (English) goes to titolo_originale
        updates.titolo_originale = imdbDataToImport.title || null
      }
      if (selectedFields['anno_produzione']) {
        updates.anno_produzione = imdbDataToImport.year
      }
      if (selectedFields['imdb_tconst']) {
        updates.imdb_tconst = imdbDataToImport.id
        updates.codici_esterni = { ...(opera.codici_esterni as any || {}), imdb: imdbDataToImport.id }
      }
      if (selectedFields['regista']) {
        // regista is an array in DB, convert directors string to array
        const directors = imdbDataToImport.directorsFormatted
        updates.regista = directors ? directors.split(', ').map((d: string) => d.trim()) : null
      }
      if (selectedFields['tipo']) {
        // Update tipo to serie_tv when user confirms the type change
        updates.tipo = 'serie_tv'
      }
      
      if (Object.keys(updates).length > 0) {
        const { error: err } = await import('@/features/opere/services/opere.service').then(m => m.updateOpera(opera.id, updates))
        if (!err) {
          setOpera({ ...opera, ...updates })
          // Clear pending imdb_tconst after successful save
          setPendingImdbTconst(null)
        }
      }
      
      // Also import episodes if any selected
      if (imdbEpisodesData && Object.values(selectedSeasons).some(Boolean)) {
        await handleImportEpisodes()
      }
      
      if (Object.keys(updates).length > 0 || !Object.values(selectedSeasons).some(Boolean)) {
        setShowImportDialog(false)
        setImdbDataToImport(null)
        setSelectedFields({})
        setImdbEpisodesData(null)
        setSelectedSeasons({})
        setPendingImdbTconst(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSavingImport(false)
    }
  }

  // Helper to compare values
  const getComparisonStatus = (dbValue: any, imdbValue: any): 'missing' | 'different' | 'same' | 'empty' => {
    if (!imdbValue) return 'empty'
    if (!dbValue) return 'missing'
    const dbStr = String(dbValue).toUpperCase().trim()
    const imdbStr = String(imdbValue).toUpperCase().trim()
    return dbStr === imdbStr ? 'same' : 'different'
  }

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'film':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Film className="mr-1 h-3 w-3" />Film</Badge>
      case 'serie_tv':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><Tv className="mr-1 h-3 w-3" />Serie TV</Badge>
      case 'documentario':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><FileText className="mr-1 h-3 w-3" />Documentario</Badge>
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">{tipo}</Badge>
    }
  }

  const schema = z.object({
    codice_opera: z.string().min(1, 'Codice opera obbligatorio'),
    titolo: z.string().min(1, 'Titolo obbligatorio'),
    tipo: z.enum(['film', 'serie_tv', 'documentario', 'cartoon', 'altro'], { required_error: 'Tipo obbligatorio' }),
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
      codice_opera: opera?.codice_opera || '',
      titolo: opera?.titolo || '',
      tipo: (opera?.tipo as any) || undefined,
      titolo_originale: opera?.titolo_originale || '',
      anno_produzione: opera?.anno_produzione ?? undefined,
      imdb_tconst: opera?.imdb_tconst || '',
    },
  })

  useEffect(() => {
    if (opera && showEditForm) {
      form.reset({
        codice_opera: opera.codice_opera || undefined,
        titolo: opera.titolo,
        tipo: opera.tipo as any,
        titolo_originale: opera.titolo_originale || '',
        anno_produzione: opera.anno_produzione ?? undefined,
        imdb_tconst: opera.imdb_tconst || '',
      })
    }
  }, [opera, showEditForm])

  // Post-hook conditional renders
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">Caricamento...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg text-red-600 mb-4">{error}</div>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna Indietro
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!opera) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">Opera non trovata</div>
      </div>
    )
  }


  const onSubmit = async (values: z.infer<typeof schema>) => {
    const payload = {
      codice_opera: values.codice_opera,
      titolo: values.titolo,
      tipo: values.tipo,
      titolo_originale: values.titolo_originale || null,
      anno_produzione: values.anno_produzione ?? null,
      imdb_tconst: values.imdb_tconst || null,
      codici_esterni: values.imdb_tconst ? { imdb: values.imdb_tconst } : undefined,
    } as any
    const { error: err } = await import('@/features/opere/services/opere.service').then(m => m.updateOpera(opera.id, payload))
    if (!err) {
      setOpera({ ...opera, ...payload })
      setShowEditForm(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.back()} variant="outline" size="sm" className="w-fit">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna Indietro
          </Button>
          <div>
            <h1 className="text-xl lg:text-3xl font-bold">{opera.titolo}</h1>
            {opera.titolo_originale && (
              <p className="text-lg text-muted-foreground">{opera.titolo_originale}</p>
            )}
          </div>
        </div>
        {getTipoBadge(opera.tipo)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><BadgeInfo className="mr-2 h-5 w-5" />Informazioni Opera</CardTitle>
        </CardHeader>
        <CardContent className="p-4 lg:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground"><Hash className="mr-2 h-4 w-4" />Codice Opera</div>
              <div className="font-medium break-all">{opera.codice_opera}</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground"><Calendar className="mr-2 h-4 w-4" />Anno Produzione</div>
              <div className="font-medium">{opera.anno_produzione ?? '-'}</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground"><FileText className="mr-2 h-4 w-4" />IMDb tconst</div>
              <div className="font-medium">{opera.imdb_tconst || '-'}</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground"><Clapperboard className="mr-2 h-4 w-4" />Regia</div>
              <div className="font-medium">
                {(opera as any).regista
                  ? (Array.isArray((opera as any).regista) 
                      ? (opera as any).regista.join(', ') 
                      : (opera as any).regista)
                  : '-'}
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={handleSearchImdb}>
              <Search className="mr-2 h-4 w-4" />
              Ricerca su IMDb
            </Button>
            <Button onClick={() => setShowEditForm(true)}>Modifica</Button>
          </div>
        </CardContent>
      </Card>

      {/* Credits IMDb Section */}
      {imdbCredits.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5" />Credits IMDb</CardTitle>
              {(opera?.imdb_tconst || pendingImdbTconst) && (
                <a 
                  href={`https://www.imdb.com/title/${opera?.imdb_tconst || pendingImdbTconst}/fullcredits`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  Vedi tutti i credits su IMDb →
                </a>
              )}
            </div>
            <div className="flex gap-2">
              {(opera?.imdb_tconst || pendingImdbTconst) && (
                <Button variant="secondary" size="sm" onClick={handleOpenImportDialog} disabled={loadingImdbData}>
                  {loadingImdbData ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Importa da IMDb
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowExportDialog(true)}
              >
                <Download className="h-4 w-4 mr-2" />
                Esporta Cast
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-0">
            {/* Regia */}
            {imdbCreditsGrouped?.direction?.length > 0 && (
              <CreditsSection 
                title="Regia" 
                icon={<Clapperboard className="h-4 w-4" />}
                credits={imdbCreditsGrouped.direction}
                showCharacter={false}
                showNconst={true}
              />
            )}
            
            {/* Sceneggiatura */}
            {imdbCreditsGrouped?.writing?.length > 0 && (
              <CreditsSection 
                title="Sceneggiatura" 
                icon={<PenTool className="h-4 w-4" />}
                credits={imdbCreditsGrouped.writing}
                showCharacter={false}
                showNconst={true}
              />
            )}
            
            {/* Cast Principale */}
            {imdbCreditsGrouped?.castPrimary?.length > 0 && (
              <CreditsSection 
                title="Cast Principale" 
                icon={<Star className="h-4 w-4 text-amber-500" />}
                credits={imdbCreditsGrouped.castPrimary}
                showCharacter={true}
                showStar={true}
                showNconst={true}
              />
            )}
            
            {/* Altri Attori */}
            {imdbCreditsGrouped?.castSecondary?.length > 0 && (
              <CreditsSection 
                title="Altri Attori" 
                icon={<Users className="h-4 w-4" />}
                credits={imdbCreditsGrouped.castSecondary}
                showCharacter={true}
                showNconst={true}
                collapsible={imdbCreditsGrouped.castSecondary.length > 10}
              />
            )}
            
            {/* Produzione */}
            {imdbCreditsGrouped?.production?.length > 0 && (
              <CreditsSection 
                title="Produzione" 
                icon={<Video className="h-4 w-4" />}
                credits={imdbCreditsGrouped.production}
                showCharacter={false}
                showNconst={true}
                collapsible={true}
              />
            )}
            
            {/* Musica */}
            {imdbCreditsGrouped?.music?.length > 0 && (
              <CreditsSection 
                title="Musica" 
                icon={<Music className="h-4 w-4" />}
                credits={imdbCreditsGrouped.music}
                showCharacter={false}
                showNconst={true}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Partecipazioni Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Partecipazioni
            </div>
            <Badge variant="secondary">
              {(partecipazioni || []).length} {(partecipazioni || []).length === 1 ? 'artista' : 'artisti'}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        {/* Barra azioni selezione multipla */}
        {selectedPartecipazioniIds.size > 0 && (
          <div className="px-4 py-3 bg-primary/5 border-b flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckboxUI 
                checked={selectedPartecipazioniIds.size === partecipazioni.length}
                onCheckedChange={toggleSelectAllPartecipazioni}
              />
              <span className="text-sm font-medium">
                {selectedPartecipazioniIds.size} {selectedPartecipazioniIds.size === 1 ? 'selezionata' : 'selezionate'}
              </span>
              <Button variant="ghost" size="sm" onClick={clearPartecipazioniSelection}>
                <X className="h-4 w-4 mr-1" />
                Deseleziona
              </Button>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowBulkDeletePartecipazioniDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina selezionate
            </Button>
          </div>
        )}
        
        <CardContent className="p-0">
          {(partecipazioni || []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nessuna partecipazione trovata per quest&apos;opera</p>
            </div>
          ) : (
            <div className="divide-y">
              {partecipazioni.map((p: any) => {
                const getValidationBadge = (stato: string | null) => {
                  if (!stato) return <Badge variant="outline">Non specificato</Badge>
                  switch (stato) {
                    case 'validato':
                      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Validato</Badge>
                    case 'da_validare':
                      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Da Validare</Badge>
                    case 'respinto':
                      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Respinto</Badge>
                    default:
                      return <Badge variant="outline">Sconosciuto</Badge>
                  }
                }
                
                const isSelected = selectedPartecipazioniIds.has(p.id)
                
                return (
                  <div key={p.id} className={`px-4 py-3 hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                    <div className="flex gap-3 items-start">
                      {/* Checkbox selezione */}
                      <div className="flex items-center shrink-0 pt-0.5">
                        <CheckboxUI 
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectPartecipazione(p.id)}
                        />
                      </div>
                      
                      {/* Contenuto principale */}
                      <div className="flex-1 min-w-0">
                        {/* Riga 1: Nome artista, Badges, Azioni */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                            <Link 
                              href={`/dashboard/artisti/${p.artisti?.id}`}
                              className="font-semibold hover:text-primary transition-colors"
                            >
                              {p.artisti ? `${p.artisti.nome} ${p.artisti.cognome}` : '—'}
                            </Link>
                            <Badge className="bg-primary/10 text-primary border-0 hover:bg-primary/10 text-xs">
                              {p.ruoli_tipologie?.nome || 'Ruolo'}
                            </Badge>
                            {getValidationBadge(p.stato_validazione)}
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditPartecipazioneDialog(p)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifica
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => openDeletePartecipazioneDialog(p)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Elimina
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {/* Riga 2: Nome d'arte / Episodio / Personaggio */}
                        {(p.artisti?.nome_arte || p.episodi || p.personaggio) && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground mt-1">
                            {p.artisti?.nome_arte && (
                              <span>{p.artisti.nome_arte}</span>
                            )}
                            {p.episodi && (
                              <span className="flex items-center gap-1">
                                <Tv className="h-3 w-3" />
                                S{p.episodi.numero_stagione || '?'}E{p.episodi.numero_episodio || '?'}
                                {p.episodi.titolo_episodio && ` – ${p.episodi.titolo_episodio}`}
                              </span>
                            )}
                            {p.personaggio && (
                              <span>
                                Personaggio: &quot;{p.personaggio}&quot;
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Note (se presenti) */}
                        {p.note && (
                          <div className="mt-1.5 text-sm text-muted-foreground bg-muted/50 rounded px-2 py-1">
                            {p.note}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Esporta Cast</DialogTitle>
            <DialogDescription>
              Scegli il formato di esportazione per il cast di "{opera?.titolo}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => {
                const castCredits = imdbCredits.filter((c: any) => c.categoryGroup === 'cast')
                const csvContent = [
                  ['Nome', 'Ruolo', 'Personaggio'].join(';'),
                  ...castCredits.map((c: any) => [
                    c.name,
                    c.castRole || '',
                    c.character || ''
                  ].join(';'))
                ].join('\n')
                
                const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `cast_${opera?.titolo?.replace(/\s+/g, '_') || 'export'}.csv`
                a.click()
                window.URL.revokeObjectURL(url)
                setShowExportDialog(false)
              }}
            >
              <FileText className="h-8 w-8" />
              <span>CSV</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={async () => {
                const castCredits = imdbCredits.filter((c: any) => c.categoryGroup === 'cast')
                
                // Dynamic import xlsx
                const XLSX = await import('xlsx')
                
                const data = castCredits.map((c: any) => ({
                  'Nome': c.name,
                  'Ruolo': c.castRole || '',
                  'Personaggio': c.character || ''
                }))
                
                const ws = XLSX.utils.json_to_sheet(data)
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, 'Cast')
                
                // Set column widths
                ws['!cols'] = [
                  { wch: 30 }, // Nome
                  { wch: 15 }, // Ruolo
                  { wch: 30 }, // Personaggio
                ]
                
                XLSX.writeFile(wb, `cast_${opera?.titolo?.replace(/\s+/g, '_') || 'export'}.xlsx`)
                setShowExportDialog(false)
              }}
            >
              <FileText className="h-8 w-8" />
              <span>Excel</span>
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Il file conterrà {imdbCredits.filter((c: any) => c.categoryGroup === 'cast').length} attori con le colonne: Nome, Ruolo (Primario/Comprimario), Personaggio
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showImdbSearch} onOpenChange={setShowImdbSearch}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Risultati ricerca IMDb</DialogTitle>
            <DialogDescription>Seleziona il titolo corretto per visualizzare i credits</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input 
              value={searchTerm} 
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setImdbSearchError(null) // Clear error when typing
              }}
              placeholder="Cerca titolo IMDb..." 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSearchingImdb) {
                  performSearch(searchTerm)
                }
              }}
              disabled={isSearchingImdb}
            />
            <Button 
              onClick={() => performSearch(searchTerm)} 
              disabled={isSearchingImdb || !searchTerm.trim()}
            >
              {isSearchingImdb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {isSearchingImdb ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Ricerca in corso...</p>
              </div>
            ) : imdbSearchError ? (
              <div className="text-center py-8">
                <p className="text-sm text-destructive mb-2">{imdbSearchError}</p>
                <Button variant="outline" size="sm" onClick={() => performSearch(searchTerm)}>
                  Riprova
                </Button>
              </div>
            ) : imdbSearchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'Nessun risultato trovato' : 'Inserisci un termine di ricerca e premi Invio o clicca Cerca'}
              </div>
            ) : (
              <div className="space-y-2">
                {imdbSearchResults.map((result) => (
                  <div 
                    key={result.id} 
                    className="flex items-center justify-between gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{result.title}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span>{result.year || '—'}</span>
                        <span className="capitalize">{result.type || '—'}</span>
                        {result.directors && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="truncate">Regia: {result.directors}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleSelectImdbTitle(result.id)} className="shrink-0">
                      Seleziona
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {(opera.tipo || '').toLowerCase() === 'serie_tv' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><PlayCircle className="mr-2 h-5 w-5" />Episodi</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-3 px-4 pl-6">Stagione</TableHead>
                    <TableHead className="py-3 px-4">Episodio</TableHead>
                    <TableHead className="py-3 px-4">Titolo</TableHead>
                    <TableHead className="py-3 px-4">Data</TableHead>
                    <TableHead className="py-3 px-4">Durata</TableHead>
                    <TableHead className="py-3 px-4">IMDb tconst</TableHead>
                    <TableHead className="py-3 px-4">Codice ISAN</TableHead>
                    <TableHead className="py-3 px-4 pr-6 w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(episodi || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nessun episodio associato</TableCell>
                    </TableRow>
                  ) : (
                    episodi.map((e: any) => (
                      <TableRow key={e.id} className="hover:bg-muted/50">
                        <TableCell className="py-4 px-4 pl-6">{e.numero_stagione}</TableCell>
                        <TableCell className="py-4 px-4">{e.numero_episodio}</TableCell>
                        <TableCell className="py-4 px-4">{e.titolo_episodio || '—'}</TableCell>
                        <TableCell className="py-4 px-4">{e.data_prima_messa_in_onda ? new Date(e.data_prima_messa_in_onda).toLocaleDateString('it-IT') : '—'}</TableCell>
                        <TableCell className="py-4 px-4">{e.durata_minuti ? `${e.durata_minuti} min` : '—'}</TableCell>
                        <TableCell className="py-4 px-4 font-mono text-sm">
                          {e.imdb_tconst ? (
                            <a 
                              href={`https://www.imdb.com/title/${e.imdb_tconst}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {e.imdb_tconst}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-4 font-mono text-sm">
                          {e.codice_isan || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="py-4 px-4 pr-6">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditEpisodioDialog(e)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="lg:hidden p-4 space-y-3">
              {(episodi || []).length === 0 ? (
                <div className="text-center py-8 text-gray-500">Nessun episodio associato</div>
              ) : (
                episodi.map((e: any) => (
                  <Card key={e.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">S{e.numero_stagione} E{e.numero_episodio}</div>
                          <div className="text-sm">{e.titolo_episodio || '—'}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => openEditEpisodioDialog(e)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {e.data_prima_messa_in_onda ? new Date(e.data_prima_messa_in_onda).toLocaleDateString('it-IT') : '—'}
                        {e.durata_minuti && ` • ${e.durata_minuti} min`}
                      </div>
                      {(e.imdb_tconst || e.codice_isan) && (
                        <div className="text-xs space-y-1">
                          {e.imdb_tconst && (
                            <div>
                              <a 
                                href={`https://www.imdb.com/title/${e.imdb_tconst}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-mono"
                              >
                                IMDb: {e.imdb_tconst}
                              </a>
                            </div>
                          )}
                          {e.codice_isan && (
                            <div className="font-mono text-muted-foreground">
                              ISAN: {e.codice_isan}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Modifica Opera</DialogTitle>
            <DialogDescription>Aggiorna i dati dell’opera</DialogDescription>
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
                      <Input {...field} />
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
              </div>
              <FormField
                control={form.control}
                name="imdb_tconst"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IMDB ID (tt...)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditForm(false)}>Annulla</Button>
                <Button type="submit">Salva</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Import from IMDb Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Importa dati da IMDb
            </DialogTitle>
            <DialogDescription>
              Seleziona i campi che vuoi importare. I valori IMDb verranno convertiti in MAIUSCOLO per coerenza con il database.
            </DialogDescription>
          </DialogHeader>
          
          {loadingImdbData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : imdbDataToImport ? (
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Titolo Originale - confronta IMDb title con DB titolo_originale (case insensitive) */}
              {imdbDataToImport.title && (
                <ImportFieldRow
                  fieldKey="titolo_originale"
                  label="Titolo Originale"
                  dbValue={opera?.titolo_originale}
                  imdbValue={imdbDataToImport.title}
                  selected={selectedFields['titolo_originale'] || false}
                  onToggle={(checked) => setSelectedFields(prev => ({ ...prev, titolo_originale: checked }))}
                  status={getComparisonStatus(opera?.titolo_originale, imdbDataToImport.title)}
                  hint="Il titolo IMDb verrà salvato in Titolo Originale"
                />
              )}
              
              {/* Anno Produzione */}
              {imdbDataToImport.year && (
                <ImportFieldRow
                  fieldKey="anno_produzione"
                  label="Anno Produzione"
                  dbValue={opera?.anno_produzione}
                  imdbValue={imdbDataToImport.year}
                  selected={selectedFields['anno_produzione'] || false}
                  onToggle={(checked) => setSelectedFields(prev => ({ ...prev, anno_produzione: checked }))}
                  status={getComparisonStatus(opera?.anno_produzione, imdbDataToImport.year)}
                />
              )}
              
              {/* IMDb ID - usa il valore reale dal DB, non pendingImdbTconst */}
              {imdbDataToImport.id && (
                <ImportFieldRow
                  fieldKey="imdb_tconst"
                  label="IMDb ID (tconst)"
                  dbValue={opera?.imdb_tconst}
                  imdbValue={imdbDataToImport.id}
                  selected={selectedFields['imdb_tconst'] || false}
                  onToggle={(checked) => setSelectedFields(prev => ({ ...prev, imdb_tconst: checked }))}
                  status={getComparisonStatus(opera?.imdb_tconst, imdbDataToImport.id)}
                />
              )}
              
              {/* Regista - campo è un array nel DB */}
              {imdbDataToImport.directorsFormatted && (
                <ImportFieldRow
                  fieldKey="regista"
                  label="Regista"
                  dbValue={Array.isArray((opera as any)?.regista) ? (opera as any).regista.join(', ') : (opera as any)?.regista}
                  imdbValue={imdbDataToImport.directorsFormatted}
                  selected={selectedFields['regista'] || false}
                  onToggle={(checked) => setSelectedFields(prev => ({ ...prev, regista: checked }))}
                  status={getComparisonStatus(
                    Array.isArray((opera as any)?.regista) ? (opera as any).regista.join(', ') : (opera as any)?.regista,
                    imdbDataToImport.directorsFormatted
                  )}
                />
              )}
              
              {/* Durata */}
              {imdbDataToImport.runtimeMinutes && (
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">Durata:</span>
                    <span>{imdbDataToImport.runtimeMinutes} minuti</span>
                    <Badge variant="outline" className="text-xs">Solo visualizzazione</Badge>
                  </div>
                </div>
              )}
              
              {/* Generi */}
              {imdbDataToImport.genres && imdbDataToImport.genres.length > 0 && (
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">Generi:</span>
                    <span>{imdbDataToImport.genres.join(', ')}</span>
                    <Badge variant="outline" className="text-xs">Solo visualizzazione</Badge>
                  </div>
                </div>
              )}
              
              {/* Tipo Opera - mostra se c'è discrepanza tra DB e IMDb */}
              {(imdbDataToImport.type === 'tvSeries' || imdbDataToImport.type === 'tvMiniSeries') && 
               opera?.tipo !== 'serie_tv' && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="tipo_opera"
                      checked={selectedFields['tipo'] || false}
                      onCheckedChange={(checked) => setSelectedFields(prev => ({ ...prev, tipo: !!checked }))}
                    />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="tipo_opera" className="font-medium text-amber-800 dark:text-amber-200 cursor-pointer">
                        Aggiorna Tipo Opera
                      </Label>
                      <div className="text-sm text-amber-700 dark:text-amber-300">
                        L'opera nel database è registrata come <Badge variant="outline" className="mx-1">{opera?.tipo || 'non specificato'}</Badge> 
                        ma IMDb la identifica come <Badge variant="outline" className="mx-1 bg-amber-100 dark:bg-amber-900">Serie TV</Badge>
                      </div>
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        Seleziona per aggiornare il tipo a "serie_tv" e abilitare la gestione degli episodi
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sezione Episodi (solo per serie TV) */}
              {(imdbDataToImport.type === 'tvSeries' || imdbDataToImport.type === 'tvMiniSeries' || opera?.tipo === 'serie_tv') && (
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListVideo className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">Episodi</h3>
                      {loadingImdbEpisodes && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                    {!opera?.imdb_tconst && !pendingImdbTconst && (
                      <Badge variant="destructive" className="text-xs">
                        Richiede IMDb tconst dell'opera
                      </Badge>
                    )}
                  </div>
                  {!opera?.imdb_tconst && !pendingImdbTconst && (
                    <div className="p-3 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
                      ⚠️ Per importare gli episodi, è necessario che l'opera abbia già un IMDb tconst. Salva prima l'opera con il tconst selezionato.
                    </div>
                  )}
                  
                  {loadingImdbEpisodes ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : imdbEpisodesData ? (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        {imdbEpisodesData.totalEpisodes} episodi in {imdbEpisodesData.seasons.length} stagioni disponibili su IMDb
                      </div>
                      
                      {/* Seleziona/Deseleziona tutti */}
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const allSelected = imdbEpisodesData.seasons.every(s => selectedSeasons[s])
                            const newSelected: Record<number, boolean> = {}
                            imdbEpisodesData.seasons.forEach(s => { newSelected[s] = !allSelected })
                            setSelectedSeasons(newSelected)
                          }}
                        >
                          {imdbEpisodesData.seasons.every(s => selectedSeasons[s]) ? 'Deseleziona tutte' : 'Seleziona tutte'}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {Object.values(selectedSeasons).filter(Boolean).length} stagioni selezionate
                        </span>
                      </div>
                      
                      {/* Lista stagioni */}
                      <div className="space-y-1 max-h-96 overflow-y-auto">
                        {imdbEpisodesData.seasons.length === 0 ? (
                          <div className="text-sm text-muted-foreground p-3 text-center">
                            Nessuna stagione trovata
                          </div>
                        ) : (
                          imdbEpisodesData.seasons.map(season => (
                          <div key={season} className="border rounded-lg">
                            <div 
                              className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedSeasons[season] ? 'bg-primary/5 border-primary/20' : ''}`}
                              onClick={() => setExpandedSeasons(prev => ({ ...prev, [season]: !prev[season] }))}
                            >
                              <Checkbox
                                checked={selectedSeasons[season] || false}
                                onCheckedChange={(checked) => {
                                  setSelectedSeasons(prev => ({ ...prev, [season]: !!checked }))
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 flex items-center gap-2">
                                {expandedSeasons[season] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <span className="font-medium">Stagione {season}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {imdbEpisodesData.bySeason[season]?.length || 0} episodi
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Lista episodi espansa */}
                            {expandedSeasons[season] && imdbEpisodesData.bySeason[season] && (
                              <div className="border-t bg-muted/20 p-2 space-y-1 max-h-40 overflow-y-auto">
                                {imdbEpisodesData.bySeason[season].map(ep => (
                                  <div key={ep.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-background/50">
                                    <span className="text-muted-foreground font-mono w-8">E{ep.episodeNumber}</span>
                                    <span className="flex-1 truncate">{ep.title}</span>
                                    {ep.id && (
                                      <span className="text-xs text-muted-foreground font-mono" title="IMDb tconst">{ep.id}</span>
                                    )}
                                    {ep.runtimeMinutes && (
                                      <span className="text-xs text-muted-foreground">{ep.runtimeMinutes}m</span>
                                    )}
                                    {ep.rating && (
                                      <Badge variant="outline" className="text-xs">⭐ {ep.rating}</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          ))
                        )}
                      </div>
                      
                      {/* Warning se sembra che manchino stagioni */}
                      {imdbEpisodesData.seasons.length > 0 && imdbEpisodesData.seasons.length < 5 && (
                        <div className="p-2 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
                          ⚠️ <strong>Nota:</strong> L'API IMDb potrebbe non restituire tutte le stagioni disponibili. 
                          Se mancano stagioni, prova a ricaricare o verifica direttamente su IMDb.
                        </div>
                      )}
                      
                      {/* Risultato importazione episodi */}
                      {importEpisodesResult && (
                        <div className={`p-3 rounded-lg border ${importEpisodesResult.errors.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                          <div className="text-sm">
                            <span className="font-medium">Risultato:</span>{' '}
                            {importEpisodesResult.created} creati, {importEpisodesResult.updated} aggiornati
                            {importEpisodesResult.errors.length > 0 && (
                              <div className="text-amber-700 mt-1">
                                {importEpisodesResult.errors.length} errori
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Nessun episodio disponibile su IMDb per questa serie
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nessun dato disponibile da IMDb
            </div>
          )}
          
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {Object.values(selectedFields).filter(Boolean).length} campi
              {Object.values(selectedSeasons).filter(Boolean).length > 0 && (
                <>, {Object.values(selectedSeasons).filter(Boolean).length} stagioni</>
              )}
              {' '}selezionati
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setShowImportDialog(false)
                // Non pulire pendingImdbTconst qui, così l'utente può riaprire la dialog
              }}>
                Annulla
              </Button>
              <Button 
                onClick={handleSaveImport} 
                disabled={isSavingImport || (Object.values(selectedFields).filter(Boolean).length === 0 && Object.values(selectedSeasons).filter(Boolean).length === 0)}
              >
                {isSavingImport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Importa selezionati
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Partecipazione Dialog */}
      <Dialog open={showEditPartecipazioneDialog} onOpenChange={setShowEditPartecipazioneDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica Partecipazione</DialogTitle>
            <DialogDescription>
              Modifica i dettagli della partecipazione di {selectedPartecipazione?.artisti?.nome} {selectedPartecipazione?.artisti?.cognome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ruolo">Ruolo</Label>
              <Select 
                value={editPartecipazioneForm.ruolo_id} 
                onValueChange={(value) => setEditPartecipazioneForm({ ...editPartecipazioneForm, ruolo_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona ruolo" />
                </SelectTrigger>
                <SelectContent>
                  {ruoli.map((ruolo) => (
                    <SelectItem key={ruolo.id} value={ruolo.id}>
                      {ruolo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="personaggio">Personaggio</Label>
              <Input
                id="personaggio"
                value={editPartecipazioneForm.personaggio}
                onChange={(e) => setEditPartecipazioneForm({ ...editPartecipazioneForm, personaggio: e.target.value })}
                placeholder="Nome del personaggio interpretato"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stato_validazione">Stato Validazione</Label>
              <Select 
                value={editPartecipazioneForm.stato_validazione} 
                onValueChange={(value) => setEditPartecipazioneForm({ ...editPartecipazioneForm, stato_validazione: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="da_validare">Da Validare</SelectItem>
                  <SelectItem value="validato">Validato</SelectItem>
                  <SelectItem value="respinto">Respinto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={editPartecipazioneForm.note}
                onChange={(e) => setEditPartecipazioneForm({ ...editPartecipazioneForm, note: e.target.value })}
                placeholder="Note aggiuntive..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPartecipazioneDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleSavePartecipazione} disabled={isSavingPartecipazione}>
              {isSavingPartecipazione ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva Modifiche'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Partecipazione Dialog */}
      <Dialog open={showDeletePartecipazioneDialog} onOpenChange={setShowDeletePartecipazioneDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Elimina Partecipazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questa partecipazione?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-md space-y-2">
              <p><strong>Artista:</strong> {selectedPartecipazione?.artisti?.nome} {selectedPartecipazione?.artisti?.cognome}</p>
              <p><strong>Ruolo:</strong> {selectedPartecipazione?.ruoli_tipologie?.nome}</p>
              {selectedPartecipazione?.personaggio && (
                <p><strong>Personaggio:</strong> {selectedPartecipazione.personaggio}</p>
              )}
            </div>
            <p className="mt-4 text-sm text-red-600">
              Questa azione non può essere annullata.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeletePartecipazioneDialog(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleDeletePartecipazione} disabled={isDeletingPartecipazione}>
              {isDeletingPartecipazione ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                'Elimina'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Partecipazioni Dialog */}
      <Dialog open={showBulkDeletePartecipazioniDialog} onOpenChange={setShowBulkDeletePartecipazioniDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Elimina Partecipazioni</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare {selectedPartecipazioniIds.size} partecipazion{selectedPartecipazioniIds.size === 1 ? 'e' : 'i'}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-md max-h-48 overflow-y-auto space-y-2">
              {partecipazioni
                .filter((p: any) => selectedPartecipazioniIds.has(p.id))
                .map((p: any) => (
                  <div key={p.id} className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{p.artisti?.nome} {p.artisti?.cognome}</span>
                    <span className="text-muted-foreground">({p.ruoli_tipologie?.nome})</span>
                  </div>
                ))
              }
            </div>
            <p className="mt-4 text-sm text-red-600">
              Questa azione non può essere annullata.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeletePartecipazioniDialog(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleBulkDeletePartecipazioni} disabled={isBulkDeletingPartecipazioni}>
              {isBulkDeletingPartecipazioni ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina {selectedPartecipazioniIds.size}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Episodio Dialog */}
      <Dialog open={showEditEpisodioDialog} onOpenChange={setShowEditEpisodioDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Episodio</DialogTitle>
            <DialogDescription>
              Modifica i dettagli dell&apos;episodio S{selectedEpisodio?.numero_stagione}E{selectedEpisodio?.numero_episodio}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="titolo_episodio">Titolo Episodio</Label>
              <Input
                id="titolo_episodio"
                value={editEpisodioForm.titolo_episodio}
                onChange={(e) => setEditEpisodioForm({ ...editEpisodioForm, titolo_episodio: e.target.value })}
                placeholder="Titolo dell'episodio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descrizione">Descrizione</Label>
              <Textarea
                id="descrizione"
                value={editEpisodioForm.descrizione}
                onChange={(e) => setEditEpisodioForm({ ...editEpisodioForm, descrizione: e.target.value })}
                placeholder="Descrizione dell'episodio"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="durata_minuti">Durata (minuti)</Label>
                <Input
                  id="durata_minuti"
                  type="number"
                  value={editEpisodioForm.durata_minuti}
                  onChange={(e) => setEditEpisodioForm({ ...editEpisodioForm, durata_minuti: e.target.value })}
                  placeholder="Durata in minuti"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_prima_messa_in_onda">Data Prima Messa in Onda</Label>
                <Input
                  id="data_prima_messa_in_onda"
                  type="date"
                  value={editEpisodioForm.data_prima_messa_in_onda}
                  onChange={(e) => setEditEpisodioForm({ ...editEpisodioForm, data_prima_messa_in_onda: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="imdb_tconst">IMDb tconst</Label>
                <Input
                  id="imdb_tconst"
                  value={editEpisodioForm.imdb_tconst}
                  onChange={(e) => setEditEpisodioForm({ ...editEpisodioForm, imdb_tconst: e.target.value })}
                  placeholder="tt1234567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codice_isan">Codice ISAN</Label>
                <Input
                  id="codice_isan"
                  value={editEpisodioForm.codice_isan}
                  onChange={(e) => setEditEpisodioForm({ ...editEpisodioForm, codice_isan: e.target.value })}
                  placeholder="Codice ISAN"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditEpisodioDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleSaveEpisodio} disabled={isSavingEpisodio}>
              {isSavingEpisodio ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva Modifiche'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Component for each import field row
function ImportFieldRow({
  fieldKey,
  label,
  dbValue,
  imdbValue,
  selected,
  onToggle,
  status,
  hint,
}: {
  fieldKey: string
  label: string
  dbValue: any
  imdbValue: any
  selected: boolean
  onToggle: (checked: boolean) => void
  status: 'missing' | 'different' | 'same' | 'empty'
  hint?: string
}) {
  const formatValue = (val: any) => {
    if (val === null || val === undefined || val === '') return <span className="text-muted-foreground italic">— vuoto —</span>
    return String(val)
  }
  
  const getStatusBadge = () => {
    switch (status) {
      case 'missing':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Mancante nel DB</Badge>
      case 'different':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Valore diverso</Badge>
      case 'same':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Uguale</Badge>
      case 'empty':
        return <Badge variant="outline" className="text-muted-foreground">Non disponibile</Badge>
    }
  }
  
  if (status === 'empty') return null
  
  return (
    <div 
      className={`p-4 rounded-lg border transition-colors cursor-pointer ${selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
      onClick={() => onToggle(!selected)}
    >
      <div className="flex items-start gap-3">
        <Checkbox 
          id={fieldKey}
          checked={selected}
          onCheckedChange={onToggle}
          className="mt-1"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={fieldKey} className="font-medium cursor-pointer">{label}</Label>
            {getStatusBadge()}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Database attuale</div>
              <div className="p-2 rounded bg-muted/50 font-mono text-xs break-all">
                {formatValue(dbValue)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                IMDb <ArrowRight className="h-3 w-3" />
              </div>
              <div className={`p-2 rounded font-mono text-xs break-all ${selected ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'}`}>
                {formatValue(imdbValue)}
              </div>
            </div>
          </div>
          
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      </div>
    </div>
  )
}

// Component for credits section
function CreditsSection({
  title,
  icon,
  credits,
  showCharacter = true,
  showStar = false,
  showNconst = false,
  collapsible = false,
}: {
  title: string
  icon?: ReactNode
  credits: any[]
  showCharacter?: boolean
  showStar?: boolean
  showNconst?: boolean
  collapsible?: boolean
}) {
  const [expanded, setExpanded] = useState(!collapsible)
  
  if (!credits || credits.length === 0) return null
  
  const displayCredits = expanded ? credits : credits.slice(0, 5)
  
  return (
    <div className="border-t first:border-t-0">
      <div 
        className={`px-6 py-3 bg-muted/30 flex items-center justify-between ${collapsible ? 'cursor-pointer hover:bg-muted/50' : ''}`}
        onClick={() => collapsible && setExpanded(!expanded)}
      >
        <h3 className="font-semibold text-sm flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{credits.length} persone</span>
          {collapsible && (
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          )}
        </div>
      </div>
      
      {(expanded || !collapsible) && (
        <div className="divide-y">
          {displayCredits.map((credit: any, index: number) => (
            <div 
              key={`${credit.id}-${index}`} 
              className="px-6 py-3 flex items-center gap-4 hover:bg-muted/30"
            >
              {showStar && credit.isStar && (
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{credit.name}</span>
                  {showNconst && credit.id && (
                    <span className="text-xs text-muted-foreground font-mono">({credit.id})</span>
                  )}
                </div>
                {showCharacter && credit.character && (
                  <div className="text-sm text-muted-foreground">come {credit.character}</div>
                )}
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {credit.categoryLabel || credit.category}
              </Badge>
            </div>
          ))}
          
          {collapsible && !expanded && credits.length > 5 && (
            <div 
              className="px-6 py-2 text-center text-sm text-primary cursor-pointer hover:bg-muted/30"
              onClick={() => setExpanded(true)}
            >
              Mostra altri {credits.length - 5}...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
