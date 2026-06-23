'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, Loader2, Search, Sparkles } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import type { SearchField } from '@/features/individuazioni/services/individuazioni.service'
import ExportIndividuazioniDialog from './components/ExportIndividuazioniDialog'
import IndividuazioniDetailTable from './components/IndividuazioniDetailTable'
import { useIndividuazioneDetail } from './hooks/useIndividuazioneDetail'

export default function IndividuazioneDetailPage() {
  const router = useRouter()
  const params = useParams()
  const campagnaId = params.id as string
  const {
    campagna,
    individuazioni,
    loading,
    loadingData,
    showExportDialog,
    showTimeEstimateDialog,
    selectedFormat,
    estimatedTime,
    isCalculatingEstimate,
    exportButtonRef,
    page,
    pageSize,
    totalPages,
    totalCount,
    searchTerm,
    searchField,
    statoFilter,
    setPage,
    setShowExportDialog,
    setShowTimeEstimateDialog,
    handleSearch,
    handleSearchFieldChange,
    handleStatoFilterChange,
    handleExportDialogOpenChange,
    handleFormatSelect,
    handleConfirmExport,
  } = useIndividuazioneDetail(campagnaId)

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
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna indietro
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => router.push('/dashboard/individuazioni')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Torna alle campagne
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

        <div ref={exportButtonRef}>
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
        searchTerm={searchTerm}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setPage}
      />

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
