'use client'

import { useEffect, useState, type ReactNode } from 'react'
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
import {
  Loader2,
  User,
  Film,
  Radio,
  Banknote,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { ProfiloDatiTab } from './components/profilo-dati-tab'

type TabId = 'profilo' | 'repertorio' | 'individuazioni' | 'ripartizioni'

function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <div className="rounded-full bg-gray-100 p-3">
        <Icon className="h-6 w-6 text-gray-400" aria-hidden />
      </div>
      <p className="text-sm text-gray-500 max-w-sm">{message}</p>
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

  const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [
    { id: 'profilo', label: 'Dati Personali', icon: User },
    { id: 'repertorio', label: 'Repertorio', icon: Film },
    { id: 'individuazioni', label: 'Trasmissioni', icon: Radio },
    { id: 'ripartizioni', label: 'Compensi', icon: Banknote },
  ]

  const indPaged = individuazioni.slice(indPage * IND_PAGE_SIZE, (indPage + 1) * IND_PAGE_SIZE)
  const indTotalPages = Math.ceil(individuazioni.length / IND_PAGE_SIZE)

  let tabBody: ReactNode = null

  if (loadingTab) {
    tabBody = (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  } else if (activeTab === 'profilo') {
    tabBody = (
      <ProfiloDatiTab
        artista={artista}
        onArtistaUpdated={(updated) => setArtista(updated)}
      />
    )
  } else if (activeTab === 'repertorio') {
    tabBody = (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Opere e partecipazioni ({partecipazioni.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {partecipazioni.length === 0 ? (
            <EmptyState
              icon={Film}
              message="Nessuna partecipazione registrata nel tuo repertorio."
            />
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
                    <TableHead>Note</TableHead>
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
                      <TableCell className="max-w-[200px] truncate text-gray-600">
                        {p.note || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    )
  } else if (activeTab === 'individuazioni') {
    tabBody = (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">
              Trasmissioni individuate ({individuazioni.length})
            </CardTitle>
            {indTotalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={indPage === 0}
                  onClick={() => setIndPage((p) => p - 1)}
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
                  onClick={() => setIndPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {individuazioni.length === 0 ? (
            <EmptyState
              icon={Radio}
              message="Nessuna trasmissione individuata per il tuo repertorio."
            />
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
    )
  } else if (activeTab === 'ripartizioni') {
    tabBody = (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compensi ({ripartizioni.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {ripartizioni.length === 0 ? (
            <EmptyState
              icon={Banknote}
              message="Nessun compenso registrato al momento."
            />
          ) : (
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
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Area personale
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {artista.nome} {artista.cognome}
        </h1>
        {artista.nome_arte && (
          <p className="text-base text-gray-500">({artista.nome_arte})</p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
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
      </header>

      <div className="border-b -mx-1 px-1">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
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
      </div>

      {tabBody}
    </div>
  )
}
