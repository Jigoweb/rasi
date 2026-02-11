'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation';
import { getArtistaById, getPartecipazioniByArtistaId, updatePartecipazione, deletePartecipazione, deletePartecipazioniMultiple, updateArtista } from '@/features/artisti/services/artisti.service';
import { getRuoliTipologie, getIndividuazioniByPartecipazioneId, deleteIndividuazioniByPartecipazioneId, getIndividuazioniByPartecipazioneIds, deleteIndividuazioniByPartecipazioneIds } from '@/features/opere/services/opere.service';
import { Database } from '@/shared/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { ArrowLeft, Film, Hash, FileText, Calendar, Clock, User, MoreHorizontal, Edit, Trash2, Loader2, Tv, Clapperboard, ExternalLink, Theater, CheckSquare, Square, X, Pencil } from 'lucide-react'
import { Checkbox } from '@/shared/components/ui/checkbox'
import Link from 'next/link'
import { ArtistaFormMultistep } from '@/app/dashboard/artisti/components/artista-form-multistep'

type Artista = Database['public']['Tables']['artisti']['Row']

interface RuoloTipologia {
  id: string
  nome: string
  descrizione: string | null
  categoria: string | null
}

interface Partecipazione {
  id: string
  personaggio: string | null
  note: string | null
  stato_validazione: string | null
  created_at: string | null
  artista_id?: string
  opera_id?: string
  episodio_id?: string | null
  ruolo_id?: string
  opere: {
    id: string
    codice_opera: string
    titolo: string
    titolo_originale: string | null
    tipo: string
    anno_produzione: number | null
  } | null
  ruoli_tipologie: {
    id: string
    nome: string
    descrizione: string | null
  } | null
  episodi?: {
    id: string
    titolo_episodio: string | null
    numero_episodio: number | null
    numero_stagione: number | null
  } | null
}

export default function ArtistaProfiloPage() {
  const params = useParams()
  const router = useRouter()
  const artistaId = params.id as string

  const [artista, setArtista] = useState<Artista | null>(null)
  const [partecipazioni, setPartecipazioni] = useState<Partecipazione[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Edit/Delete partecipazione state
  const [ruoli, setRuoli] = useState<RuoloTipologia[]>([])
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPartecipazione, setSelectedPartecipazione] = useState<Partecipazione | null>(null)
  const [editForm, setEditForm] = useState({
    ruolo_id: '',
    personaggio: '',
    note: '',
    stato_validazione: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [partecipazioneIndividuazioni, setPartecipazioneIndividuazioni] = useState<{ id: string; campagna_individuazioni_id: string; campagne_individuazione?: { nome: string } | null }[]>([])
  const [deleteIndividuazioniToo, setDeleteIndividuazioniToo] = useState(true)
  const [bulkPartecipazioneIndividuazioni, setBulkPartecipazioneIndividuazioni] = useState<{ id: string; partecipazione_id: string; campagna_individuazioni_id: string; campagne_individuazione?: { nome: string } | null }[]>([])
  const [bulkDeleteIndividuazioniToo, setBulkDeleteIndividuazioniToo] = useState(false)
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Edit artista state
  const [showEditArtistaDialog, setShowEditArtistaDialog] = useState(false)
  const [isSavingArtista, setIsSavingArtista] = useState(false)

  const fetchArtistaData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch artista details
      const { data: artistaData, error: artistaError } = await getArtistaById(artistaId);

      if (artistaError) {
        if (artistaError.code === 'PGRST116') {
          setError('Artista non trovato')
          return
        }
        throw artistaError
      }

      setArtista(artistaData)

      // Fetch partecipazioni with related data
      const { data: partecipazioniData, error: partecipazioniError } = await getPartecipazioniByArtistaId(artistaId);

      if (partecipazioniError) throw partecipazioniError

      // Ordina partecipazioni: anno (decrescente), poi stagione/episodio per serie TV, poi titolo
      const sortedPartecipazioni = [...(partecipazioniData || [])].sort((a: any, b: any) => {
        // Prima ordina per anno di produzione (decrescente - più recenti prima)
        const annoA = a.opere?.anno_produzione ?? 0
        const annoB = b.opere?.anno_produzione ?? 0
        if (annoA !== annoB) return annoB - annoA
        
        // Per le serie TV, ordina per stagione e episodio
        const tipoA = (a.opere?.tipo || '').toLowerCase()
        const tipoB = (b.opere?.tipo || '').toLowerCase()
        
        if (tipoA === 'serie_tv' && tipoB === 'serie_tv') {
          const stagA = a.episodi?.numero_stagione ?? 9999
          const stagB = b.episodi?.numero_stagione ?? 9999
          if (stagA !== stagB) return stagA - stagB
          
          const epA = a.episodi?.numero_episodio ?? 9999
          const epB = b.episodi?.numero_episodio ?? 9999
          if (epA !== epB) return epA - epB
        }
        
        // Infine ordina per titolo dell'opera
        const titoloA = (a.opere?.titolo || '').toLowerCase()
        const titoloB = (b.opere?.titolo || '').toLowerCase()
        return titoloA.localeCompare(titoloB)
      })
      
      setPartecipazioni(sortedPartecipazioni as any)
    } catch (error) {
      console.error('Error fetching artista data:', JSON.stringify(error, null, 2))
      setError('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }, [artistaId])

  useEffect(() => {
    if (artistaId) {
      fetchArtistaData()
    }
    // Carica ruoli disponibili
    getRuoliTipologie().then(({ data }) => {
      if (data) setRuoli(data)
    })
  }, [artistaId, fetchArtistaData])

  // Fetch individuazioni quando si apre il dialog bulk delete
  useEffect(() => {
    if (showBulkDeleteDialog && selectedIds.size > 0) {
      setBulkDeleteIndividuazioniToo(false)
      getIndividuazioniByPartecipazioneIds(Array.from(selectedIds)).then(({ data }) => {
        setBulkPartecipazioneIndividuazioni(data || [])
      })
    } else {
      setBulkPartecipazioneIndividuazioni([])
    }
  }, [showBulkDeleteDialog, selectedIds])

  const getStatusBadge = (stato: string | null) => {
    if (!stato) return null
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  const openEditDialog = (partecipazione: Partecipazione) => {
    setSelectedPartecipazione(partecipazione)
    setEditForm({
      ruolo_id: partecipazione.ruolo_id || partecipazione.ruoli_tipologie?.id || '',
      personaggio: partecipazione.personaggio || '',
      note: partecipazione.note || '',
      stato_validazione: partecipazione.stato_validazione || 'da_validare'
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = async (partecipazione: Partecipazione) => {
    setSelectedPartecipazione(partecipazione)
    setPartecipazioneIndividuazioni([])
    setDeleteIndividuazioniToo(false)
    setShowDeleteDialog(true)
    const { data } = await getIndividuazioniByPartecipazioneId(partecipazione.id)
    setPartecipazioneIndividuazioni(data || [])
  }

  const handleSaveEdit = async () => {
    if (!selectedPartecipazione) return
    
    setIsSaving(true)
    try {
      const { error } = await updatePartecipazione(selectedPartecipazione.id, {
        ruolo_id: editForm.ruolo_id,
        personaggio: editForm.personaggio || null,
        note: editForm.note || null,
        stato_validazione: editForm.stato_validazione
      })
      
      if (error) {
        throw new Error(error.message || 'Errore durante l\'aggiornamento')
      }
      
      setShowEditDialog(false)
      fetchArtistaData()
    } catch (e: any) {
      alert('Errore durante l\'aggiornamento: ' + (e?.message || 'Errore sconosciuto'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedPartecipazione) return
    
    const hasIndividuazioni = partecipazioneIndividuazioni.length > 0
    const shouldDeleteIndividuazioni = hasIndividuazioni && deleteIndividuazioniToo
    
    setIsDeleting(true)
    try {
      if (shouldDeleteIndividuazioni) {
        const { error: indErr } = await deleteIndividuazioniByPartecipazioneId(selectedPartecipazione.id)
        if (indErr) throw indErr
      }
      
      const { error } = await deletePartecipazione(selectedPartecipazione.id)
      if (error) throw error
      
      setShowDeleteDialog(false)
      fetchArtistaData()
    } catch (e: any) {
      console.error('Error deleting partecipazione:', e)
      alert('Errore durante l\'eliminazione: ' + (e?.message || 'Errore sconosciuto'))
    } finally {
      setIsDeleting(false)
    }
  }

  // Multi-select handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === partecipazioni.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(partecipazioni.map(p => p.id)))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    const ids = Array.from(selectedIds)
    const hasIndividuazioni = bulkPartecipazioneIndividuazioni.length > 0
    const shouldDeleteIndividuazioni = hasIndividuazioni && bulkDeleteIndividuazioniToo

    setIsBulkDeleting(true)
    try {
      if (shouldDeleteIndividuazioni) {
        const { error: indErr } = await deleteIndividuazioniByPartecipazioneIds(ids)
        if (indErr) throw indErr
      }

      const { error } = await deletePartecipazioniMultiple(ids)
      if (error) throw error

      setShowBulkDeleteDialog(false)
      setSelectedIds(new Set())
      fetchArtistaData()
    } catch (e: any) {
      alert('Errore durante l\'eliminazione: ' + (e?.message || 'Errore sconosciuto'))
    } finally {
      setIsBulkDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Caricamento...</div>
        </div>
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

  if (!artista) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Artista non trovato</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl lg:text-3xl font-bold">
              {artista.nome} {artista.cognome}
            </h1>
            {getStatusBadge(artista.stato)}
          </div>
          {artista.nome_arte && (
            <p className="text-lg text-muted-foreground">({artista.nome_arte})</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => router.back()} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna Indietro
          </Button>
          <Button onClick={() => setShowEditArtistaDialog(true)} size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Modifica
          </Button>
        </div>
      </div>

      {/* Dettagli Artista */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Informazioni Artista
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 lg:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Hash className="mr-2 h-4 w-4" />
                Codice IPN
              </div>
              <div className="font-medium break-all">{artista.codice_ipn}</div>
            </div>

            {artista.codice_fiscale && (
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <FileText className="mr-2 h-4 w-4" />
                  Codice Fiscale
                </div>
                <div className="font-medium font-mono">{artista.codice_fiscale}</div>
              </div>
            )}

            {artista.data_nascita && (
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  Data di Nascita
                </div>
                <div className="font-medium">{formatDate(artista.data_nascita)}</div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-2 h-4 w-4" />
                Data Inizio Mandato
              </div>
              <div className="font-medium">{formatDate(artista.data_inizio_mandato)}</div>
            </div>

            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-2 h-4 w-4" />
                Ultimo Aggiornamento
              </div>
              <div className="font-medium">{formatDate(artista.updated_at)}</div>
            </div>
          </div>
          
          {/* Contatti e Indirizzo */}
          {((artista.contatti as any)?.email || (artista.contatti as any)?.number || artista.indirizzo) && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-semibold mb-4">Contatti e Residenza</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {(artista.contatti as any)?.email && (
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="mr-2 h-4 w-4" />
                      Email
                    </div>
                    <div className="font-medium break-all">{(artista.contatti as any).email}</div>
                  </div>
                )}
                {(artista.contatti as any)?.number && (
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="mr-2 h-4 w-4" />
                      Telefono
                    </div>
                    <div className="font-medium">{(artista.contatti as any).number}</div>
                  </div>
                )}
                {artista.indirizzo && (
                  <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Hash className="mr-2 h-4 w-4" />
                      Indirizzo
                    </div>
                    <div className="font-medium">
                      {[
                        (artista.indirizzo as any)?.via,
                        (artista.indirizzo as any)?.civico,
                        (artista.indirizzo as any)?.cap,
                        (artista.indirizzo as any)?.citta,
                        (artista.indirizzo as any)?.provincia
                      ].filter(Boolean).join(', ') || '—'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Opere e Partecipazioni */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Film className="mr-2 h-5 w-5" />
              Opere e Partecipazioni
            </div>
            <Badge variant="secondary">
              {partecipazioni.length} {partecipazioni.length === 1 ? 'partecipazione' : 'partecipazioni'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Elenco delle opere a cui l&apos;artista ha partecipato
          </CardDescription>
        </CardHeader>
        
        {/* Barra azioni selezione multipla */}
        {selectedIds.size > 0 && (
          <div className="px-4 py-3 bg-primary/5 border-b flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Checkbox 
                checked={selectedIds.size === partecipazioni.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium">
                {selectedIds.size} {selectedIds.size === 1 ? 'selezionata' : 'selezionate'}
              </span>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-4 w-4 mr-1" />
                Deseleziona
              </Button>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina selezionate
            </Button>
          </div>
        )}
        
        <CardContent className="p-0">
          {partecipazioni.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Film className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nessuna partecipazione trovata per questo artista</p>
            </div>
          ) : (
            <div className="divide-y">
              {partecipazioni.map((partecipazione) => {
                const tipoOpera = (partecipazione.opere?.tipo || '').toLowerCase()
                const TipoIcon = tipoOpera === 'serie_tv' ? Tv : tipoOpera === 'film' ? Clapperboard : Film
                const tipoColor = tipoOpera === 'serie_tv' ? 'bg-purple-100 text-purple-700' : tipoOpera === 'film' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                const isSelected = selectedIds.has(partecipazione.id)
                
                return (
                  <div key={partecipazione.id} className={`px-4 py-3 hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                    <div className="flex gap-3 items-start">
                      {/* Checkbox selezione */}
                      <div className="flex items-center shrink-0 pt-0.5">
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(partecipazione.id)}
                        />
                      </div>
                      
                      {/* Contenuto principale */}
                      <div className="flex-1 min-w-0">
                        {/* Riga 1: Titolo, Anno, Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                            <Link 
                              href={`/dashboard/opere/${partecipazione.opere?.id}`}
                              className="font-semibold hover:text-primary transition-colors truncate"
                            >
                              {partecipazione.opere?.titolo}
                            </Link>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {partecipazione.opere?.anno_produzione || '—'}
                            </Badge>
                            <Badge variant="outline" className={`${tipoColor} border-0 text-xs`}>
                              {partecipazione.opere?.tipo?.replace('_', ' ')}
                            </Badge>
                            <Badge className="bg-primary/10 text-primary border-0 hover:bg-primary/10 text-xs">
                              {partecipazione.ruoli_tipologie?.nome || 'Ruolo'}
                            </Badge>
                            {getValidationBadge(partecipazione.stato_validazione)}
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(partecipazione)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifica
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(partecipazione)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Elimina
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {/* Riga 2: Titolo originale / Codice / Episodio / Personaggio / Data */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground mt-1">
                          {partecipazione.opere?.titolo_originale && 
                           partecipazione.opere.titolo_originale !== partecipazione.opere.titolo && (
                            <span className="truncate">{partecipazione.opere.titolo_originale}</span>
                          )}
                          <span className="font-mono text-xs">{partecipazione.opere?.codice_opera}</span>
                          {partecipazione.episodi && (
                            <span className="flex items-center gap-1">
                              <Tv className="h-3 w-3" />
                              S{partecipazione.episodi.numero_stagione || '?'}E{partecipazione.episodi.numero_episodio || '?'}
                            </span>
                          )}
                          {partecipazione.personaggio && (
                            <span>
                              Personaggio: &quot;{partecipazione.personaggio}&quot;
                            </span>
                          )}
                          <span>{formatDate(partecipazione.created_at)}</span>
                        </div>
                        
                        {/* Note (se presenti) */}
                        {partecipazione.note && (
                          <div className="mt-1.5 text-sm text-muted-foreground bg-muted/50 rounded px-2 py-1">
                            {partecipazione.note}
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

      {/* Edit Partecipazione Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica Partecipazione</DialogTitle>
            <DialogDescription>
              Modifica i dettagli della partecipazione per "{selectedPartecipazione?.opere?.titolo}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ruolo">Ruolo</Label>
              <Select 
                value={editForm.ruolo_id} 
                onValueChange={(value) => setEditForm({ ...editForm, ruolo_id: value })}
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
                value={editForm.personaggio}
                onChange={(e) => setEditForm({ ...editForm, personaggio: e.target.value })}
                placeholder="Nome del personaggio interpretato"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stato_validazione">Stato Validazione</Label>
              <Select 
                value={editForm.stato_validazione} 
                onValueChange={(value) => setEditForm({ ...editForm, stato_validazione: value })}
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
                value={editForm.note}
                onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                placeholder="Note aggiuntive..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
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
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Elimina Partecipazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questa partecipazione?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-muted rounded-md space-y-2">
              <p><strong>Opera:</strong> {selectedPartecipazione?.opere?.titolo}</p>
              <p><strong>Ruolo:</strong> {selectedPartecipazione?.ruoli_tipologie?.nome}</p>
              {selectedPartecipazione?.personaggio && (
                <p><strong>Personaggio:</strong> {selectedPartecipazione.personaggio}</p>
              )}
            </div>
            {partecipazioneIndividuazioni.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md space-y-3">
                <p className="text-sm font-medium text-amber-800">
                  Attenzione: questa partecipazione è stata usata per {partecipazioneIndividuazioni.length} individuazion{partecipazioneIndividuazioni.length === 1 ? 'e' : 'i'} nelle seguenti campagne:
                </p>
                <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                  {[...new Set(partecipazioneIndividuazioni.map(i => i.campagne_individuazione?.nome || 'Campagna senza nome'))].map((nome, idx) => (
                    <li key={idx}>{nome}</li>
                  ))}
                </ul>
                <p className="text-sm text-amber-800">
                  Per eliminare la partecipazione dovrai eliminare anche le individuazioni associate.
                </p>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="delete-individuazioni"
                    checked={deleteIndividuazioniToo}
                    onCheckedChange={(checked) => setDeleteIndividuazioniToo(!!checked)}
                  />
                  <Label htmlFor="delete-individuazioni" className="text-sm font-normal cursor-pointer">
                    Elimina anche le individuazioni generate da questa partecipazione
                  </Label>
                </div>
              </div>
            )}
            <p className="text-sm text-red-600">
              Questa azione non può essere annullata.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
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

      {/* Bulk Delete Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Elimina Partecipazioni</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare {selectedIds.size} partecipazion{selectedIds.size === 1 ? 'e' : 'i'}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-muted rounded-md max-h-48 overflow-y-auto space-y-2">
              {partecipazioni
                .filter(p => selectedIds.has(p.id))
                .map(p => (
                  <div key={p.id} className="text-sm flex items-center gap-2">
                    <Film className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{p.opere?.titolo}</span>
                    <span className="text-muted-foreground">({p.ruoli_tipologie?.nome})</span>
                  </div>
                ))
              }
            </div>
            {bulkPartecipazioneIndividuazioni.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md space-y-3">
                <p className="text-sm font-medium text-amber-800">
                  Attenzione: alcune partecipazioni selezionate sono state usate per {bulkPartecipazioneIndividuazioni.length} individuazion{bulkPartecipazioneIndividuazioni.length === 1 ? 'e' : 'i'} nelle seguenti campagne:
                </p>
                <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                  {[...new Set(bulkPartecipazioneIndividuazioni.map(i => i.campagne_individuazione?.nome || 'Campagna senza nome'))].map((nome, idx) => (
                    <li key={idx}>{nome}</li>
                  ))}
                </ul>
                <p className="text-sm text-amber-800">
                  Puoi eliminare le partecipazioni mantenendo le individuazioni (rimarranno con il riferimento alla partecipazione annullato) oppure eliminare anche le individuazioni.
                </p>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="bulk-delete-individuazioni"
                    checked={bulkDeleteIndividuazioniToo}
                    onCheckedChange={(checked) => setBulkDeleteIndividuazioniToo(!!checked)}
                  />
                  <Label htmlFor="bulk-delete-individuazioni" className="text-sm font-normal cursor-pointer">
                    Elimina anche le individuazioni generate da queste partecipazioni
                  </Label>
                </div>
              </div>
            )}
            <p className="text-sm text-red-600">
              Questa azione non può essere annullata.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkDeleting}>
              {isBulkDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina {selectedIds.size}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Artista Dialog */}
      <Dialog open={showEditArtistaDialog} onOpenChange={setShowEditArtistaDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Modifica Artista</DialogTitle>
            <DialogDescription>
              Modifica le informazioni dell&apos;artista {artista.nome} {artista.cognome}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <ArtistaFormMultistep
              mode="edit"
              artista={artista}
              onSubmit={async (data) => {
                setIsSavingArtista(true)
                try {
                  const { data: updatedData, error } = await updateArtista(artista.id, data)
                  if (error) {
                    console.error('Errore Supabase:', error)
                    throw new Error(error.message || JSON.stringify(error))
                  }
                  
                  setShowEditArtistaDialog(false)
                  fetchArtistaData()
                } catch (e: any) {
                  console.error('Errore durante l\'aggiornamento:', e)
                  alert('Errore durante l\'aggiornamento: ' + (e?.message || JSON.stringify(e) || 'Errore sconosciuto'))
                } finally {
                  setIsSavingArtista(false)
                }
              }}
              onCancel={() => setShowEditArtistaDialog(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
