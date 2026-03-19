'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Download, Database, Film, Users, Loader2, FileSpreadsheet } from 'lucide-react'
import { useExportProcess } from '@/shared/contexts/export-process-context'
import { getFullDatabaseExport, formatFullDatabaseExport } from '@/features/report/services/report-export.service'
import { supabase } from '@/shared/lib/supabase-client'
import * as XLSX from 'xlsx'

interface ExportStats {
  opere: number
  episodi: number
  partecipazioni: number
  artisti: number
}

export default function ReportPage() {
  const [stats, setStats] = useState<ExportStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const { startExport, state: exportState } = useExportProcess()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const [opereRes, episodiRes, partRes, artistiRes] = await Promise.all([
        supabase.from('opere').select('*', { count: 'exact', head: true }),
        supabase.from('episodi').select('*', { count: 'exact', head: true }),
        supabase.from('partecipazioni').select('*', { count: 'exact', head: true }),
        supabase.from('artisti').select('*', { count: 'exact', head: true }).eq('stato', 'attivo'),
      ])
      setStats({
        opere: opereRes.count ?? 0,
        episodi: episodiRes.count ?? 0,
        partecipazioni: partRes.count ?? 0,
        artisti: artistiRes.count ?? 0,
      })
    } catch (e) {
      console.error('Error fetching stats:', e)
    } finally {
      setLoadingStats(false)
    }
  }

  const isExporting = exportState.status === 'exporting'

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
            estimatedTimeRemaining: progress.estimatedTimeRemaining
          })
        }, signal)

        if (signal.aborted) throw new Error('Export cancelled')
        if (error) throw error
        if (!data || data.length === 0) throw new Error('Nessun dato da esportare')

        onProgress({ fetched: data.length, total: data.length, percentage: 90, phase: 'formatting' })
        const formattedData = formatFullDatabaseExport(data)

        if (signal.aborted) throw new Error('Export cancelled')

        onProgress({ fetched: data.length, total: data.length, percentage: 95, phase: 'generating' })
        const worksheet = XLSX.utils.json_to_sheet(formattedData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Banca Dati')

        const maxWidth = 50
        const colWidths = Object.keys(formattedData[0] || {}).map(key => ({
          wch: Math.min(maxWidth, Math.max(key.length,
            ...formattedData.slice(0, 100).map(row => String(row[key as keyof typeof row] || '').length)
          ))
        }))
        worksheet['!cols'] = colWidths

        onProgress({ fetched: data.length, total: data.length, percentage: 100, phase: 'done' })
        XLSX.writeFile(workbook, `banca_dati_completa_${new Date().toISOString().split('T')[0]}.xlsx`, { bookType: 'xlsx' })
      }
    )
  }


  return (
    <div className="space-y-6 lg:space-y-8 p-4 lg:p-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Esportazioni</h1>
        <p className="text-muted-foreground text-sm lg:text-base">
          Esporta i dati della banca dati in formato Excel
        </p>
      </div>

      {/* Stats riepilogo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Opere</span>
            </div>
            <div className="text-xl font-bold mt-1">
              {loadingStats ? <Loader2 className="h-4 w-4 animate-spin" /> : stats?.opere.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Episodi</span>
            </div>
            <div className="text-xl font-bold mt-1">
              {loadingStats ? <Loader2 className="h-4 w-4 animate-spin" /> : stats?.episodi.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Artisti attivi</span>
            </div>
            <div className="text-xl font-bold mt-1">
              {loadingStats ? <Loader2 className="h-4 w-4 animate-spin" /> : stats?.artisti.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Partecipazioni</span>
            </div>
            <div className="text-xl font-bold mt-1">
              {loadingStats ? <Loader2 className="h-4 w-4 animate-spin" /> : stats?.partecipazioni.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Banca Dati Completa */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Banca Dati Completa
                </CardTitle>
                <CardDescription className="mt-2">
                  Export unificato: opera + episodio + artista + ruolo.
                  Una riga per ogni partecipazione registrata a sistema.
                </CardDescription>
              </div>
              <Badge variant="secondary">XLSX</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Righe stimate:</span>
                <span className="font-medium text-foreground">
                  ~{stats?.partecipazioni.toLocaleString() || '...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Colonne:</span>
                <span className="font-medium text-foreground">35</span>
              </div>
              <div className="flex justify-between">
                <span>Contenuto:</span>
                <span className="font-medium text-foreground">Opere, Episodi, Artisti, Ruoli</span>
              </div>
            </div>
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Include: dati opera (titolo, tipo, anno, ISAN, IMDB), episodio (stagione, numero, titolo),
              artista (nome, cognome, CF, codice IPN, mandato), ruolo e personaggio.
            </div>
            <Button
              className="w-full"
              onClick={handleExportFull}
              disabled={isExporting || loadingStats}
            >
              {isExporting && exportState.campagnaId === 'full-database-export' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Esportazione in corso...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Esporta Banca Dati Completa
                </>
              )}
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
