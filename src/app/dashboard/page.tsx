'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Users, FileText, Calendar, TrendingUp, Euro, Activity, Search, Download, Database, Loader2 } from 'lucide-react'
import { useExportProcess } from '@/shared/contexts/export-process-context'
import { getFullDatabaseExport, formatFullDatabaseExport } from '@/features/report/services/report-export.service'
import {
  createSupabaseDashboardDataDeps,
  loadDashboardRpcData,
  loadDashboardHealthData,
  loadDashboardPrimaryData,
  loadDashboardSecondaryData,
  type AttivitaItem,
  type DashboardStats,
  type Metric,
  type StatsAggiuntive,
} from '@/features/dashboard/services/dashboard-data.service'

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
  const { startExport, state: exportState } = useExportProcess()
  const isExporting = exportState.status === 'exporting'

  const handleExportFull = async () => {
    await startExport(
      'full-database-export',
      'Banca Dati Completa',
      'xlsx',
      async (onProgress, signal) => {
        const { data, error } = await getFullDatabaseExport((progress) => {
          onProgress({ fetched: progress.fetched, total: progress.total, percentage: progress.percentage, phase: progress.phase, estimatedTimeRemaining: progress.estimatedTimeRemaining })
        }, signal)

        if (signal.aborted) throw new Error('Export cancelled')
        if (error) throw error
        if (!data || data.length === 0) throw new Error('Nessun dato da esportare')

        onProgress({ fetched: data.length, total: data.length, percentage: 90, phase: 'formatting' })
        const formattedData = formatFullDatabaseExport(data)

        if (signal.aborted) throw new Error('Export cancelled')

        onProgress({ fetched: data.length, total: data.length, percentage: 95, phase: 'generating' })
        const XLSX = await import('xlsx')
        const worksheet = XLSX.utils.json_to_sheet(formattedData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Banca Dati')

        const maxWidth = 50
        const colWidths = Object.keys(formattedData[0] || {}).map(key => ({
          wch: Math.min(maxWidth, Math.max(key.length, ...formattedData.slice(0, 100).map(row => String(row[key as keyof typeof row] || '').length)))
        }))
        worksheet['!cols'] = colWidths

        onProgress({ fetched: data.length, total: data.length, percentage: 100, phase: 'done' })
        XLSX.writeFile(workbook, `banca_dati_completa_${new Date().toISOString().split('T')[0]}.xlsx`, { bookType: 'xlsx' })
      }
    )
  }
  const [totalArtisti, setTotalArtisti] = useState(0)
  const [totalOpere, setTotalOpere] = useState(0)
  const [artistiMetrics, setArtistiMetrics] = useState<Metric[]>([])
  const [opereMetrics, setOpereMetrics] = useState<Metric[]>([])
  const [artistiIncompleti, setArtistiIncompleti] = useState(0)
  const [opereIncomplete, setOpereIncomplete] = useState(0)
  const [healthLoading, setHealthLoading] = useState(true)
  const [attivitaRecenti, setAttivitaRecenti] = useState<AttivitaItem[]>([])
  const [statsAggiuntive, setStatsAggiuntive] = useState<StatsAggiuntive>({
    individuazioni: 0,
    partecipazioni: 0,
    campagneRipartizione: 0,
    ultimoDato: null,
  })

  useEffect(() => {
    let cancelled = false

    const fetchStats = async () => {
      const deps = createSupabaseDashboardDataDeps(supabase as any)
      const now = new Date()
      const range = {
        firstDay: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        lastDay: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
      }

      try {
        try {
          const snapshot = await loadDashboardRpcData(supabase as any, range)
          if (cancelled) return

          setStats(snapshot.primary.stats)
          setTotalArtisti(snapshot.primary.totalArtisti)
          setTotalOpere(snapshot.primary.totalOpere)
          setAttivitaRecenti(snapshot.secondary.attivitaRecenti)
          setStatsAggiuntive(snapshot.secondary.statsAggiuntive)
          setArtistiIncompleti(snapshot.health.artistiIncompleti)
          setOpereIncomplete(snapshot.health.opereIncomplete)
          setArtistiMetrics(snapshot.health.artistiMetrics)
          setOpereMetrics(snapshot.health.opereMetrics)
          setLoading(false)
          setHealthLoading(false)
          return
        } catch (rpcError) {
          console.warn('Dashboard metrics RPC unavailable, falling back to client loaders:', rpcError)
        }

        const primary = await loadDashboardPrimaryData(deps, range)
        if (cancelled) return

        setStats(primary.stats)
        setTotalArtisti(primary.totalArtisti)
        setTotalOpere(primary.totalOpere)
        setLoading(false)

        void loadDashboardSecondaryData(deps, primary)
          .then(secondary => {
            if (cancelled) return
            setAttivitaRecenti(secondary.attivitaRecenti)
            setStatsAggiuntive(secondary.statsAggiuntive)
          })
          .catch(error => console.error('Error fetching secondary dashboard stats:', error))

        void loadDashboardHealthData(deps, primary)
          .then(health => {
            if (cancelled) return
            setArtistiIncompleti(health.artistiIncompleti)
            setOpereIncomplete(health.opereIncomplete)
            setArtistiMetrics(health.artistiMetrics)
            setOpereMetrics(health.opereMetrics)
          })
          .catch(error => console.error('Error fetching dashboard health:', error))
          .finally(() => {
            if (!cancelled) setHealthLoading(false)
          })
      } catch (error) {
        console.error('Error fetching stats:', error)
        if (!cancelled) {
          setLoading(false)
          setHealthLoading(false)
        }
      }
    }

    void fetchStats()

    return () => {
      cancelled = true
    }
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
                      <div className={`${iconBg} p-2 rounded-full shrink-0`}>
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

      {/* Export Banca Dati */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Esportazione Banca Dati
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Export unificato XLSX: opera + episodio + artista + ruolo. Una riga per partecipazione.
              </CardDescription>
            </div>
            <Badge variant="secondary">XLSX</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleExportFull}
            disabled={isExporting || loading}
            className="w-full sm:w-auto"
          >
            {isExporting && exportState.campagnaId === 'full-database-export' ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Esportazione in corso...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" />Esporta Banca Dati Completa</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Data Health */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">Data Health</CardTitle>
            {healthLoading && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Caricamento
              </Badge>
            )}
          </div>
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
