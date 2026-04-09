'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/shared/contexts/auth-context'
import { getArtistaById, getPartecipazioniByArtistaId } from '@/features/artisti/services/artisti.service'
import { supabase } from '@/shared/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table'
import { Loader2, User, Film, Radio, Banknote, ChevronLeft, ChevronRight } from 'lucide-react'

type TabId = 'profilo' | 'repertorio' | 'individuazioni' | 'ripartizioni'

export default function ProfiloArtistaPage() {
  const { artistaId, loading: authLoading } = useAuth()

  const [activeTab, setActiveTab] = useState<TabId>('profilo')
  const [artista, setArtista] = useState<any>(null)
  const [partecipazioni, setPartecipazioni] = useState<any[]>([])
  const [individuazioni, setIndividuazioni] = useState<any[]>([])
  const [ripartizioni, setRipartizioni] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTab, setLoadingTab] = useState(false)
  const [indPage, setIndPage] = useState(0)
  const IND_PAGE_SIZE = 50

  // Fetch artista data on mount
  useEffect(() => {
    if (!artistaId) {
      setLoading(false)
      return
    }

    const fetchArtista = async () => {
      const { data } = await getArtistaById(artistaId)
      setArtista(data)
      setLoading(false)
    }

    fetchArtista()
  }, [artistaId])

  // Fetch tab data on tab change
  useEffect(() => {
    if (!artistaId) return

    const fetchTabData = async () => {
      setLoadingTab(true)

      if (activeTab === 'repertorio' && partecipazioni.length === 0) {
        const { data } = await getPartecipazioniByArtistaId(artistaId)
        setPartecipazioni(data || [])
      }

      if (activeTab === 'individuazioni' && individuazioni.length === 0) {
        const { data } = await supabase
          .from('individuazioni')
          .select(`
            id,
            data_trasmissione,
            canale,
            emittente,
            titolo,
            titolo_originale,
            numero_stagione,
            numero_episodio,
            titolo_episodio,
            punteggio_matching,
            stato,
            metodo,
            opera_id,
            opere (titolo, tipo, anno_produzione)
          `)
          .eq('artista_id', artistaId)
          .order('data_trasmissione', { ascending: false })
          .limit(500)

        setIndividuazioni(data || [])
      }

      if (activeTab === 'ripartizioni' && ripartizioni.length === 0) {
        const { data } = await supabase
          .from('ripartizioni')
          .select(`
            id,
            numero_individuazioni,
            importo_lordo,
            trattenuta_collecting,
            altre_trattenute,
            importo_netto,
            created_at,
            campagne_ripartizione (
              id,
              nome,
              stato,
              periodo_riferimento_inizio,
              periodo_riferimento_fine
            )
          `)
          .eq('artista_id', artistaId)
          .order('created_at', { ascending: false })

        setRipartizioni(data || [])
      }

      setLoadingTab(false)
    }

    fetchTabData()
  }, [activeTab, artistaId])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!artistaId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          Account non collegato a nessun profilo artista. Contattare l&apos;amministrazione RASI.
        </CardContent>
      </Card>
    )
  }

  if (!artista) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          Profilo artista non trovato.
        </CardContent>
      </Card>
    )
  }

  const contatti = artista.contatti || {}
  const indirizzo = artista.indirizzo || {}

  const tabs: { id: TabId; label: string; icon: typeof User }[] = [
    { id: 'profilo', label: 'Dati Personali', icon: User },
    { id: 'repertorio', label: 'Repertorio', icon: Film },
    { id: 'individuazioni', label: 'Trasmissioni', icon: Radio },
    { id: 'ripartizioni', label: 'Compensi', icon: Banknote },
  ]

  const indPaged = individuazioni.slice(indPage * IND_PAGE_SIZE, (indPage + 1) * IND_PAGE_SIZE)
  const indTotalPages = Math.ceil(individuazioni.length / IND_PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {artista.nome} {artista.cognome}
          {artista.nome_arte && (
            <span className="text-gray-500 font-normal ml-2">({artista.nome_arte})</span>
          )}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={artista.stato === 'attivo' ? 'default' : 'secondary'}>
            {artista.stato}
          </Badge>
          {artista.codice_ipn && (
            <span className="text-sm text-gray-500">IPN: {artista.codice_ipn}</span>
          )}
          {artista.territorio && (
            <Badge variant="outline">{artista.territorio}</Badge>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loadingTab ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Tab: Dati Personali */}
          {activeTab === 'profilo' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Anagrafica</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow label="Nome" value={artista.nome} />
                  <InfoRow label="Cognome" value={artista.cognome} />
                  <InfoRow label="Nome d'arte" value={artista.nome_arte} />
                  <InfoRow label="Codice Fiscale" value={artista.codice_fiscale} />
                  <InfoRow label="Data di nascita" value={artista.data_nascita} />
                  <InfoRow label="Luogo di nascita" value={artista.luogo_nascita} />
                  <InfoRow label="Tipologia" value={artista.tipologia} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Contatti</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow label="Email" value={contatti.email} />
                  <InfoRow label="Telefono" value={contatti.telefono} />
                  {indirizzo.via && (
                    <InfoRow
                      label="Indirizzo"
                      value={`${indirizzo.via || ''} ${indirizzo.civico || ''}, ${indirizzo.cap || ''} ${indirizzo.citta || ''} (${indirizzo.provincia || ''})`}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Mandato</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow label="Stato" value={artista.stato} />
                  <InfoRow label="Data inizio mandato" value={artista.data_inizio_mandato} />
                  <InfoRow label="Data fine mandato" value={artista.data_fine_mandato} />
                  <InfoRow label="Territorio" value={artista.territorio} />
                  <InfoRow label="Codice IPN" value={artista.codice_ipn} />
                  <InfoRow label="RASI" value={artista.is_rasi ? 'Si' : 'No'} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Identificativi Esterni</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow label="IMDB" value={artista.imdb_nconst} />
                  <InfoRow label="Codice Paese" value={artista.codice_paese} />
                  {artista.diritti_attivi && artista.diritti_attivi.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Diritti attivi</span>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {artista.diritti_attivi.map((d: string) => (
                          <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab: Repertorio */}
          {activeTab === 'repertorio' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Opere e Partecipazioni ({partecipazioni.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {partecipazioni.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nessuna partecipazione registrata.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Opera</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Anno</TableHead>
                          <TableHead>Ruolo</TableHead>
                          <TableHead>Personaggio</TableHead>
                          <TableHead>Episodio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {partecipazioni.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.opere?.titolo || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {p.opere?.tipo || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell>{p.opere?.anno_produzione || '-'}</TableCell>
                            <TableCell>{p.ruoli_tipologie?.nome || '-'}</TableCell>
                            <TableCell>{p.personaggio || '-'}</TableCell>
                            <TableCell>
                              {p.episodi
                                ? `S${p.episodi.numero_stagione}E${p.episodi.numero_episodio}${p.episodi.titolo_episodio ? ` - ${p.episodi.titolo_episodio}` : ''}`
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab: Individuazioni (Trasmissioni) */}
          {activeTab === 'individuazioni' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Trasmissioni Individuate ({individuazioni.length})</CardTitle>
                  {indTotalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={indPage === 0}
                        onClick={() => setIndPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-gray-500">
                        {indPage + 1} / {indTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={indPage >= indTotalPages - 1}
                        onClick={() => setIndPage(p => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {individuazioni.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nessuna trasmissione individuata.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Canale</TableHead>
                          <TableHead>Opera</TableHead>
                          <TableHead>Episodio</TableHead>
                          <TableHead>Punteggio</TableHead>
                          <TableHead>Stato</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {indPaged.map((ind: any) => (
                          <TableRow key={ind.id}>
                            <TableCell className="whitespace-nowrap">{ind.data_trasmissione || '-'}</TableCell>
                            <TableCell>{ind.canale || ind.emittente || '-'}</TableCell>
                            <TableCell className="font-medium">
                              {ind.opere?.titolo || ind.titolo || '-'}
                            </TableCell>
                            <TableCell>
                              {ind.numero_stagione || ind.numero_episodio
                                ? `S${ind.numero_stagione || '?'}E${ind.numero_episodio || '?'}${ind.titolo_episodio ? ` - ${ind.titolo_episodio}` : ''}`
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={ind.punteggio_matching >= 70 ? 'default' : 'secondary'} className="text-xs">
                                {Math.round(ind.punteggio_matching)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <StatoBadge stato={ind.stato} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab: Ripartizioni (Compensi) */}
          {activeTab === 'ripartizioni' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compensi ({ripartizioni.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {ripartizioni.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nessun compenso registrato.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Campagna</TableHead>
                            <TableHead>Periodo</TableHead>
                            <TableHead className="text-right">Individuazioni</TableHead>
                            <TableHead className="text-right">Importo Lordo</TableHead>
                            <TableHead className="text-right">Trattenute</TableHead>
                            <TableHead className="text-right">Importo Netto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ripartizioni.map((r: any) => {
                            const campagna = r.campagne_ripartizione
                            return (
                              <TableRow key={r.id}>
                                <TableCell className="font-medium">{campagna?.nome || '-'}</TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {campagna?.periodo_riferimento_inizio && campagna?.periodo_riferimento_fine
                                    ? `${campagna.periodo_riferimento_inizio} - ${campagna.periodo_riferimento_fine}`
                                    : '-'}
                                </TableCell>
                                <TableCell className="text-right">{r.numero_individuazioni || 0}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(r.importo_lordo)}
                                </TableCell>
                                <TableCell className="text-right text-red-600">
                                  -{formatCurrency((r.trattenuta_collecting || 0) + (r.altre_trattenute || 0))}
                                </TableCell>
                                <TableCell className="text-right font-bold text-green-700">
                                  {formatCurrency(r.importo_netto)}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          {/* Totale */}
                          <TableRow className="border-t-2 font-bold">
                            <TableCell colSpan={3}>Totale</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(ripartizioni.reduce((s: number, r: any) => s + (r.importo_lordo || 0), 0))}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              -{formatCurrency(ripartizioni.reduce((s: number, r: any) => s + (r.trattenuta_collecting || 0) + (r.altre_trattenute || 0), 0))}
                            </TableCell>
                            <TableCell className="text-right text-green-700">
                              {formatCurrency(ripartizioni.reduce((s: number, r: any) => s + (r.importo_netto || 0), 0))}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: any }) {
  if (!value) return null
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

function StatoBadge({ stato }: { stato: string }) {
  const colors: Record<string, string> = {
    individuato: 'bg-yellow-100 text-yellow-800',
    validato: 'bg-green-100 text-green-800',
    respinto: 'bg-red-100 text-red-800',
    dubbioso: 'bg-orange-100 text-orange-800',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[stato] || 'bg-gray-100 text-gray-800'}`}>
      {stato}
    </span>
  )
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '-'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount)
}
