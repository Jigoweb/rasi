'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, BarChart3, CheckCircle, Download, Edit, Loader2, Search } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { DashboardBreadcrumbs } from '@/shared/components/dashboard-breadcrumbs'
import { FloatingScrollUpButton } from '@/shared/components/floating-scroll-up-button'
import {
  updateCampagnaIndividuazioneMetadata,
  type IndividuazioneDetailStats,
  type SearchField,
} from '@/features/individuazioni/services/individuazioni.service'
import ExportIndividuazioniDialog from './components/ExportIndividuazioniDialog'
import IndividuazioniDetailTable from './components/IndividuazioniDetailTable'
import { useIndividuazioneDetail } from './hooks/useIndividuazioneDetail'

export default function IndividuazioneDetailPage() {
  const params = useParams()
  const campagnaId = params.id as string
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editDraft, setEditDraft] = useState({ nome: '', descrizione: '' })
  const [isSavingMetadata, setIsSavingMetadata] = useState(false)
  const {
    campagna,
    setCampagna,
    detailStats,
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
  } = useIndividuazioneDetail(campagnaId)

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

  const stats = detailStats ?? getFallbackDetailStats(campagna)

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

      <ReviewSummaryStrip stats={stats} />

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

function ReviewSummaryStrip({ stats }: { stats: IndividuazioneDetailStats }) {
  const hasBlockingReview = stats.review.daControllare > 0

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid lg:grid-cols-[minmax(280px,1.05fr)_minmax(0,2fr)]">
          <section className="border-b bg-muted/30 p-5 lg:border-b-0 lg:border-r">
            <div className="flex items-start gap-3">
              <div className={hasBlockingReview
                ? 'rounded-full bg-amber-100 p-2 text-amber-800'
                : 'rounded-full bg-emerald-100 p-2 text-emerald-800'}
              >
                {hasBlockingReview ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Priorità revisione
                </p>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {getReviewSummaryTitle(stats)}
                  </h2>
                  <p className="mt-1 max-w-[54ch] text-sm text-muted-foreground">
                    {getReviewSummaryDescription(stats)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                    {formatNumber(stats.review.scoreBasso)} score bassi
                  </span>
                  <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                    {formatNumber(stats.review.episodioDaControllare)} episodi da verificare
                  </span>
                  <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                    {formatNumber(stats.review.dubbiosi)} in revisione
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="min-w-0 p-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <SummaryMetric
                icon={<BarChart3 className="h-4 w-4" />}
                label="Copertura"
                value={`${formatNumber(stats.coverage.programmazioniConMatch)}/${formatNumber(stats.coverage.programmazioniTotali)}`}
                detail={`${formatPercent(stats.coverage.coperturaPercentuale)} con match`}
              />
              <SummaryMetric
                icon={<CheckCircle className="h-4 w-4" />}
                label="Esito match"
                value={formatNumber(stats.outcomes.totale)}
                detail={`${formatNumber(stats.outcomes.sicuri)} sicuri o validati`}
              />
              <SummaryMetric
                icon={<BarChart3 className="h-4 w-4" />}
                label="Qualità"
                value={formatPercent(stats.quality.scoreMedio)}
                detail={`${formatNumber(stats.quality.matchBassi)} bassi, ${formatNumber(stats.quality.matchAlti)} alti`}
              />
            </div>

            <div className="mt-5 grid gap-3 border-t pt-4 text-sm text-muted-foreground md:grid-cols-3">
              <p>
                <span className="font-medium text-foreground">{formatNumber(stats.coverage.programmazioniSenzaMatch)}</span>{' '}
                programmazioni senza match
              </p>
              <p>
                <span className="font-medium text-foreground">{formatNumber(stats.catalog.artistiDistinti)}</span>{' '}
                artisti e <span className="font-medium text-foreground">{formatNumber(stats.catalog.opereDistinte)}</span> opere
              </p>
              <p className="min-w-0 truncate" title={stats.catalog.ruoloPrincipale?.nome}>
                Ruolo più frequente:{' '}
                <span className="font-medium text-foreground">
                  {stats.catalog.ruoloPrincipale
                    ? `${stats.catalog.ruoloPrincipale.nome} (${formatNumber(stats.catalog.ruoloPrincipale.count)})`
                    : 'non disponibile'}
                </span>
              </p>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <span className="text-primary">{icon}</span>
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

function getReviewSummaryTitle(stats: IndividuazioneDetailStats) {
  if (stats.review.daControllare > 0) {
    return `${formatNumber(stats.review.daControllare)} da controllare`
  }

  if (stats.review.scoreBasso > 0) {
    return 'Score bassi da verificare'
  }

  if (stats.review.episodioDaControllare > 0) {
    return 'Episodi da verificare'
  }

  return 'Nessuna priorità bloccante'
}

function getReviewSummaryDescription(stats: IndividuazioneDetailStats) {
  if (stats.review.daControllare > 0) {
    return 'La vista è ordinata per far emergere prima match dubbiosi, score bassi ed episodi che richiedono verifica.'
  }

  if (stats.review.scoreBasso > 0 || stats.review.episodioDaControllare > 0) {
    return 'Non risultano priorità bloccanti, ma la tabella evidenzia comunque i segnali da verificare riga per riga.'
  }

  return "La campagna non mostra segnali critici immediati. Usa filtri e ricerca per controlli mirati o per preparare l'export."
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

function getFallbackDetailStats(campagna: { statistiche?: CampagnaStatisticheFallback }): IndividuazioneDetailStats {
  const statistiche = campagna.statistiche || {}
  const programmazioniTotali = statistiche.programmazioni_totali || 0
  const programmazioniConMatch = statistiche.programmazioni_con_match || 0
  const individuazioniCreate = statistiche.individuazioni_create || 0

  return {
    coverage: {
      programmazioniTotali,
      programmazioniProcessate: statistiche.programmazioni_processate || 0,
      programmazioniConMatch,
      programmazioniSenzaMatch: statistiche.programmazioni_senza_match || Math.max(programmazioniTotali - programmazioniConMatch, 0),
      coperturaPercentuale: programmazioniTotali > 0 ? (programmazioniConMatch / programmazioniTotali) * 100 : 0,
    },
    outcomes: {
      totale: individuazioniCreate,
      individuati: individuazioniCreate,
      validati: 0,
      dubbiosi: 0,
      respinti: 0,
      sicuri: individuazioniCreate,
    },
    quality: {
      scoreMedio: 0,
      scoreMin: 0,
      scoreMax: 0,
      matchAlti: 0,
      matchMedi: 0,
      matchBassi: 0,
    },
    review: {
      daControllare: 0,
      dubbiosi: 0,
      scoreBasso: 0,
      episodioDaControllare: 0,
    },
    catalog: {
      artistiDistinti: statistiche.artisti_distinti || 0,
      opereDistinte: statistiche.opere_distinte || 0,
      ruoloPrincipale: null,
    },
  }
}

function formatNumber(num: number | undefined) {
  return (num || 0).toLocaleString('it-IT')
}

function formatPercent(num: number | undefined) {
  return `${Math.round((num || 0) * 10) / 10}%`
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
