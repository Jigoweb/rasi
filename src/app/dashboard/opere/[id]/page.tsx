'use client'

import { useCallback, useEffect, useState, ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { Database } from '@/shared/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { getOperaById, getPartecipazioniByOperaId, getEpisodiByOperaId, upsertEpisodi } from '@/features/opere/services/opere.service'
import { getTitleById, mapImdbToOpera, searchTitles, getTitleCredits, getEpisodesByTitleId, ImdbTitleDetails, ImdbEpisode, ImdbEpisodesResponse } from '@/features/opere/services/external/imdb.service'
import { ArrowLeft, Film, Tv, FileText, Hash, Calendar, User, BadgeInfo, PlayCircle, Search, Plus, Loader2, Download, Check, X, ArrowRight, ListVideo, ChevronDown, ChevronRight, Clapperboard, PenTool, Star, Users, Video, Music } from 'lucide-react'
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
      setPartecipazioni(pData || [])

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
  }, [operaId, fetchData])

  const performSearch = async (term: string, year?: number, type?: string) => {
    if (!term) return
    setIsSearchingImdb(true)
    try {
      // Search by title, year and type to get more accurate results (with directors)
      let { ok, results } = await searchTitles(term, year, type, true)

      // Intelligent fallback: if no results and we had strict filters, relax them
      if (ok && results.length === 0 && year) {
        // Retry without year
        const retry = await searchTitles(term, undefined, type, true)
        if (retry.ok) {
          results = retry.results
          ok = retry.ok
        }
      }
      
      // If still no results and we had a type, try without type (broadest search)
      if (ok && results.length === 0 && type) {
        const retry = await searchTitles(term, undefined, undefined, true)
        if (retry.ok) {
          results = retry.results
          ok = retry.ok
        }
      }

      if (ok) {
        setImdbSearchResults(results)
      } else {
        setImdbSearchResults([])
      }
    } catch (e) {
      console.error(e)
      setImdbSearchResults([])
    } finally {
      setIsSearchingImdb(false)
    }
  }

  const handleSearchImdb = async () => {
    if (!opera) return
    setShowImdbSearch(true)

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
      }
    }

    // 2. Fallback to search by title/year/type
    setSearchTerm(opera.titolo)
    performSearch(opera.titolo, opera.anno_produzione ?? undefined, opera.tipo)
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
    if (!imdbId) return
    
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
            ? `${ep.releaseDate.year}-${String(ep.releaseDate.month).padStart(2, '0')}-${String(ep.releaseDate.day).padStart(2, '0')}`
            : null,
          metadati: { imdb_tconst: ep.id, imdb_rating: ep.rating },
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
        codice_opera: opera.codice_opera,
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
            {(opera.imdb_tconst || pendingImdbTconst) && (
              <Button variant="secondary" onClick={handleOpenImportDialog} disabled={loadingImdbData}>
                {loadingImdbData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Importa da IMDb
              </Button>
            )}
            <Button onClick={() => setShowEditForm(true)}>Modifica</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5" />Partecipazioni</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 px-4 first:pl-6">Artista</TableHead>
                  <TableHead className="py-3 px-4">Ruolo</TableHead>
                  <TableHead className="py-3 px-4">Personaggio</TableHead>
                  <TableHead className="py-3 px-4">Episodio</TableHead>
                  <TableHead className="py-3 px-4 last:pr-6">Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(partecipazioni || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nessuna partecipazione trovata</TableCell>
                  </TableRow>
                ) : (
                  partecipazioni.map((p: any) => (
                    <TableRow key={p.id} className="hover:bg-muted/50">
                      <TableCell className="py-4 px-4 pl-6">
                        {p.artisti ? (<div className="font-medium">{p.artisti.nome} {p.artisti.cognome}{p.artisti.nome_arte ? ` (${p.artisti.nome_arte})` : ''}</div>) : '—'}
                      </TableCell>
                      <TableCell className="py-4 px-4">{p.ruoli_tipologie ? p.ruoli_tipologie.nome : '—'}</TableCell>
                      <TableCell className="py-4 px-4">{p.personaggio || '—'}</TableCell>
                      <TableCell className="py-4 px-4">{p.episodi ? `S${p.episodi.numero_stagione} E${p.episodi.numero_episodio} – ${p.episodi.titolo_episodio || ''}` : '—'}</TableCell>
                      <TableCell className="py-4 px-4 pr-6">{p.stato_validazione || '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="lg:hidden p-4 space-y-3">
            {(partecipazioni || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nessuna partecipazione trovata</div>
            ) : (
              partecipazioni.map((p: any) => (
                <Card key={p.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="font-medium">{p.artisti ? `${p.artisti.nome} ${p.artisti.cognome}` : '—'}</div>
                    <div className="text-sm text-muted-foreground">{p.ruoli_tipologie ? p.ruoli_tipologie.nome : '—'}</div>
                    <div className="text-sm">{p.personaggio || '—'}</div>
                    <div className="text-xs text-muted-foreground">{p.episodi ? `S${p.episodi.numero_stagione} E${p.episodi.numero_episodio}` : '—'}</div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {imdbCredits.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5" />Credits IMDb</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowExportDialog(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Esporta Cast
            </Button>
          </CardHeader>
          <CardContent className="p-0 space-y-0">
            {/* Regia */}
            {imdbCreditsGrouped?.direction?.length > 0 && (
              <CreditsSection 
                title="Regia" 
                icon={<Clapperboard className="h-4 w-4" />}
                credits={imdbCreditsGrouped.direction}
                showCharacter={false}
              />
            )}
            
            {/* Sceneggiatura */}
            {imdbCreditsGrouped?.writing?.length > 0 && (
              <CreditsSection 
                title="Sceneggiatura" 
                icon={<PenTool className="h-4 w-4" />}
                credits={imdbCreditsGrouped.writing}
                showCharacter={false}
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
              />
            )}
            
            {/* Altri Attori */}
            {imdbCreditsGrouped?.castSecondary?.length > 0 && (
              <CreditsSection 
                title="Altri Attori" 
                icon={<Users className="h-4 w-4" />}
                credits={imdbCreditsGrouped.castSecondary}
                showCharacter={true}
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
              />
            )}
          </CardContent>
        </Card>
      )}
      
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
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Cerca titolo..." 
              onKeyDown={(e) => e.key === 'Enter' && performSearch(searchTerm)}
            />
            <Button onClick={() => performSearch(searchTerm)} disabled={isSearchingImdb}>
              {isSearchingImdb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {isSearchingImdb ? (
              <div className="flex justify-center py-8">Caricamento...</div>
            ) : imdbSearchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nessun risultato trovato</div>
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
                    <TableHead className="py-3 px-4 pr-6">Durata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(episodi || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nessun episodio associato</TableCell>
                    </TableRow>
                  ) : (
                    episodi.map((e: any) => (
                      <TableRow key={e.id} className="hover:bg-muted/50">
                        <TableCell className="py-4 px-4 pl-6">{e.numero_stagione}</TableCell>
                        <TableCell className="py-4 px-4">{e.numero_episodio}</TableCell>
                        <TableCell className="py-4 px-4">{e.titolo_episodio || '—'}</TableCell>
                        <TableCell className="py-4 px-4">{e.data_prima_messa_in_onda ? new Date(e.data_prima_messa_in_onda).toLocaleDateString('it-IT') : '—'}</TableCell>
                        <TableCell className="py-4 px-4 pr-6">{e.durata_minuti || '—'}</TableCell>
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
                    <CardContent className="p-4 space-y-1">
                      <div className="font-medium">S{e.numero_stagione} E{e.numero_episodio}</div>
                      <div className="text-sm">{e.titolo_episodio || '—'}</div>
                      <div className="text-xs text-muted-foreground">{e.data_prima_messa_in_onda ? new Date(e.data_prima_messa_in_onda).toLocaleDateString('it-IT') : '—'}</div>
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
              
              {/* Sezione Episodi (solo per serie TV) */}
              {(imdbDataToImport.type === 'tvSeries' || imdbDataToImport.type === 'tvMiniSeries' || opera?.tipo === 'serie_tv') && (
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center gap-2">
                    <ListVideo className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Episodi</h3>
                    {loadingImdbEpisodes && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  
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
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {imdbEpisodesData.seasons.map(season => (
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
                        ))}
                      </div>
                      
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
  collapsible = false,
}: {
  title: string
  icon?: ReactNode
  credits: any[]
  showCharacter?: boolean
  showStar?: boolean
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
                <div className="font-medium">{credit.name}</div>
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
