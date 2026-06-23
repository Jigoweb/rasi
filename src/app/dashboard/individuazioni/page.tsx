'use client'

import { useRouter } from 'next/navigation'
import { BarChart3, Calendar, CheckCircle, Filter, Sparkles, Tv, Users, X } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { useIndividuazioneProcess } from '@/shared/contexts/individuazione-process-context'
import { PageErrorState, PageLoadingState } from '@/shared/components/page-states'
import { SearchInput } from '@/shared/components/search-input'
import DeleteIndividuazioneDialog from './components/DeleteIndividuazioneDialog'
import IndividuazioniTable from './components/IndividuazioniTable'
import { useIndividuazioniDelete } from './hooks/useIndividuazioniDelete'
import { useIndividuazioniFilters } from './hooks/useIndividuazioniFilters'
import { useIndividuazioniList } from './hooks/useIndividuazioniList'

export default function IndividuazioniPage() {
  const router = useRouter()
  const { resumeById, canStartProcess } = useIndividuazioneProcess()
  const {
    campagne,
    setCampagne,
    loading,
    error,
    loadCampagne,
    resumingId,
    processingProgressMap,
    loadingProgressMap,
    fetchProcessingProgress,
    handleResume,
  } = useIndividuazioniList({ resumeById, canStartProcess })
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    emittenteFilter,
    setEmittenteFilter,
    annoFilter,
    setAnnoFilter,
    filteredCampagne,
    uniqueAnni,
    uniqueEmittenti,
    resetFilters,
    hasActiveFilters,
  } = useIndividuazioniFilters(campagne)
  const {
    isDeleteDialogOpen,
    campagnaToDelete,
    deleteInfo,
    isLoadingDeleteInfo,
    isDeletingCampagna,
    deleteProgress,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  } = useIndividuazioniDelete({ updateCampagne: setCampagne })

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Individuazioni
          </h1>
          <p className="text-muted-foreground">Gestione delle campagne di individuazione artisti</p>
        </div>
        <PageLoadingState
          title="Caricamento individuazioni"
          description="Stiamo recuperando le campagne di individuazione e il loro stato operativo."
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Individuazioni
          </h1>
          <p className="text-muted-foreground">Gestione delle campagne di individuazione artisti</p>
        </div>
        <PageErrorState
          description="Non siamo riusciti a caricare le campagne di individuazione. Riprova."
          onRetry={loadCampagne}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Individuazioni
          </h1>
          <p className="text-muted-foreground">
            Gestione delle campagne di individuazione artisti
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          icon={<Sparkles className="h-5 w-5 text-primary" />}
          iconClassName="bg-primary/10"
          value={campagne.length.toLocaleString('it-IT')}
          label="Campagne totali"
        />
        <StatsCard
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          iconClassName="bg-green-100"
          value={campagne.filter(c => c.stato === 'completata').length.toLocaleString('it-IT')}
          label="Completate"
        />
        <StatsCard
          icon={<BarChart3 className="h-5 w-5 text-blue-600" />}
          iconClassName="bg-blue-100"
          value={formatNumber(campagne.reduce((acc, c) => acc + (c.statistiche?.individuazioni_create || 0), 0))}
          label="Individuazioni totali"
        />
        <StatsCard
          icon={<Users className="h-5 w-5 text-purple-600" />}
          iconClassName="bg-purple-100"
          value={formatNumber(campagne.reduce((acc, c) => acc + (c.statistiche?.artisti_distinti || 0), 0))}
          label="Artisti individuati"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div>
              <SearchInput
                placeholder="Cerca per nome o emittente..."
                initialValue={searchTerm}
                onSearch={setSearchTerm}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <Filter className="h-4 w-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="completata">Completata</SelectItem>
                  <SelectItem value="in_corso">In corso</SelectItem>
                  <SelectItem value="bozza">Bozza</SelectItem>
                  <SelectItem value="archiviata">Archiviata</SelectItem>
                </SelectContent>
              </Select>

              <Select value={emittenteFilter} onValueChange={setEmittenteFilter}>
                <SelectTrigger className="w-full sm:w-52">
                  <Tv className="h-4 w-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Emittente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le emittenti</SelectItem>
                  {uniqueEmittenti.map(emittente => (
                    <SelectItem key={emittente.id} value={emittente.id}>{emittente.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={annoFilter} onValueChange={setAnnoFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <Calendar className="h-4 w-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Anno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli anni</SelectItem>
                  {uniqueAnni.map(anno => (
                    <SelectItem key={anno} value={anno.toString()}>{anno}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={resetFilters} disabled={!hasActiveFilters} className="sm:ml-auto">
                Reset filtri
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {searchTerm && (
              <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                <X className="h-3 w-3 mr-1" /> Ricerca: {searchTerm}
              </Button>
            )}
            {statusFilter !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setStatusFilter('all')}>
                <X className="h-3 w-3 mr-1" /> Stato: {statusFilter === 'in_corso' ? 'In corso' : statusFilter}
              </Button>
            )}
            {emittenteFilter !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setEmittenteFilter('all')}>
                <X className="h-3 w-3 mr-1" /> Emittente: {uniqueEmittenti.find(e => e.id === emittenteFilter)?.nome}
              </Button>
            )}
            {annoFilter !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setAnnoFilter('all')}>
                <X className="h-3 w-3 mr-1" /> Anno: {annoFilter}
              </Button>
            )}
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Mostrando {filteredCampagne.length} di {campagne.length} campagne
            {hasActiveFilters ? ' filtrate' : ''}
          </div>
        </CardContent>
      </Card>

      <IndividuazioniTable
        campagne={filteredCampagne}
        loading={loading}
        searchTerm={searchTerm}
        processingProgressMap={processingProgressMap}
        loadingProgressMap={loadingProgressMap}
        resumingId={resumingId}
        canStartProcess={canStartProcess}
        onOpenDetail={campagnaId => router.push(`/dashboard/individuazioni/${campagnaId}`)}
        onOpenDelete={openDeleteDialog}
        onResume={handleResume}
        onFetchProcessingProgress={fetchProcessingProgress}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
      />

      <DeleteIndividuazioneDialog
        open={isDeleteDialogOpen}
        campagna={campagnaToDelete}
        deleteInfo={deleteInfo}
        isLoading={isLoadingDeleteInfo}
        isDeleting={isDeletingCampagna}
        deleteProgress={deleteProgress}
        onOpenChange={closeDeleteDialog}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function StatsCard({
  icon,
  iconClassName,
  value,
  label,
}: {
  icon: React.ReactNode
  iconClassName: string
  value: string
  label: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconClassName}`}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function formatNumber(num: number | undefined) {
  return (num || 0).toLocaleString('it-IT')
}
