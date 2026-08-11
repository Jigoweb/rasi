'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useExportProcess } from '@/shared/contexts/export-process-context'
import { getFullDatabaseExport, formatFullDatabaseExport } from '@/features/report/services/report-export.service'
import { DashboardActivityFeed } from '@/features/dashboard/components/DashboardActivityFeed'
import { DashboardAttentionQueue } from '@/features/dashboard/components/DashboardAttentionQueue'
import { DashboardDataHealthCard } from '@/features/dashboard/components/DashboardDataHealthCard'
import { DashboardExportFooter } from '@/features/dashboard/components/DashboardExportFooter'
import { DashboardKpiStrip } from '@/features/dashboard/components/DashboardKpiStrip'
import type { AttentionItem } from '@/features/dashboard/components/dashboard-home.types'
import { countMetricsByImpact } from '@/features/dashboard/services/catalog-health-impact'
import {
  createSupabaseAttentionDeps,
  loadAttentionQueue,
} from '@/features/dashboard/services/dashboard-attention.service'
import {
  createSupabaseDashboardDataDeps,
  loadDashboardHealthData,
  loadDashboardPrimaryData,
  loadDashboardRpcData,
  loadDashboardSecondaryData,
  type AttivitaItem,
  type DashboardStats,
  type Metric,
} from '@/features/dashboard/services/dashboard-data.service'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [totalArtisti, setTotalArtisti] = useState(0)
  const [totalOpere, setTotalOpere] = useState(0)
  const [artistiMetrics, setArtistiMetrics] = useState<Metric[]>([])
  const [opereMetrics, setOpereMetrics] = useState<Metric[]>([])
  const [artistiIncompleti, setArtistiIncompleti] = useState(0)
  const [opereIncomplete, setOpereIncomplete] = useState(0)
  const [healthLoading, setHealthLoading] = useState(true)
  const [attivitaRecenti, setAttivitaRecenti] = useState<AttivitaItem[]>([])
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([])
  const [attentionLoading, setAttentionLoading] = useState(true)
  const [individuazioniTotal, setIndividuazioniTotal] = useState(0)

  const { startExport, state: exportState } = useExportProcess()
  const isExporting = exportState.status === 'exporting'
  const exportingThis = isExporting && exportState.campagnaId === 'full-database-export'

  const periodoLabel = new Date().toLocaleString('it-IT', { month: 'long', year: 'numeric' })

  const handleExportFull = async () => {
    await startExport(
      'full-database-export',
      'Banca Dati Completa',
      'xlsx',
      async (onProgress, signal) => {
        const { data, error } = await getFullDatabaseExport((progress) => {
          onProgress({
            fetched: progress.fetched,
            total: progress.total,
            percentage: progress.percentage,
            phase: progress.phase,
            estimatedTimeRemaining: progress.estimatedTimeRemaining,
          })
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
          wch: Math.min(
            maxWidth,
            Math.max(
              key.length,
              ...formattedData.slice(0, 100).map(row => String(row[key as keyof typeof row] || '').length)
            )
          ),
        }))
        worksheet['!cols'] = colWidths

        onProgress({ fetched: data.length, total: data.length, percentage: 100, phase: 'done' })
        XLSX.writeFile(
          workbook,
          `banca_dati_completa_${new Date().toISOString().split('T')[0]}.xlsx`,
          { bookType: 'xlsx' }
        )
      }
    )
  }

  useEffect(() => {
    let cancelled = false

    const applyHealth = (health: {
      artistiIncompleti: number
      opereIncomplete: number
      artistiMetrics: Metric[]
      opereMetrics: Metric[]
    }) => {
      setArtistiIncompleti(health.artistiIncompleti)
      setOpereIncomplete(health.opereIncomplete)
      setArtistiMetrics(health.artistiMetrics)
      setOpereMetrics(health.opereMetrics)
      setHealthLoading(false)

      const criticalGaps = countMetricsByImpact(health.opereMetrics, ['critical']).maxMissing
      void loadAttentionQueue(createSupabaseAttentionDeps(supabase as any), {
        criticalOpereGaps: criticalGaps,
      })
        .then(items => {
          if (!cancelled) setAttentionItems(items)
        })
        .catch(error => console.error('Error fetching attention queue:', error))
        .finally(() => {
          if (!cancelled) setAttentionLoading(false)
        })
    }

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
          setIndividuazioniTotal(snapshot.primary.individuazioniTotal)
          setAttivitaRecenti(snapshot.secondary.attivitaRecenti)
          setLoading(false)
          applyHealth(snapshot.health)
          return
        } catch (rpcError) {
          console.warn('Dashboard metrics RPC unavailable, falling back to client loaders:', rpcError)
        }

        const primary = await loadDashboardPrimaryData(deps, range)
        if (cancelled) return

        setStats(primary.stats)
        setTotalArtisti(primary.totalArtisti)
        setTotalOpere(primary.totalOpere)
        setIndividuazioniTotal(primary.individuazioniTotal)
        setLoading(false)

        void loadDashboardSecondaryData(deps, primary)
          .then(secondary => {
            if (cancelled) return
            setAttivitaRecenti(secondary.attivitaRecenti)
          })
          .catch(error => console.error('Error fetching secondary dashboard stats:', error))

        void loadDashboardHealthData(deps, primary)
          .then(health => {
            if (cancelled) return
            applyHealth(health)
          })
          .catch(error => {
            console.error('Error fetching dashboard health:', error)
            if (!cancelled) {
              setHealthLoading(false)
              setAttentionLoading(false)
            }
          })
      } catch (error) {
        console.error('Error fetching stats:', error)
        if (!cancelled) {
          setLoading(false)
          setHealthLoading(false)
          setAttentionLoading(false)
        }
      }
    }

    void fetchStats()

    return () => {
      cancelled = true
    }
  }, [])

  const tassoMatching =
    individuazioniTotal > 0 && stats ? stats.tasso_matching : null

  return (
    <div className="space-y-6 lg:space-y-8 p-4 lg:p-0">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Panoramica operativa</h1>
        <p className="text-gray-600 text-sm lg:text-base capitalize">{periodoLabel}</p>
      </div>

      <DashboardKpiStrip
        loading={loading}
        campagneAttive={stats?.campagne_attive || 0}
        tassoMatching={tassoMatching}
        programmazioniMese={stats?.programmazioni_mese || 0}
        importoDistribuito={stats?.importo_distribuito || 0}
      />

      <DashboardAttentionQueue items={attentionItems} loading={attentionLoading || healthLoading} />

      <DashboardActivityFeed items={attivitaRecenti} loading={loading} />

      <DashboardDataHealthCard
        healthLoading={healthLoading}
        artistiIncompleti={artistiIncompleti}
        opereIncomplete={opereIncomplete}
        totalArtisti={totalArtisti}
        totalOpere={totalOpere}
        artistiMetrics={artistiMetrics}
        opereMetrics={opereMetrics}
      />

      <DashboardExportFooter
        onExport={handleExportFull}
        isExporting={isExporting}
        exportingThis={exportingThis}
      />
    </div>
  )
}
