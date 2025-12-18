'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCampagneIndividuazione, CampagnaIndividuazione, getDeleteCampagnaIndividuazioneInfo, deleteCampagnaIndividuazione, DeleteCampagnaIndividuazioneInfo } from '@/features/individuazioni/services/individuazioni.service'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { 
  Search, 
  Sparkles, 
  Eye, 
  Download, 
  Calendar,
  Users,
  FileText,
  CheckCircle,
  Clock,
  Loader2,
  Info,
  BarChart3,
  Trash2,
  MoreHorizontal
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

export default function IndividuazioniPage() {
  const router = useRouter()
  const [campagne, setCampagne] = useState<CampagnaIndividuazione[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [campagnaToDelete, setCampagnaToDelete] = useState<CampagnaIndividuazione | null>(null)
  const [deleteInfo, setDeleteInfo] = useState<DeleteCampagnaIndividuazioneInfo | null>(null)
  const [isLoadingDeleteInfo, setIsLoadingDeleteInfo] = useState(false)
  const [isDeletingCampagna, setIsDeletingCampagna] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState<{ phase: string; deleted?: number; total?: number } | null>(null)

  useEffect(() => {
    loadCampagne()
  }, [])

  const loadCampagne = async () => {
    setLoading(true)
    const { data, error } = await getCampagneIndividuazione()
    if (data) {
      setCampagne(data)
    }
    if (error) {
      console.error('Errore caricamento campagne:', error)
    }
    setLoading(false)
  }

  // Delete Handlers
  const handleOpenDeleteDialog = async (campagna: CampagnaIndividuazione) => {
    setCampagnaToDelete(campagna)
    setIsDeleteDialogOpen(true)
    setIsLoadingDeleteInfo(true)
    setDeleteInfo(null)
    setDeleteProgress(null)

    try {
      const { data, error } = await getDeleteCampagnaIndividuazioneInfo(campagna.id)
      if (error) throw error
      setDeleteInfo(data)
    } catch (error) {
      console.error('Error loading delete info:', error)
    } finally {
      setIsLoadingDeleteInfo(false)
    }
  }

  const handleCloseDeleteDialog = () => {
    if (isDeletingCampagna) return // Prevent closing during deletion
    setIsDeleteDialogOpen(false)
    setCampagnaToDelete(null)
    setDeleteInfo(null)
    setDeleteProgress(null)
  }

  const handleConfirmDelete = async () => {
    if (!campagnaToDelete) return

    setIsDeletingCampagna(true)
    setDeleteProgress({ phase: 'starting' })
    
    try {
      const { error } = await deleteCampagnaIndividuazione(
        campagnaToDelete.id,
        (progress) => setDeleteProgress(progress)
      )

      if (error) {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
        console.error('Error deleting campagna:', errorMessage)
        alert(`Errore durante l'eliminazione: ${errorMessage}`)
        return
      }
      
      // Remove from list and close dialog
      setCampagne(prev => prev.filter(c => c.id !== campagnaToDelete.id))
      setIsDeleteDialogOpen(false)
      setCampagnaToDelete(null)
      setDeleteInfo(null)
      setDeleteProgress(null)
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
      console.error('Error deleting campagna:', errorMessage)
      alert(`Errore durante l'eliminazione: ${errorMessage}`)
    } finally {
      setIsDeletingCampagna(false)
      setDeleteProgress(null)
    }
  }

  const filteredCampagne = campagne.filter(c => 
    c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.emittenti?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatoBadge = (stato: string) => {
    switch (stato) {
      case 'completata':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completata</Badge>
      case 'in_corso':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In corso</Badge>
      case 'bozza':
        return <Badge variant="secondary">Bozza</Badge>
      case 'archiviata':
        return <Badge variant="outline">Archiviata</Badge>
      default:
        return <Badge variant="secondary">{stato}</Badge>
    }
  }

  const formatNumber = (num: number | undefined) => {
    return (num || 0).toLocaleString('it-IT')
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campagne.length}</p>
                <p className="text-sm text-muted-foreground">Campagne totali</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campagne.filter(c => c.stato === 'completata').length}
                </p>
                <p className="text-sm text-muted-foreground">Completate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatNumber(campagne.reduce((acc, c) => acc + (c.statistiche?.individuazioni_create || 0), 0))}
                </p>
                <p className="text-sm text-muted-foreground">Individuazioni totali</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatNumber(campagne.reduce((acc, c) => acc + (c.statistiche?.artisti_distinti || 0), 0))}
                </p>
                <p className="text-sm text-muted-foreground">Artisti individuati</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome o emittente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="py-4 px-6">Nome Campagna</TableHead>
                <TableHead className="py-4">Emittente</TableHead>
                <TableHead className="py-4">Anno</TableHead>
                <TableHead className="py-4 text-right">Individuazioni</TableHead>
                <TableHead className="py-4 text-right">Artisti</TableHead>
                <TableHead className="py-4 text-right">Opere</TableHead>
                <TableHead className="py-4">Stato</TableHead>
                <TableHead className="py-4">Creata il</TableHead>
                <TableHead className="py-4 w-32">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredCampagne.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    {searchTerm ? 'Nessuna campagna trovata' : 'Nessuna campagna individuazione'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampagne.map((campagna) => (
                  <TableRow 
                    key={campagna.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/dashboard/individuazioni/${campagna.id}`)}
                  >
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{campagna.nome}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <div className="space-y-2">
                              <p className="font-semibold">Informazioni Campagna</p>
                              <div className="text-sm space-y-1">
                                <p>Individuazioni: <strong>{formatNumber(campagna.statistiche?.individuazioni_create)}</strong></p>
                                {campagna.statistiche && (
                                  <>
                                    <p>Programmazioni totali: <strong>{formatNumber(campagna.statistiche.programmazioni_totali)}</strong></p>
                                    <p>Con match: <strong>{formatNumber(campagna.statistiche.programmazioni_con_match)}</strong></p>
                                    <p>Senza match: <strong>{formatNumber(campagna.statistiche.programmazioni_senza_match)}</strong></p>
                                  </>
                                )}
                              </div>
                              {campagna.descrizione && (
                                <div className="pt-2 border-t">
                                  <p className="text-xs font-medium">Note:</p>
                                  <p className="text-xs">{campagna.descrizione}</p>
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      {campagna.emittenti?.nome || '-'}
                    </TableCell>
                    <TableCell className="py-4">
                      {campagna.anno || '-'}
                    </TableCell>
                    <TableCell className="py-4 text-right font-medium">
                      {formatNumber(campagna.statistiche?.individuazioni_create)}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      {formatNumber(campagna.statistiche?.artisti_distinti)}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      {formatNumber(campagna.statistiche?.opere_distinte)}
                    </TableCell>
                    <TableCell className="py-4">
                        {getStatoBadge(campagna.stato)}
                    </TableCell>
                    <TableCell className="py-4">
                      {formatDate(campagna.created_at)}
                    </TableCell>
                    <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/individuazioni/${campagna.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/individuazioni/${campagna.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Dettaglio
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              variant="destructive"
                              onClick={() => handleOpenDeleteDialog(campagna)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!loading && filteredCampagne.length > 0 && (
            <div className="px-6 py-4 border-t text-sm text-muted-foreground">
              Mostrando {filteredCampagne.length} di {campagne.length} campagne
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Campagna Individuazione Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={handleCloseDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Elimina Campagna Individuazione
            </DialogTitle>
            <DialogDescription>
              Conferma l&apos;eliminazione della campagna <span className="font-medium text-foreground">{campagnaToDelete?.nome}</span>
            </DialogDescription>
          </DialogHeader>

          {isLoadingDeleteInfo ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Verifica in corso...</p>
            </div>
          ) : deleteInfo ? (
            <div className="py-4 space-y-4">
              {/* Warning message */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-600">
                  <Info className="h-5 w-5" />
                  <p className="font-medium">Attenzione</p>
                </div>
                <p className="text-sm text-amber-700">
                  Questa operazione eliminerà <strong>{deleteInfo.individuazioni_count.toLocaleString()}</strong> individuazioni associate alla campagna.
                </p>
              </div>

              {/* Additional info */}
              <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Campagna Programmazione:</strong> {deleteInfo.campagne_programmazione_nome}
                </p>
                <p className="text-sm text-muted-foreground">
                  La campagna programmazione tornerà allo stato &quot;In review&quot; e potrai eventualmente ricreare le individuazioni.
                </p>
              </div>

              {/* Progress during deletion */}
              {isDeletingCampagna && deleteProgress && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">
                      {deleteProgress.phase === 'deleting_individuazioni' && 'Eliminazione individuazioni...'}
                      {deleteProgress.phase === 'updating_programmazione' && 'Aggiornamento campagna programmazione...'}
                      {deleteProgress.phase === 'deleting_campagna' && 'Eliminazione campagna...'}
                    </span>
                  </div>
                  {deleteProgress.phase === 'deleting_individuazioni' && deleteProgress.total && (
                    <div className="space-y-1">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-destructive transition-all"
                          style={{ width: `${((deleteProgress.deleted || 0) / deleteProgress.total) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-right">
                        {(deleteProgress.deleted || 0).toLocaleString()} / {deleteProgress.total.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Errore nel caricamento delle informazioni
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={handleCloseDeleteDialog} 
              disabled={isDeletingCampagna}
            >
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={isLoadingDeleteInfo || isDeletingCampagna || !deleteInfo}
            >
              {isDeletingCampagna ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Elimina Campagna
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


