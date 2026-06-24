'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Download, Edit, Loader2, Search, Sparkles } from 'lucide-react'
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
    setShowExportDialog,
    setShowTimeEstimateDialog,
    handleSearch,
    handleSearchFieldChange,
    handleStatoFilterChange,
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard value={formatNumber(campagna.statistiche?.individuazioni_create)} label="Individuazioni" />
        <MetricCard value={formatNumber(campagna.statistiche?.programmazioni_con_match)} label="Prog. con match" />
        <MetricCard value={formatNumber(campagna.statistiche?.artisti_distinti)} label="Artisti" />
        <MetricCard value={formatNumber(campagna.statistiche?.opere_distinte)} label="Opere" />
        <MetricCard value={formatNumber(campagna.statistiche?.programmazioni_totali)} label="Prog. totali" />
      </div>

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
                <SelectItem value="in_revisione">In revisione</SelectItem>
                <SelectItem value="rifiutato">Rifiutato</SelectItem>
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

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
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
