'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Download, Edit, Loader2, Search } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { DashboardBreadcrumbs } from '@/shared/components/dashboard-breadcrumbs'
import { FloatingScrollUpButton } from '@/shared/components/floating-scroll-up-button'
import { useAuth } from '@/shared/contexts/auth-context'
import {
  updateCampagnaIndividuazioneMetadata,
  type Individuazione,
  type IndividuazioneDetailStats,
  type IndividuazioneEpisodeAlertSummary,
  type SearchField,
} from '@/features/individuazioni/services/individuazioni.service'
import ExportIndividuazioniDialog from './components/ExportIndividuazioniDialog'
import IndividuazioneReviewDrawer from './components/IndividuazioneReviewDrawer'
import IndividuazioniDetailTable from './components/IndividuazioniDetailTable'
import { useIndividuazioneDetail } from './hooks/useIndividuazioneDetail'

export default function IndividuazioneDetailPage() {
  const params = useParams()
  const campagnaId = params.id as string
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editDraft, setEditDraft] = useState({ nome: '', descrizione: '' })
  const [isSavingMetadata, setIsSavingMetadata] = useState(false)
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false)
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const { isAdmin, isOperatore } = useAuth()
  const canReviewIndividuazioni = isAdmin || isOperatore
  const {
    campagna,
    setCampagna,
    detailStats,
    episodeAlertSummary,
    individuazioni,
    loading,
    loadingData,
    showExportDialog,
    showTimeEstimateDialog,
    selectedFormat,
    estimatedTime,
    isCalculatingEstimate,
    exportButtonRef,
    totalCount,
    loadingMore,
    hasMore,
    searchTerm,
    searchField,
    statoFilter,
    sortBy,
    sortDirection,
    groupBy,
    setShowExportDialog,
    setShowTimeEstimateDialog,
    handleSearch,
    handleSearchFieldChange,
    handleStatoFilterChange,
    handleSortChange,
    handleGroupByChange,
    handleExportDialogOpenChange,
    handleFormatSelect,
    handleConfirmExport,
    loadMore,
    refreshDetailStats,
    updateIndividuazioneInList,
  } = useIndividuazioneDetail(campagnaId)

  const handleRowClick = useCallback((individuazione: Individuazione) => {
    setSelectedReviewId(individuazione.id)
    setReviewDrawerOpen(true)
  }, [])

  const handleReviewStatusUpdated = useCallback((updated: Individuazione) => {
    updateIndividuazioneInList(updated)
    void refreshDetailStats()
  }, [refreshDetailStats, updateIndividuazioneInList])

  function openEditDialog() {
    if (!campagna) return
    setEditDraft({
      nome: campagna.nome,
      descrizione: campagna.descrizione || '',
    })
    setIsEditDialogOpen(true)
  }

  async function handleSaveMetadata() {
    if (!campagna) return
    const nome = editDraft.nome.trim()
    if (!nome) return

    setIsSavingMetadata(true)
    try {
      const { data, error } = await updateCampagnaIndividuazioneMetadata(campagna.id, {
        nome,
        descrizione: editDraft.descrizione,
      })
      if (error) throw error

      setCampagna({
        ...campagna,
        ...(data || {}),
        nome,
        descrizione: editDraft.descrizione.trim() || null,
      })
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error('Errore aggiornamento individuazione:', error)
    } finally {
      setIsSavingMetadata(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!campagna) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Campagna non trovata</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/dashboard/individuazioni">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alle campagne
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardBreadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Individuazioni', href: '/dashboard/individuazioni' },
          { label: campagna.nome || 'Dettaglio individuazione' },
        ]}
      />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
            <Link href="/dashboard/individuazioni">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Torna alle campagne
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">
            {campagna.nome}
          </h1>
          <p className="text-muted-foreground">
            {campagna.emittenti?.nome} - Anno {campagna.anno}
          </p>
          {campagna.descrizione && (
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              <span className="font-medium">Note:</span> {campagna.descrizione}
            </p>
          )}
        </div>

        <div ref={exportButtonRef} className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openEditDialog}>
            <Edit className="h-4 w-4 mr-2" />
            Modifica dettagli
          </Button>
          <Button onClick={() => setShowExportDialog(true)} disabled={isCalculatingEstimate}>
            {isCalculatingEstimate ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calcolo stima...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Esporta Individuazioni
              </>
            )}
          </Button>
        </div>
      </div>

      <IndividuazioneSummary
        stats={detailStats}
        fallbackStats={campagna.statistiche}
      />

      <EpisodeAlertSummary summary={episodeAlertSummary} />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={searchField} onValueChange={value => handleSearchFieldChange(value as SearchField)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Cerca per..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="titolo">Titolo Programmazione</SelectItem>
                <SelectItem value="artista">Artista</SelectItem>
                <SelectItem value="opera">Opera Matchata</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={getSearchPlaceholder(searchField)}
                value={searchTerm}
                onChange={event => handleSearch(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statoFilter} onValueChange={handleStatoFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="individuato">Individuato</SelectItem>
                <SelectItem value="validato">Validato</SelectItem>
                <SelectItem value="dubbioso">In revisione</SelectItem>
                <SelectItem value="respinto">Respinto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <IndividuazioniDetailTable
        individuazioni={individuazioni}
        loadingData={loadingData}
        loadingMore={loadingMore}
        searchTerm={searchTerm}
        totalCount={totalCount}
        hasMore={hasMore}
        sortBy={sortBy}
        sortDirection={sortDirection}
        groupBy={groupBy}
        onSortChange={handleSortChange}
        onGroupByChange={handleGroupByChange}
        onLoadMore={loadMore}
        onRowClick={handleRowClick}
      />

      <IndividuazioneReviewDrawer
        open={reviewDrawerOpen}
        individuazioni={individuazioni}
        selectedId={selectedReviewId}
        canReview={canReviewIndividuazioni}
        onOpenChange={setReviewDrawerOpen}
        onNavigate={setSelectedReviewId}
        onStatusUpdated={handleReviewStatusUpdated}
      />

      <FloatingScrollUpButton />

      <ExportIndividuazioniDialog
        campagna={campagna}
        exportDialogOpen={showExportDialog}
        timeEstimateDialogOpen={showTimeEstimateDialog}
        selectedFormat={selectedFormat}
        estimatedTime={estimatedTime}
        onExportDialogOpenChange={handleExportDialogOpenChange}
        onTimeEstimateDialogOpenChange={setShowTimeEstimateDialog}
        onFormatSelect={handleFormatSelect}
        onConfirmExport={handleConfirmExport}
      />

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica dettagli individuazione</DialogTitle>
            <DialogDescription>
              Aggiorna nome e note della campagna di individuazione. I risultati non vengono ricalcolati.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="detail-individuazione-name">Nome individuazione</label>
              <Input
                id="detail-individuazione-name"
                value={editDraft.nome}
                onChange={event => setEditDraft(prev => ({ ...prev, nome: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="detail-individuazione-description">Note</label>
              <Textarea
                id="detail-individuazione-description"
                value={editDraft.descrizione}
                onChange={event => setEditDraft(prev => ({ ...prev, descrizione: event.target.value }))}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSaveMetadata} disabled={isSavingMetadata || !editDraft.nome.trim()}>
              {isSavingMetadata && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva dettagli
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type CampagnaStatisticheFallback = {
  programmazioni_totali?: number
  programmazioni_processate?: number
  programmazioni_con_match?: number
  programmazioni_senza_match?: number
  individuazioni_create?: number
  artisti_distinti?: number
  opere_distinte?: number
}

function IndividuazioneSummary({
  stats,
  fallbackStats,
}: {
  stats: IndividuazioneDetailStats | null
  fallbackStats?: CampagnaStatisticheFallback
}) {
  const totalIndividuazioni = stats?.outcomes.totale ?? fallbackStats?.individuazioni_create ?? 0
  const processedProgrammazioni = stats?.coverage.programmazioniProcessate ?? fallbackStats?.programmazioni_processate ?? fallbackStats?.programmazioni_totali ?? 0
  const artistiDistinti = stats?.catalog.artistiDistinti ?? fallbackStats?.artisti_distinti ?? 0
  const opereDistinte = stats?.catalog.opereDistinte ?? fallbackStats?.opere_distinte ?? 0

  return (
    <Card>
      <CardContent className="p-5">
        <div className="grid gap-5 md:grid-cols-3">
          <SummaryBlock
            label="Individuazioni generate"
            value={formatNumber(totalIndividuazioni)}
            detail={`da ${formatNumber(processedProgrammazioni)} programmazioni processate`}
          />
          <SummaryBlock
            label="Artisti individuati"
            value={formatNumber(artistiDistinti)}
            detail="artisti distinti nei match generati"
          />
          <SummaryBlock
            label="Opere individuate"
            value={formatNumber(opereDistinte)}
            detail="opere distinte nei match generati"
          />
        </div>
      </CardContent>
    </Card>
  )
}

function EpisodeAlertSummary({
  summary,
}: {
  summary: IndividuazioneEpisodeAlertSummary | null
}) {
  if (!summary || summary.totale === 0) return null

  const topOpere = summary.topOpere.slice(0, 3)

  return (
    <Card className="border-amber-200 bg-amber-50/60">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-900">
              Alert episodi esclusi dalle individuazioni
            </div>
            <p className="mt-2 text-sm text-amber-950">
              {formatNumber(summary.totale)} alert sono stati esclusi dai match automatici perché
              richiedono revisione catalogo o dati episodio.
            </p>
            {topOpere.length > 0 && (
              <p className="mt-2 text-xs text-amber-900">
                Opere più ricorrenti: {topOpere.map(item => `${item.titolo} (${formatNumber(item.count)})`).join(', ')}
              </p>
            )}
          </div>
          <div className="grid min-w-[280px] gap-3 text-sm sm:grid-cols-2">
            <SummaryPill
              label="Episodi non censiti"
              value={formatNumber(summary.catalogEpisodeNotCensito)}
            />
            <SummaryPill
              label="Dati episodio invalidi"
              value={formatNumber(summary.programmazioneEpisodeDataInvalid)}
            />
            <SummaryPill
              label="Programmazioni"
              value={formatNumber(summary.programmazioniCoinvolte)}
            />
            <SummaryPill
              label="Opere"
              value={formatNumber(summary.opereCoinvolte)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryPill({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border border-amber-200 bg-white/70 px-3 py-2">
      <div className="text-xs text-amber-900">{label}</div>
      <div className="font-mono text-lg font-semibold text-amber-950">{value}</div>
    </div>
  )
}

function SummaryBlock({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <p className="font-mono text-2xl font-semibold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-2 truncate text-sm text-muted-foreground" title={detail}>
        {detail}
      </p>
    </div>
  )
}

function formatNumber(num: number | undefined) {
  return (num || 0).toLocaleString('it-IT')
}

function getSearchPlaceholder(searchField: SearchField): string {
  switch (searchField) {
    case 'titolo':
      return 'Cerca per titolo programmazione...'
    case 'artista':
      return 'Cerca per nome artista...'
    case 'opera':
      return 'Cerca per titolo opera...'
  }
}
