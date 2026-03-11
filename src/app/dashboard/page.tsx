'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Users, FileText, Calendar, TrendingUp, Euro, Activity, Search } from 'lucide-react'

interface DashboardStats {
  artisti_attivi: number
  opere_totali: number
  episodi_totali: number
  opere_film: number
  opere_serie_tv: number
  programmazioni_mese: number
  campagne_attive: number
  importo_distribuito: number
  tasso_matching: number
}

interface AttivitaItem {
  tipo: 'artista' | 'opera' | 'campagna_individuazione' | 'campagna_programmazione'
  label: string
  dettaglio: string
  timestamp: string
}

interface StatsAggiuntive {
  individuazioni: number
  partecipazioni: number
  campagneRipartizione: number
  ultimoDato: string | null
}

type Metric = { label: string; missing: number; total: number }

function percentComplete(m: Metric): number {
  if (!m.total) return 0
  const v = Math.max(0, m.total - m.missing)
  return Math.floor((v / m.total) * 100)
}

function tempoRelativo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'adesso'
  if (min < 60) return `${min} min fa`
  const ore = Math.floor(min / 60)
  if (ore < 24) return `${ore} or${ore === 1 ? 'a' : 'e'} fa`
  const giorni = Math.floor(ore / 24)
  if (giorni < 30) return `${giorni} giorn${giorni === 1 ? 'o' : 'i'} fa`
  const mesi = Math.floor(giorni / 30)
  return `${mesi} mes${mesi === 1 ? 'e' : 'i'} fa`
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [totalArtisti, setTotalArtisti] = useState(0)
  const [totalOpere, setTotalOpere] = useState(0)
  const [artistiMetrics, setArtistiMetrics] = useState<Metric[]>([])
  const [opereMetrics, setOpereMetrics] = useState<Metric[]>([])
  const [artistiIncompleti, setArtistiIncompleti] = useState(0)
  const [opereIncomplete, setOpereIncomplete] = useState(0)
  const [attivitaRecenti, setAttivitaRecenti] = useState<AttivitaItem[]>([])
  const [statsAggiuntive, setStatsAggiuntive] = useState<StatsAggiuntive>({
    individuazioni: 0,
    partecipazioni: 0,
    campagneRipartizione: 0,
    ultimoDato: null,
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const now = new Date()
        const primoGiornoMese = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString().split('T')[0]
        const ultimoGiornoMese = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString().split('T')[0]

        // ── Contatori principali ────────────────────────────────────────
        const [
          artistiResult, opereResult, episodiResult, filmResult, serieResult,
          programmazioniResult, campangeResult,
        ] = await Promise.all([
          supabase.from('artisti').select('id', { count: 'exact', head: true }).eq('stato', 'attivo'),
          supabase.from('opere').select('id', { count: 'exact', head: true }),
          supabase.from('episodi').select('id', { count: 'exact', head: true }),
          supabase.from('opere').select('id', { count: 'exact', head: true }).eq('tipo', 'film'),
          supabase.from('opere').select('id', { count: 'exact', head: true }).eq('tipo', 'serie_tv'),
          supabase.from('programmazioni')
            .select('id', { count: 'exact', head: true })
            .gte('data_trasmissione', primoGiornoMese)
            .lte('data_trasmissione', ultimoGiornoMese),
          (supabase as any)
            .from('campagne_individuazione')
            .select('id', { count: 'exact', head: true })
            .eq('stato', 'in_corso'),
        ])

        // ── Importo distribuito: somma da campagne_ripartizione ─────────
        const { data: ripartizioniData } = await supabase
          .from('campagne_ripartizione')
          .select('importo_totale_disponibile')
          .eq('stato', 'distribuita')

        const importoDistribuito = (ripartizioniData || []).reduce(
          (acc: number, r: any) => acc + (parseFloat(r.importo_totale_disponibile) || 0), 0
        )

        // ── Tasso matching: (non-respinte / totale) * 100 ───────────────
        const [indTotale, indValide] = await Promise.all([
          (supabase as any).from('individuazioni').select('id', { count: 'exact', head: true }),
          (supabase as any).from('individuazioni').select('id', { count: 'exact', head: true }).neq('stato', 'respinto'),
        ])
        const tassoMatching = indTotale.count
          ? Math.round(((indValide.count || 0) / indTotale.count) * 1000) / 10
          : 0

        setStats({
          artisti_attivi: artistiResult.count || 0,
          opere_totali: opereResult.count || 0,
          episodi_totali: episodiResult.count || 0,
          opere_film: filmResult.count || 0,
          opere_serie_tv: serieResult.count || 0,
          programmazioni_mese: programmazioniResult.count || 0,
          campagne_attive: campangeResult.count || 0,
          importo_distribuito: importoDistribuito,
          tasso_matching: tassoMatching,
        })

        const ta = artistiResult.count || 0
        const to = opereResult.count || 0
        setTotalArtisti(ta)
        setTotalOpere(to)

        // ── Attività Recenti: feed reale dalle 4 tabelle ────────────────
        const [ultArtisti, ultOpere, ultCampagneInd, ultCampagneProg] = await Promise.all([
          supabase.from('artisti')
            .select('nome, cognome, created_at')
            .order('created_at', { ascending: false })
            .limit(3),
          supabase.from('opere')
            .select('titolo, created_at')
            .order('created_at', { ascending: false })
            .limit(3),
          supabase.from('campagne_individuazione')
            .select('nome, updated_at, stato')
            .eq('stato', 'completata')
            .order('updated_at', { ascending: false })
            .limit(3),
          (supabase as any).from('campagne_programmazione')
            .select('nome, created_at')
            .order('created_at', { ascending: false })
            .limit(3),
        ])

        const feed: AttivitaItem[] = [
          ...(ultArtisti.data || []).map((a: any) => ({
            tipo: 'artista' as const,
            label: 'Nuovo artista registrato',
            dettaglio: `${a.nome} ${a.cognome}`,
            timestamp: a.created_at,
          })),
          ...(ultOpere.data || []).map((o: any) => ({
            tipo: 'opera' as const,
            label: 'Nuova opera catalogata',
            dettaglio: o.titolo,
            timestamp: o.created_at,
          })),
          ...(ultCampagneInd.data || []).map((c: any) => ({
            tipo: 'campagna_individuazione' as const,
            label: 'Campagna completata',
            dettaglio: c.nome,
            timestamp: c.updated_at,
          })),
          ...(ultCampagneProg.data || []).map((c: any) => ({
            tipo: 'campagna_programmazione' as const,
            label: 'Nuova campagna programmazione',
            dettaglio: c.nome,
            timestamp: c.created_at,
          })),
        ]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5)

        setAttivitaRecenti(feed)

        // ── Statistiche sistema: metriche DB reali ──────────────────────
        const [indCount, partCount, ripCount, ultimaDat] = await Promise.all([
          (supabase as any).from('individuazioni').select('id', { count: 'exact', head: true }),
          supabase.from('partecipazioni').select('id', { count: 'exact', head: true }),
          supabase.from('campagne_ripartizione').select('id', { count: 'exact', head: true }),
          supabase.from('programmazioni')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1),
        ])

        setStatsAggiuntive({
          individuazioni: indCount.count || 0,
          partecipazioni: partCount.count || 0,
          campagneRipartizione: ripCount.count || 0,
          ultimoDato: ultimaDat.data?.[0]?.created_at || null,
        })

        // ── Data Health ─────────────────────────────────────────────────
        const [aCodiceIpn, aNome, aCognome, aStato, aNconst, aNascita, aCf] = await Promise.all([
          supabase.from('artisti').select('id').or('codice_ipn.is.null,codice_ipn.eq.'),
          supabase.from('artisti').select('id').or('nome.is.null,nome.eq.'),
          supabase.from('artisti').select('id').or('cognome.is.null,cognome.eq.'),
          supabase.from('artisti').select('id').is('stato', null),
          supabase.from('artisti').select('id').or('imdb_nconst.is.null,imdb_nconst.eq.'),
          supabase.from('artisti').select('id').is('data_nascita', null),
          supabase.from('artisti').select('id').or('codice_fiscale.is.null,codice_fiscale.eq.'),
        ])
        const artistiSet = new Set<string>()
        ;[aCodiceIpn, aNome, aCognome, aStato, aNconst, aNascita, aCf].forEach((r) => {
          ;(r.data || []).forEach((row: any) => artistiSet.add(row.id))
        })
        setArtistiIncompleti(artistiSet.size)

        const [oTitolo, oTipo, oAnno, oTconst, oOrig] = await Promise.all([
          supabase.from('opere').select('id').or('titolo.is.null,titolo.eq.'),
          supabase.from('opere').select('id').is('tipo', null),
          supabase.from('opere').select('id').is('anno_produzione', null),
          supabase.from('opere').select('id').or('imdb_tconst.is.null,imdb_tconst.eq.'),
          supabase.from('opere').select('id').or('titolo_originale.is.null,titolo_originale.eq.'),
        ])
        const opereSet = new Set<string>()
        ;[oTitolo, oTipo, oAnno, oTconst, oOrig].forEach((r) => {
          ;(r.data || []).forEach((row: any) => opereSet.add(row.id))
        })
        setOpereIncomplete(opereSet.size)

        const artistsMissing = await Promise.all([
          supabase.from('artisti').select('id', { count: 'exact', head: true }).or('codice_ipn.is.null,codice_ipn.eq.').then(r => r.count || 0),
          supabase.from('artisti').select('id', { count: 'exact', head: true }).or('nome.is.null,nome.eq.').then(r => r.count || 0),
          supabase.from('artisti').select('id', { count: 'exact', head: true }).or('cognome.is.null,cognome.eq.').then(r => r.count || 0),
          supabase.from('artisti').select('id', { count: 'exact', head: true }).is('stato', null).then(r => r.count || 0),
          supabase.from('artisti').select('id', { count: 'exact', head: true }).or('imdb_nconst.is.null,imdb_nconst.eq.').then(r => r.count || 0),
          supabase.from('artisti').select('id', { count: 'exact', head: true }).is('data_nascita', null).then(r => r.count || 0),
          supabase.from('artisti').select('id', { count: 'exact', head: true }).or('codice_fiscale.is.null,codice_fiscale.eq.').then(r => r.count || 0),
        ])

        const opereMissing = await Promise.all([
          supabase.from('opere').select('id', { count: 'exact', head: true }).or('titolo.is.null,titolo.eq.').then(r => r.count || 0),
          supabase.from('opere').select('id', { count: 'exact', head: true }).is('tipo', null).then(r => r.count || 0),
          supabase.from('opere').select('id', { count: 'exact', head: true }).is('anno_produzione', null).then(r => r.count || 0),
          supabase.from('opere').select('id', { count: 'exact', head: true }).or('imdb_tconst.is.null,imdb_tconst.eq.').then(r => r.count || 0),
          supabase.from('opere').select('id', { count: 'exact', head: true }).or('titolo_originale.is.null,titolo_originale.eq.').then(r => r.count || 0),
        ])

        setArtistiMetrics([
          { label: 'Codice IPN', missing: artistsMissing[0], total: ta },
          { label: 'Nome', missing: artistsMissing[1], total: ta },
          { label: 'Cognome', missing: artistsMissing[2], total: ta },
          { label: 'Stato', missing: artistsMissing[3], total: ta },
          { label: 'IMDB nconst', missing: artistsMissing[4], total: ta },
          { label: 'Data nascita', missing: artistsMissing[5], total: ta },
          { label: 'Codice fiscale', missing: artistsMissing[6], total: ta },
        ])

        setOpereMetrics([
          { label: 'Titolo', missing: opereMissing[0], total: to },
          { label: 'Tipo', missing: opereMissing[1], total: to },
          { label: 'Anno produzione', missing: opereMissing[2], total: to },
          { label: 'IMDB tconst', missing: opereMissing[3], total: to },
          { label: 'Titolo originale', missing: opereMissing[4], total: to },
        ])
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const attivitaConfig: Record<AttivitaItem['tipo'], {
    Icon: React.ElementType
    bg: string
    iconBg: string
    iconColor: string
  }> = {
    artista: { Icon: Users, bg: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    opera: { Icon: FileText, bg: 'bg-purple-50', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
    campagna_individuazione: { Icon: Activity, bg: 'bg-green-50', iconBg: 'bg-green-100', iconColor: 'text-green-600' },
    campagna_programmazione: { Icon: Calendar, bg: 'bg-orange-50', iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
  }

  const statCards = [
    {
      title: 'Artisti Attivi',
      value: (stats?.artisti_attivi || 0).toLocaleString('it-IT'),
      icon: Users,
      description: 'Artisti con stato attivo',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Opere Catalogate',
      value: ((stats?.opere_totali || 0) + (stats?.episodi_totali || 0)).toLocaleString('it-IT'),
      icon: FileText,
      description: `${(stats?.opere_film || 0).toLocaleString('it-IT')} film · ${(stats?.opere_serie_tv || 0).toLocaleString('it-IT')} serie · ${(stats?.episodi_totali || 0).toLocaleString('it-IT')} episodi`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Programmazioni Mese',
      value: (stats?.programmazioni_mese || 0).toLocaleString('it-IT'),
      icon: Calendar,
      description: `Trasmissioni ${new Date().toLocaleString('it-IT', { month: 'long', year: 'numeric' })}`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Report Attivi',
      value: (stats?.campagne_attive || 0).toLocaleString('it-IT'),
      icon: Search,
      description: 'Campagne individuazione in corso',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Importo Distribuito',
      value: `€${(stats?.importo_distribuito || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Euro,
      description: 'Totale campagne con stato distribuita',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Tasso Matching',
      value: indTotaleZero(stats) ? '—' : `${stats?.tasso_matching || 0}%`,
      icon: TrendingUp,
      description: 'Individuazioni non respinte su totale',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-600">Panoramica generale del sistema RASI</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 lg:space-y-8 p-4 lg:p-0">
      {/* Header */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-600 text-sm lg:text-base">Panoramica generale del sistema RASI</p>
          <div className="mt-2 flex gap-2 lg:hidden">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Sistema Operativo</Badge>
          </div>
        </div>
        <div className="hidden lg:flex gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Sistema Operativo</Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-xl lg:text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attività Recenti + Statistiche Sistema */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">

        {/* Attività Recenti — feed reale */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Attività Recenti</CardTitle>
            <CardDescription className="text-sm">Ultime operazioni nel sistema</CardDescription>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            {attivitaRecenti.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nessuna attività recente</p>
            ) : (
              <div className="space-y-3">
                {attivitaRecenti.map((item, i) => {
                  const { Icon, bg, iconBg, iconColor } = attivitaConfig[item.tipo]
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 ${bg} rounded-lg`}>
                      <div className={`${iconBg} p-2 rounded-full flex-shrink-0`}>
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.label}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {item.dettaglio} · {tempoRelativo(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistiche Sistema — metriche DB reali */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Statistiche Sistema</CardTitle>
            <CardDescription className="text-sm">Metriche database in tempo reale</CardDescription>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Individuazioni totali</span>
                <span className="text-sm text-gray-700 font-mono font-semibold">
                  {statsAggiuntive.individuazioni.toLocaleString('it-IT')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Partecipazioni registrate</span>
                <span className="text-sm text-gray-700 font-mono font-semibold">
                  {statsAggiuntive.partecipazioni.toLocaleString('it-IT')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Campagne ripartizione</span>
                <span className="text-sm text-gray-700 font-mono font-semibold">
                  {statsAggiuntive.campagneRipartizione.toLocaleString('it-IT')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Record totali DB</span>
                <span className="text-sm text-gray-700 font-mono font-semibold">
                  {(
                    (stats?.artisti_attivi || 0) +
                    (stats?.opere_totali || 0) +
                    (stats?.episodi_totali || 0) +
                    statsAggiuntive.individuazioni +
                    statsAggiuntive.partecipazioni
                  ).toLocaleString('it-IT')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ultimo dato caricato</span>
                <span className="text-sm text-gray-500">
                  {statsAggiuntive.ultimoDato
                    ? tempoRelativo(statsAggiuntive.ultimoDato)
                    : '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Health */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Data Health</CardTitle>
          <CardDescription className="text-sm">Completamento complessivo e campi mancanti</CardDescription>
        </CardHeader>
        <CardContent className="p-4 lg:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-white">
              <p className="text-sm font-medium text-gray-600">Artisti incompleti</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{artistiIncompleti.toLocaleString('it-IT')}</p>
                <span className="text-xs text-gray-500">di {totalArtisti.toLocaleString('it-IT')}</span>
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-white">
              <p className="text-sm font-medium text-gray-600">Opere incomplete</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{opereIncomplete.toLocaleString('it-IT')}</p>
                <span className="text-xs text-gray-500">di {totalOpere.toLocaleString('it-IT')}</span>
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-white">
              <p className="text-sm font-medium text-gray-600">Completamento complessivo</p>
              <p className="text-2xl font-bold">
                {(() => {
                  const all = [...artistiMetrics, ...opereMetrics]
                  const totals = all.reduce((acc, m) => acc + m.total, 0)
                  const miss = all.reduce((acc, m) => acc + m.missing, 0)
                  if (!totals) return '—'
                  return `${Math.round(((totals - miss) / totals) * 100)}%`
                })()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Artisti</h3>
              <div className="space-y-3">
                {artistiMetrics.map((m, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{m.label}</span>
                      <Badge variant="outline" className="mb-1">{percentComplete(m)}%</Badge>
                    </div>
                    <div className="h-2 bg-gray-200 rounded">
                      <div className="h-2 bg-blue-600 rounded" style={{ width: `${percentComplete(m)}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Coperti: {Math.max(0, m.total - m.missing).toLocaleString('it-IT')} / {m.total.toLocaleString('it-IT')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">Opere</h3>
              <div className="space-y-3">
                {opereMetrics.map((m, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{m.label}</span>
                      <Badge variant="outline" className="mb-1">{percentComplete(m)}%</Badge>
                    </div>
                    <div className="h-2 bg-gray-200 rounded">
                      <div className="h-2 bg-purple-600 rounded" style={{ width: `${percentComplete(m)}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Coperti: {Math.max(0, m.total - m.missing).toLocaleString('it-IT')} / {m.total.toLocaleString('it-IT')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function indTotaleZero(stats: DashboardStats | null): boolean {
  return !stats || stats.tasso_matching === 0
}
