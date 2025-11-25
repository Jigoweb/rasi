'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation';
import { getArtistaById, getPartecipazioniByArtistaId } from '@/features/artisti/services/artisti.service';
import { Database } from '@/shared/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'


import { ArrowLeft, Film, Hash, FileText, Calendar, Clock, User } from 'lucide-react'

type Artista = Database['public']['Tables']['artisti']['Row']

interface Partecipazione {
  id: string
  personaggio: string | null
  note: string | null
  stato_validazione: string | null
  created_at: string | null
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

      setPartecipazioni(partecipazioniData || [])
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
  }, [artistaId, fetchArtistaData])

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
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button onClick={() => router.back()} variant="outline" size="sm" className="w-fit">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna Indietro
          </Button>
          <div>
            <h1 className="text-xl lg:text-3xl font-bold">
              {artista.nome} {artista.cognome}
            </h1>
            {artista.nome_arte && (
              <p className="text-lg text-muted-foreground">({artista.nome_arte})</p>
            )}
          </div>
        </div>
        {getStatusBadge(artista.stato)}
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
        <CardContent className="p-4 lg:p-6">
          {partecipazioni.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessuna partecipazione trovata per questo artista
            </div>
          ) : (
            <div className="space-y-4 lg:space-y-6">
              {partecipazioni.map((partecipazione) => (
                <Card key={partecipazione.id} className="border-l-4 border-l-blue-500 shadow-sm">
                  <CardContent className="p-4 lg:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                      {/* Dettagli Opera */}
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold">{partecipazione.opere?.titolo}</h3>
                          {partecipazione.opere?.titolo_originale && (
                            <p className="text-sm text-muted-foreground">
                              Titolo originale: {partecipazione.opere.titolo_originale}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Codice:</span>
                            <div className="font-medium font-mono text-xs sm:text-sm">{partecipazione.opere?.codice_opera}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tipo:</span>
                            <div className="font-medium capitalize">{partecipazione.opere?.tipo}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Anno:</span>
                            <div className="font-medium">{partecipazione.opere?.anno_produzione}</div>
                          </div>
                        </div>
                      </div>

                      {/* Dettagli Partecipazione */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-base mb-2">Dettagli Partecipazione</h4>
                          <div className="space-y-3">
                            <div>
                              <span className="text-sm text-muted-foreground">Ruolo:</span>
                              <div className="font-medium">{partecipazione.ruoli_tipologie?.nome}</div>
                              {partecipazione.ruoli_tipologie?.descrizione && (
                                <div className="text-sm text-muted-foreground">
                                  {partecipazione.ruoli_tipologie.descrizione}
                                </div>
                              )}
                            </div>

                            {partecipazione.personaggio && (
                              <div>
                                <span className="text-sm text-muted-foreground">Personaggio:</span>
                                <div className="font-medium">{partecipazione.personaggio}</div>
                              </div>
                            )}

                            {partecipazione.episodi && (
                              <div>
                                <span className="text-sm text-muted-foreground">Episodio:</span>
                                <div className="font-medium">
                                  {partecipazione.episodi.numero_episodio && `Ep. ${partecipazione.episodi.numero_episodio} - `}
                                  {partecipazione.episodi.titolo_episodio}
                                </div>
                              </div>
                            )}

                            <div>
                              <span className="text-sm text-muted-foreground">Stato Validazione:</span>
                              <div className="mt-1">{getValidationBadge(partecipazione.stato_validazione)}</div>
                            </div>

                            {partecipazione.note && (
                              <div>
                                <span className="text-sm text-muted-foreground">Note:</span>
                                <div className="text-sm bg-gray-50 p-2 rounded mt-1">{partecipazione.note}</div>
                              </div>
                            )}

                            <div>
                              <span className="text-sm text-muted-foreground">Data Partecipazione:</span>
                              <div className="text-sm font-medium">{formatDate(partecipazione.created_at)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}