'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Badge } from '@/shared/components/ui/badge'
import { Label } from '@/shared/components/ui/label'
import { Search, Loader2, AlertCircle, CheckCircle2, Tv, Film, X } from 'lucide-react'
import { getOpere, getEpisodiByOperaId } from '@/features/opere/services/opere.service'
import { getArtisti } from '@/features/artisti/services/artisti.service'
import { getRuoliTipologie } from '@/features/opere/services/opere.service'
import { createPartecipazioniMultiple, checkPartecipazioniDuplicate } from '@/features/opere/services/opere.service'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { operaHaEpisodi } from '@/shared/lib/opere-utils'

interface Opera {
  id: string
  titolo: string
  titolo_originale: string | null
  tipo: string
  has_episodes?: boolean
  anno_produzione: number | null
  codice_opera: string | null
}

interface Artista {
  id: string
  nome: string
  cognome: string
  nome_arte: string | null
}

interface Ruolo {
  id: string
  nome: string
  descrizione: string | null
}

interface Episodio {
  id: string
  numero_stagione: number
  numero_episodio: number
  titolo_episodio: string | null
}

interface SelectedItem {
  id: string
  ruolo_id: string
  personaggio?: string
  episodi?: Array<{ episodio_id: string; ruolo_id: string }>
}

type Mode = 'from-artista' | 'from-opera'

interface AddPartecipazioneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: Mode
  artistaId?: string
  operaId?: string
  operaTipo?: string
  operaHasEpisodes?: boolean // Se l'opera ha episodi (quando si aggiunge da pagina opera)
  existingPartecipazioni?: Array<{
    artista_id: string
    opera_id: string
    episodio_id?: string | null
    ruolo_id: string
  }>
  onSuccess: () => void
}

export function AddPartecipazioneDialog({
  open,
  onOpenChange,
  mode,
  artistaId,
  operaId,
  operaTipo,
  operaHasEpisodes,
  existingPartecipazioni = [],
  onSuccess
}: AddPartecipazioneDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTipo, setFilterTipo] = useState<string>('all')
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map())
  const [ruoli, setRuoli] = useState<Ruolo[]>([])
  const [opere, setOpere] = useState<Opera[]>([])
  const [artisti, setArtisti] = useState<Artista[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [episodiMap, setEpisodiMap] = useState<Map<string, Episodio[]>>(new Map())
  const [expandedOpere, setExpandedOpere] = useState<Set<string>>(new Set())
  const [duplicateIndices, setDuplicateIndices] = useState<number[]>([])

  // Carica ruoli all'apertura
  useEffect(() => {
    if (open) {
      getRuoliTipologie().then(({ data }) => {
        if (data) setRuoli(data)
      })
    }
  }, [open])

  // Carica opere o artisti in base alla modalità
  useEffect(() => {
    if (open) {
      setLoadingItems(true)
      if (mode === 'from-artista') {
        getOpere({ search: searchQuery, tipo: filterTipo === 'all' ? undefined : filterTipo }).then(({ data }) => {
          setOpere(data || [])
          setLoadingItems(false)
        }).catch(() => {
          setLoadingItems(false)
        })
      } else {
        getArtisti({ search: searchQuery }).then(({ data }) => {
          setArtisti(data || [])
          setLoadingItems(false)
        }).catch(() => {
          setLoadingItems(false)
        })
      }
    }
  }, [open, searchQuery, filterTipo, mode])

  // Carica episodi per le opere con episodi selezionate
  useEffect(() => {
    if (mode === 'from-artista') {
      const opereConEpisodiIds = Array.from(selectedItems.keys()).filter(id => {
        const opera = opere.find(o => o.id === id)
        return opera && operaHaEpisodi(opera)
      })

      opereConEpisodiIds.forEach(opId => {
        if (!episodiMap.has(opId)) {
          getEpisodiByOperaId(opId).then(({ data }) => {
            if (data) {
              setEpisodiMap(prev => new Map(prev).set(opId, data))
            }
          })
        }
      })
    } else if (mode === 'from-opera' && operaId && operaHasEpisodes) {
      if (!episodiMap.has(operaId)) {
        getEpisodiByOperaId(operaId).then(({ data }) => {
          if (data) {
            setEpisodiMap(prev => new Map(prev).set(operaId, data))
          }
        })
      }
    }
  }, [selectedItems, opere, mode, operaId, operaHasEpisodes])

  const filteredItems = useMemo(() => {
    return mode === 'from-artista' ? opere : artisti
  }, [mode, opere, artisti])

  const toggleItem = (id: string) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev)
      if (newMap.has(id)) {
        newMap.delete(id)
        setExpandedOpere(prev => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })
      } else {
        const defaultRuolo = ruoli.length > 0 ? ruoli[0].id : ''
        newMap.set(id, {
          id,
          ruolo_id: defaultRuolo,
          personaggio: '',
          episodi: []
        })
      }
      return newMap
    })
  }

  const updateItemRuolo = (id: string, ruoloId: string) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev)
      const item = newMap.get(id)
      if (item) {
        newMap.set(id, {
          ...item,
          ruolo_id: ruoloId,
          // Ruolo di default per nuovi episodi; episodi esistenti mantengono il loro ruolo
          episodi: item.episodi?.map(ep => ({ ...ep, ruolo_id: ep.ruolo_id || ruoloId })) || []
        })
      }
      return newMap
    })
  }

  const updateItemPersonaggio = (id: string, personaggio: string) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev)
      const item = newMap.get(id)
      if (item) {
        newMap.set(id, { ...item, personaggio })
      }
      return newMap
    })
  }

  const toggleEpisodio = (itemId: string, episodioId: string) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev)
      const item = newMap.get(itemId)
      if (item) {
        const episodi = item.episodi || []
        const episodioIndex = episodi.findIndex(ep => ep.episodio_id === episodioId)
        const ruoloId = item.ruolo_id || ruoli[0]?.id || ''

        if (episodioIndex >= 0) {
          episodi.splice(episodioIndex, 1)
        } else {
          episodi.push({ episodio_id: episodioId, ruolo_id: ruoloId })
        }

        newMap.set(itemId, {
          ...item,
          episodi: [...episodi]
        })
      }
      return newMap
    })
  }

  const updateEpisodioRuolo = (itemId: string, episodioId: string, ruoloId: string) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev)
      const item = newMap.get(itemId)
      if (item) {
        const episodi = item.episodi || []
        const episodioIndex = episodi.findIndex(ep => ep.episodio_id === episodioId)
        if (episodioIndex >= 0) {
          episodi[episodioIndex] = { ...episodi[episodioIndex], ruolo_id: ruoloId }
          newMap.set(itemId, {
            ...item,
            episodi: [...episodi]
          })
        }
      }
      return newMap
    })
  }

  const handleSave = async () => {
    setError(null)
    setDuplicateIndices([])

    // Valida selezione
    const itemsArray = Array.from(selectedItems.values())
    if (itemsArray.length === 0) {
      setError('Seleziona almeno un\'opera o un artista')
      return
    }

    // Per opere con episodi, verifica che ogni artista/opera abbia almeno un episodio selezionato
    if (mode === 'from-opera' && operaHasEpisodes) {
      for (const item of itemsArray) {
        if (!item.episodi || item.episodi.length === 0) {
          setError('Ogni artista deve avere almeno un episodio selezionato.')
          return
        }
      }
    } else if (mode === 'from-artista') {
      for (const item of itemsArray) {
        const opera = opere.find(o => o.id === item.id)
        if (opera && operaHaEpisodi(opera)) {
          if (!item.episodi || item.episodi.length === 0) {
            setError(`L'opera "${opera.titolo}" ha episodi. Seleziona almeno un episodio.`)
            return
          }
        }
      }
    }
    
    // Verifica che tutti gli elementi abbiano un ruolo
    for (const item of itemsArray) {
      if (!item.ruolo_id) {
        setError('Seleziona un ruolo per tutti gli elementi selezionati')
        return
      }
    }

    // Prepara le partecipazioni da creare
    const partecipazioniToCreate: Array<{
      artista_id: string
      opera_id: string
      episodio_id?: string | null
      ruolo_id: string
      personaggio?: string | null
    }> = []

    for (const item of itemsArray) {
      const opera = mode === 'from-artista' ? opere.find(o => o.id === item.id) : null
      const hasEpisodes = mode === 'from-artista' 
        ? opera && operaHaEpisodi(opera)
        : operaHasEpisodes

      if (hasEpisodes && item.episodi && item.episodi.length > 0) {
        // Per serie TV, crea una partecipazione per ogni episodio
        for (const ep of item.episodi) {
          if (!ep?.episodio_id || !ep?.ruolo_id) continue
          partecipazioniToCreate.push({
            artista_id: mode === 'from-artista' ? artistaId! : item.id,
            opera_id: mode === 'from-artista' ? item.id : operaId!,
            episodio_id: ep.episodio_id,
            ruolo_id: ep.ruolo_id,
            personaggio: item.personaggio || null
          })
        }
      } else {
        // Per opere senza episodi o opere con episodi senza episodi selezionati
        partecipazioniToCreate.push({
          artista_id: mode === 'from-artista' ? artistaId! : item.id,
          opera_id: mode === 'from-artista' ? item.id : operaId!,
          episodio_id: null,
          ruolo_id: item.ruolo_id,
          personaggio: item.personaggio || null
        })
      }
    }

    // Controlla duplicati lato client
    const duplicateCheck = await checkPartecipazioniDuplicate(partecipazioniToCreate)
    if (duplicateCheck.length > 0) {
      setDuplicateIndices(duplicateCheck)
      setError(`Sono state trovate ${duplicateCheck.length} partecipazioni duplicate che esistono già nel database.`)
      return
    }

    setIsSaving(true)
    try {
      const { data, error: saveError, duplicates } = await createPartecipazioniMultiple(partecipazioniToCreate)
      
      if (saveError) {
        setError(saveError.message || 'Errore durante il salvataggio')
        if (duplicates && duplicates.length > 0) {
          setDuplicateIndices(duplicates.map(d => d.index))
        }
        return
      }

      // Successo
      onSuccess()
      handleClose()
    } catch (e: any) {
      setError(e?.message || 'Errore sconosciuto')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setSelectedItems(new Map())
    setSearchQuery('')
    setFilterTipo('all')
    setError(null)
    setDuplicateIndices([])
    setExpandedOpere(new Set())
    setEpisodiMap(new Map())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'from-artista' ? 'Aggiungi Partecipazioni' : 'Aggiungi Artisti'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'from-artista' 
              ? 'Seleziona le opere a cui l\'artista ha partecipato e i relativi ruoli'
              : 'Seleziona gli artisti che hanno partecipato all\'opera e i relativi ruoli'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Filtri e ricerca */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={mode === 'from-artista' ? 'Cerca opere...' : 'Cerca artisti...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {mode === 'from-artista' && (
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo opera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="film">Film</SelectItem>
                  <SelectItem value="serie_tv">Serie TV</SelectItem>
                  <SelectItem value="documentario">Documentario</SelectItem>
                  <SelectItem value="cartoon">Cartoon</SelectItem>
                  <SelectItem value="altro">Altro</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Errori e warning */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Lista elementi selezionabili */}
          <div className="flex-1 overflow-y-auto border rounded-lg p-4 space-y-2">
            {loadingItems ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'Nessun risultato trovato' : 'Nessun elemento disponibile'}
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedItems.has(item.id)
                const selectedData = selectedItems.get(item.id)
                const hasEpisodes = mode === 'from-artista' 
                  ? operaHaEpisodi(item as Opera)
                  : operaHasEpisodes
                const episodi = hasEpisodes 
                  ? (mode === 'from-artista' 
                      ? episodiMap.get(item.id) || []
                      : episodiMap.get(operaId || '') || [])
                  : []
                const isExpanded = expandedOpere.has(item.id)
                const isDuplicate = duplicateIndices.some(idx => {
                  // Logica per verificare se questo item è duplicato
                  // Questo è semplificato, potrebbe essere migliorato
                  return false
                })

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      isSelected ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
                    } ${isDuplicate ? 'border-destructive' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {mode === 'from-artista' 
                              ? (item as Opera).titolo
                              : `${(item as Artista).nome} ${(item as Artista).cognome}`
                            }
                          </span>
                          {mode === 'from-artista' && (
                            <>
                              {(item as Opera).anno_produzione && (
                                <Badge variant="secondary" className="text-xs">
                                  {(item as Opera).anno_produzione}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {(item as Opera).tipo.replace('_', ' ')}
                              </Badge>
                            </>
                          )}
                          {mode === 'from-opera' && (item as Artista).nome_arte && (
                            <Badge variant="outline" className="text-xs">
                              {(item as Artista).nome_arte}
                            </Badge>
                          )}
                        </div>

                        {isSelected && (
                          <div className="mt-3 space-y-3">
                            {/* Selezione ruolo */}
                            <div className="flex items-center gap-2">
                              <Label className="text-sm w-20">Ruolo:</Label>
                              <Select
                                value={selectedData?.ruolo_id || ''}
                                onValueChange={(value) => updateItemRuolo(item.id, value)}
                              >
                                <SelectTrigger className="w-[250px]">
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

                            {/* Personaggio */}
                            <div className="flex items-center gap-2">
                              <Label className="text-sm w-20">Personaggio:</Label>
                              <Input
                                placeholder="Nome del personaggio (opzionale)"
                                value={selectedData?.personaggio || ''}
                                onChange={(e) => updateItemPersonaggio(item.id, e.target.value)}
                                className="w-[250px]"
                              />
                            </div>

                            {/* Gestione episodi per opere con episodi: ogni artista/opera ha la propria selezione */}
                            {hasEpisodes && (
                              <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium flex items-center gap-2">
                                    <Tv className="h-4 w-4" />
                                    Episodi ({selectedData?.episodi?.length || 0} selezionati)
                                  </Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setExpandedOpere(prev => {
                                        const newSet = new Set(prev)
                                        if (newSet.has(item.id)) {
                                          newSet.delete(item.id)
                                        } else {
                                          newSet.add(item.id)
                                        }
                                        return newSet
                                      })
                                    }}
                                  >
                                    {isExpanded ? 'Nascondi' : 'Mostra'} episodi
                                  </Button>
                                </div>

                                {isExpanded && episodi.length > 0 && (
                                  <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {episodi.map((ep) => {
                                      const isEpSelected = selectedData?.episodi?.some(
                                        e => e.episodio_id === ep.id
                                      ) || false
                                      const epRuolo = selectedData?.episodi?.find(
                                        e => e.episodio_id === ep.id
                                      )?.ruolo_id || (selectedData?.ruolo_id || ruoli[0]?.id || '')

                                      return (
                                        <div
                                          key={ep.id}
                                          className={`flex items-center gap-2 p-2 rounded border ${
                                            isEpSelected ? 'bg-background border-primary/20' : ''
                                          }`}
                                        >
                                          <Checkbox
                                            checked={isEpSelected}
                                            onCheckedChange={() => toggleEpisodio(item.id, ep.id)}
                                          />
                                          <div className="flex-1">
                                            <div className="text-sm font-medium">
                                              S{ep.numero_stagione}E{ep.numero_episodio}
                                              {ep.titolo_episodio && ` - ${ep.titolo_episodio}`}
                                            </div>
                                          </div>
                                          {isEpSelected && (
                                            <Select
                                              value={epRuolo}
                                              onValueChange={(value) => updateEpisodioRuolo(item.id, ep.id, value)}
                                            >
                                              <SelectTrigger className="w-[180px]">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {ruoli.map((ruolo) => (
                                                  <SelectItem key={ruolo.id} value={ruolo.id}>
                                                    {ruolo.nome}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}

                                {episodi.length === 0 && (
                                  <div className="text-sm text-muted-foreground text-center py-4">
                                    Nessun episodio disponibile per questa opera
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Riepilogo selezione */}
          {selectedItems.size > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium mb-2">
                {selectedItems.size}{' '}
                {mode === 'from-opera'
                  ? selectedItems.size === 1
                    ? 'artista selezionato'
                    : 'artisti selezionati'
                  : selectedItems.size === 1
                    ? 'opera selezionata'
                    : 'opere selezionate'}
              </div>
              <div className="text-xs text-muted-foreground">
                {Array.from(selectedItems.values()).reduce((acc, item) => {
                  if (mode === 'from-opera' && operaHasEpisodes && item.episodi?.length) {
                    return acc + item.episodi.length
                  }
                  const opera = mode === 'from-artista' ? opere.find(o => o.id === item.id) : null
                  if (opera && operaHaEpisodi(opera) && item.episodi?.length) {
                    return acc + item.episodi.length
                  }
                  return acc + 1
                }, 0)} partecipazioni verranno create
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={isSaving || selectedItems.size === 0}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Salva partecipazioni
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
