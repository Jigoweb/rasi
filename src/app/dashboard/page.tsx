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

type Metric = { label: string; missing: number; total: number }

function percentComplete(m: Metric): number {
  if (!m.total) return 0
  const v = Math.max(0, m.total - m.missing)
  return Math.floor((v / m.total) * 100)
}

function missingPercentLabel(m: Metric): string {
  if (!m.total) return '0%'
  const p = (m.missing / m.total) * 100
  if (p > 0 && p < 1) return `${p.toFixed(1)}%`
  return `${Math.round(p)}%`
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch dashboard statistics in parallel for better performance
        const [artistiResult, opereResult, episodiResult, filmResult, serieResult, programmazioniResult, campangeResult] = await Promise.all([
          supabase
            .from('artisti')
            .select('id', { count: 'exact', head: true })
            .eq('stato', 'attivo'),
          supabase
            .from('opere')
            .select('id', { count: 'exact', head: true }),
          supabase
            .from('episodi')
            .select('id', { count: 'exact', head: true }),
          supabase
            .from('opere')
            .select('id', { count: 'exact', head: true })
            .eq('tipo', 'film'),
          supabase
            .from('opere')
            .select('id', { count: 'exact', head: true })
            .eq('tipo', 'serie_tv'),
          // Mock programmazioni result as table is deprecated
          Promise.resolve({ count: 0, error: null }),
          /*
          supabase
            .from('programmazioni')
            .select('id', { count: 'exact', head: true })
            .gte('data_trasmissione', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          */
          supabase
            .from('campagne_individuazione')
            .select('id', { count: 'exact', head: true })
            .eq('stato', 'in_corso')
        ])

        // Use count results for better performance
        setStats({
          artisti_attivi: artistiResult.count || 0,
          opere_totali: opereResult.count || 0,
          episodi_totali: episodiResult.count || 0,
          opere_film: filmResult.count || 0,
          opere_serie_tv: serieResult.count || 0,
          programmazioni_mese: programmazioniResult.count || 0,
          campagne_attive: campangeResult.count || 0,
          importo_distribuito: 125000,
          tasso_matching: 94.2
        })

        const ta = artistiResult.count || 0
        const to = opereResult.count || 0
        setTotalArtisti(ta)
        setTotalOpere(to)

        const [aCodiceIpn, aNome, aCognome, aStato, aNconst, aNascita, aCf] = await Promise.all([
          supabase.from('artisti').select('id').or('codice_ipn.is.null,codice_ipn.eq.'),
          supabase.from('artisti').select('id').or('nome.is.null,nome.eq.'),
          supabase.from('artisti').select('id').or('cognome.is.null,cognome.eq.'),
          supabase.from('artisti').select('id').or('stato.is.null,stato.eq.'),
          supabase.from('artisti').select('id').or('imdb_nconst.is.null,imdb_nconst.eq.'),
          supabase.from('artisti').select('id').is('data_nascita', null),
          supabase.from('artisti').select('id').or('codice_fiscale.is.null,codice_fiscale.eq.'),
        ])
        const artistiSet = new Set<string>()
        ;[aCodiceIpn, aNome, aCognome, aStato, aNconst, aNascita, aCf].forEach((r) => {
          (r.data || []).forEach((row: any) => artistiSet.add(row.id))
        })
        setArtistiIncompleti(artistiSet.size)

        const [oTitolo, oTipo, oAnno, oTconst, oOrig] = await Promise.all([
          supabase.from('opere').select('id').or('titolo.is.null,titolo.eq.'),
          supabase.from('opere').select('id').or('tipo.is.null,tipo.eq.'),
          supabase.from('opere').select('id').is('anno_produzione', null),
          supabase.from('opere').select('id').or('imdb_tconst.is.null,imdb_tconst.eq.'),
          supabase.from('opere').select('id').or('titolo_originale.is.null,titolo_originale.eq.'),
        ])
        const opereSet = new Set<string>()
        ;[oTitolo, oTipo, oAnno, oTconst, oOrig].forEach((r) => {
          (r.data || []).forEach((row: any) => opereSet.add(row.id))
        })
        setOpereIncomplete(opereSet.size)

        const artistsMissing = await Promise.all([
          supabase.from('artisti').select('id', { count: 'exact', head: true }).or('codice_ipn.is.null,codice_ipn.eq.').then(r => r.count || 0),
          supabase.from('artisti').select('id', { count: 'exact', head: true }).or('nome.is.null,nome.eq.').then(r => r.count || 0),
          supabase.from('artisti').select('id', { count: 'exact', head: true }).or('cognome.is.null,cognome.eq.').then(r => r.count || 0),
          supabase.from('artisti').select('id', { count: 'exact', head: true }).or('stato.is.null,stato.eq.').then(r => r.count || 0),
          supabase.from('artisti').select('id', { count: 'exact', head: true }).or('imdb_nconst.is.null,imdb_nconst.eq.').then(r => r.count || 0),
          supabase.from('artisti').select('id', { count: 'exact', head: true }).is('data_nascita', null).then(r => r.count || 0),
          supabase.from('artisti').select('id', { count: 'exact', head: true }).or('codice_fiscale.is.null,codice_fiscale.eq.').then(r => r.count || 0),
        ])

        const opereMissing = await Promise.all([
          supabase.from('opere').select('id', { count: 'exact', head: true }).or('titolo.is.null,titolo.eq.').then(r => r.count || 0),
          supabase.from('opere').select('id', { count: 'exact', head: true }).or('tipo.is.null,tipo.eq.').then(r => r.count || 0),
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

  const statCards = [
    {
      title: 'Artisti Attivi',
      value: stats?.artisti_attivi || 0,
      icon: Users,
      description: 'Artisti con stato attivo',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Opere Catalogate',
      value: ((stats?.opere_totali || 0) + (stats?.episodi_totali || 0)).toLocaleString(),
      icon: FileText,
      description: `di cui ${(stats?.opere_film || 0).toLocaleString()} film, ${(stats?.opere_serie_tv || 0).toLocaleString()} serie-tv, ${(stats?.episodi_totali || 0).toLocaleString()} episodi`,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Programmazioni Mese',
      value: stats?.programmazioni_mese || 0,
      icon: Calendar,
      description: 'Trasmissioni questo mese',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Report Attivi',
      value: stats?.campagne_attive || 0,
      icon: Search,
      description: 'Report in corso',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Importo Distribuito',
      value: `€${(stats?.importo_distribuito || 0).toLocaleString()}`,
      icon: Euro,
      description: 'Totale anno corrente',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Tasso Matching',
      value: `${stats?.tasso_matching || 0}%`,
      icon: TrendingUp,
      description: 'Accuratezza individuazioni',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
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

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Attività Recenti</CardTitle>
            <CardDescription className="text-sm">
              Ultime operazioni nel sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Nuovo artista registrato</p>
                  <p className="text-xs text-gray-500">Marco Rossi - 2 ore fa</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
                  <Activity className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Campagna completata</p>
                  <p className="text-xs text-gray-500">Individuazione Q4 2024 - 5 ore fa</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <div className="bg-purple-100 p-2 rounded-full flex-shrink-0">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Nuova opera catalogata</p>
                  <p className="text-xs text-gray-500">Il Commissario Montalbano - 1 giorno fa</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Statistiche Sistema</CardTitle>
            <CardDescription className="text-sm">
              Metriche di performance
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uptime Sistema</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">99.9%</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database Records</span>
                <span className="text-sm text-gray-600 font-mono">
                  {((stats?.artisti_attivi || 0) + (stats?.opere_totali || 0)).toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Response Time</span>
                <span className="text-sm text-gray-600 font-mono">~150ms</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ultimo Backup</span>
                <span className="text-sm text-gray-600">2 ore fa</span>
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
                <p className="text-2xl font-bold">{artistiIncompleti}</p>
                <span className="text-xs text-gray-500">di {totalArtisti}</span>
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-white">
              <p className="text-sm font-medium text-gray-600">Opere incomplete</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{opereIncomplete}</p>
                <span className="text-xs text-gray-500">di {totalOpere}</span>
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-white">
              <p className="text-sm font-medium text-gray-600">Completamento complessivo</p>
              <p className="text-2xl font-bold">
                {(() => {
                  const all = [...artistiMetrics, ...opereMetrics]
                  const totals = all.reduce((acc, m) => acc + m.total, 0)
                  const miss = all.reduce((acc, m) => acc + m.missing, 0)
                  if (!totals) return 0
                  return Math.round(((totals - miss) / totals) * 100)
                })()}%
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
                    <div className="mt-1 text-xs text-gray-500">Coperti: {Math.max(0, m.total - m.missing)} / {m.total}</div>
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
                    <div className="mt-1 text-xs text-gray-500">Coperti: {Math.max(0, m.total - m.missing)} / {m.total}</div>
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
