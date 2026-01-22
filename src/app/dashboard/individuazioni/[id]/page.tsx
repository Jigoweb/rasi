'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import * as XLSX from 'xlsx'
import { 
  getCampagnaIndividuazione, 
  getIndividuazioni, 
  getIndividuazioniForExport,
  formatIndividuazioniForExport,
  CampagnaIndividuazione, 
  Individuazione,
  SearchField 
} from '@/features/individuazioni/services/individuazioni.service'
import { useExportProcess } from '@/shared/contexts/export-process-context'
import { supabase } from '@/shared/lib/supabase'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { 
  Search, 
  Sparkles, 
  ArrowLeft,
  Download, 
  FileSpreadsheet,
  Calendar,
  Users,
  FileText,
  CheckCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Music,
  Film,
  User
} from 'lucide-react'

export default function IndividuazioneDetailPage() {
  const router = useRouter()
  const params = useParams()
  const campagnaId = params.id as string

  const [campagna, setCampagna] = useState<CampagnaIndividuazione | null>(null)
  const [individuazioni, setIndividuazioni] = useState<Individuazione[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showTimeEstimateDialog, setShowTimeEstimateDialog] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'xlsx' | null>(null)
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
  const [isCalculatingEstimate, setIsCalculatingEstimate] = useState(false)
  const exportButtonRef = useRef<HTMLButtonElement>(null)
  const { startExport, state: exportState } = useExportProcess()
  
  // Pagination & filters
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [searchField, setSearchField] = useState<SearchField>('titolo')
  const [statoFilter, setStatoFilter] = useState<string>('all')
  const pageSize = 50

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setPage(1) // Reset to first page on search change
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Load campagna on mount
  useEffect(() => {
    if (!campagnaId) return
    
    const loadCampagna = async () => {
      setLoading(true)
      try {
        const { data, error } = await getCampagnaIndividuazione(campagnaId)
        if (error) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : typeof error === 'object' && error !== null
            ? JSON.stringify(error)
            : String(error)
          console.error('Errore caricamento campagna:', errorMessage, error)
          setCampagna(null)
          return
        }
        if (data) {
          setCampagna(data)
        } else {
          setCampagna(null)
        }
      } catch (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : String(error)
        console.error('Errore caricamento campagna:', errorMessage, error)
        setCampagna(null)
      } finally {
        setLoading(false)
      }
    }
    
    loadCampagna()
  }, [campagnaId])

  // Load individuazioni when campagna is loaded and filters change
  useEffect(() => {
    if (!campagna) return
    
    loadIndividuazioni()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campagna, page, debouncedSearchTerm, searchField, statoFilter])

  const loadIndividuazioni = async () => {
    setLoadingData(true)
    try {
      const { data, error, count, totalPages: pages } = await getIndividuazioni(campagnaId, {
        page,
        pageSize,
        search: debouncedSearchTerm || undefined,
        searchField,
        stato: statoFilter !== 'all' ? statoFilter : undefined
      })
      if (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : String(error)
        console.error('Errore caricamento individuazioni:', errorMessage, error)
        setIndividuazioni([])
        setTotalPages(0)
        setTotalCount(0)
        return
      }
      if (data) {
        setIndividuazioni(data)
        setTotalPages(pages)
        setTotalCount(count || 0)
      } else {
        setIndividuazioni([])
        setTotalPages(0)
        setTotalCount(0)
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null
        ? JSON.stringify(error)
        : String(error)
      console.error('Errore caricamento individuazioni:', errorMessage, error)
      setIndividuazioni([])
      setTotalPages(0)
      setTotalCount(0)
    } finally {
      setLoadingData(false)
    }
  }

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    // Page reset is handled by debounce effect
  }, [])

  // Estimate export time based on record count
  const estimateExportTime = useCallback(async (): Promise<number> => {
    try {
      const { count } = await (supabase as any)
        .from('individuazioni')
        .select('*', { count: 'exact', head: true })
        .eq('campagna_individuazioni_id', campagnaId)

      const total = count || 0
      if (total === 0) return 0

      // Estimate: ~100 records per second for fetching, plus formatting overhead
      // For large datasets, estimate more conservatively
      const fetchTime = total / 100 // seconds
      const formatTime = total / 1000 // seconds for formatting
      const totalTime = fetchTime + formatTime + 5 // add 5s buffer

      return Math.ceil(totalTime)
    } catch (error) {
      console.error('Error estimating export time:', error)
      return 60 // Default estimate: 1 minute
    }
  }, [campagnaId])

  const handleFormatSelect = async (format: 'csv' | 'xlsx') => {
    setSelectedFormat(format)
    setShowExportDialog(false)
    setIsCalculatingEstimate(true)
    
    try {
      // Calculate time estimate
      const time = await estimateExportTime()
      setEstimatedTime(time)
      setShowTimeEstimateDialog(true)
    } catch (error) {
      console.error('Error calculating estimate:', error)
      setEstimatedTime(60) // Default fallback
      setShowTimeEstimateDialog(true)
    } finally {
      setIsCalculatingEstimate(false)
    }
  }

  const handleConfirmExport = async () => {
    if (!selectedFormat || !campagna) return

    const format = selectedFormat // Capture format in closure
    setShowTimeEstimateDialog(false)

    await startExport(
      campagnaId,
      campagna.nome || 'Campagna',
      format,
      async (onProgress, signal) => {
        try {
          // Fetch data with progress callback
          const { data, error } = await getIndividuazioniForExport(campagnaId, (progress) => {
            onProgress({
              fetched: progress.fetched,
              total: progress.total,
              percentage: progress.percentage,
              phase: progress.phase,
              estimatedTimeRemaining: progress.estimatedTimeRemaining
            })
          }, signal)

          if (signal.aborted) {
            throw new Error('Export cancelled')
          }

          if (error) {
            throw error
          }

          if (!data || data.length === 0) {
            throw new Error('Nessun dato da esportare')
          }

          // Update progress: formatting data
          onProgress({
            fetched: data.length,
            total: data.length,
            percentage: 90,
            phase: 'formatting'
          })

          // Format data (this can be slow for large datasets)
          const formattedData = formatIndividuazioniForExport(data)

          if (signal.aborted) {
            throw new Error('Export cancelled')
          }

          // Update progress: creating workbook
          onProgress({
            fetched: data.length,
            total: data.length,
            percentage: 95,
            phase: 'generating'
          })

          const worksheet = XLSX.utils.json_to_sheet(formattedData)
          const workbook = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Individuazioni')

          // Auto-size columns
          const maxWidth = 50
          const colWidths = Object.keys(formattedData[0] || {}).map(key => ({
            wch: Math.min(maxWidth, Math.max(key.length, 
              ...formattedData.map(row => String(row[key as keyof typeof row] || '').length)
            ))
          }))
          worksheet['!cols'] = colWidths

          const fileName = `individuazioni_${campagna.nome?.replace(/[^a-z0-9]/gi, '_') || campagnaId}_${new Date().toISOString().split('T')[0]}`

          if (signal.aborted) {
            throw new Error('Export cancelled')
          }

          // Update progress: writing file
          onProgress({
            fetched: data.length,
            total: data.length,
            percentage: 100,
            phase: 'done'
          })

          if (format === 'csv') {
            XLSX.writeFile(workbook, `${fileName}.csv`, { bookType: 'csv' })
          } else {
            XLSX.writeFile(workbook, `${fileName}.xlsx`, { bookType: 'xlsx' })
          }
        } catch (error: any) {
          if (error.message === 'Export cancelled' || signal.aborted) {
            throw error
          }
          const errorMessage = error instanceof Error 
            ? error.message 
            : typeof error === 'object' && error !== null
            ? JSON.stringify(error)
            : String(error)
          throw new Error(errorMessage)
        }
      }
    )
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

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return '-'
    return timeString.substring(0, 5)
  }

  const getStatoBadge = (stato: string | undefined) => {
    switch (stato) {
      case 'validato':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Validato</Badge>
      case 'individuato':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Individuato</Badge>
      case 'rifiutato':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rifiutato</Badge>
      case 'in_revisione':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">In revisione</Badge>
      default:
        return <Badge variant="secondary">{stato || '-'}</Badge>
    }
  }

  const getArtistaDisplay = (ind: Individuazione) => {
    if (!ind.artisti) return '-'
    const nome = ind.artisti.nome_arte || `${ind.artisti.nome} ${ind.artisti.cognome}`.trim()
    return nome || '-'
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
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna indietro
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-2 -ml-2"
            onClick={() => router.push('/dashboard/individuazioni')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Torna alle campagne
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            {campagna.nome}
          </h1>
          <p className="text-muted-foreground">
            {campagna.emittenti?.nome} • Anno {campagna.anno}
          </p>
          {campagna.descrizione && (
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              <span className="font-medium">Note:</span> {campagna.descrizione}
            </p>
          )}
        </div>
        
        <div ref={exportButtonRef}>
          <Button
            onClick={() => setShowExportDialog(true)}
            disabled={isCalculatingEstimate}
          >
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{formatNumber(campagna.statistiche?.individuazioni_create)}</p>
              <p className="text-sm text-muted-foreground">Individuazioni</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{formatNumber(campagna.statistiche?.programmazioni_con_match)}</p>
              <p className="text-sm text-muted-foreground">Prog. con match</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{formatNumber(campagna.statistiche?.artisti_distinti)}</p>
              <p className="text-sm text-muted-foreground">Artisti</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{formatNumber(campagna.statistiche?.opere_distinte)}</p>
              <p className="text-sm text-muted-foreground">Opere</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{formatNumber(campagna.statistiche?.programmazioni_totali)}</p>
              <p className="text-sm text-muted-foreground">Prog. totali</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={searchField} onValueChange={(v) => { setSearchField(v as SearchField); setSearchTerm(''); setPage(1) }}>
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
                placeholder={
                  searchField === 'titolo' ? 'Cerca per titolo programmazione...' :
                  searchField === 'artista' ? 'Cerca per nome artista...' :
                  'Cerca per titolo opera...'
                }
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statoFilter} onValueChange={(v) => { setStatoFilter(v); setPage(1) }}>
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="py-4 px-6">Data</TableHead>
                <TableHead className="py-4">Orario</TableHead>
                <TableHead className="py-4">Titolo Programmazione</TableHead>
                <TableHead className="py-4">Artista</TableHead>
                <TableHead className="py-4">Opera Matchata</TableHead>
                <TableHead className="py-4">Ruolo</TableHead>
                <TableHead className="py-4 text-center">Match %</TableHead>
                <TableHead className="py-4">Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingData ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : individuazioni.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    {searchTerm ? 'Nessuna individuazione trovata' : 'Nessuna individuazione'}
                  </TableCell>
                </TableRow>
              ) : (
                individuazioni.map((ind) => (
                  <TableRow key={ind.id} className="hover:bg-muted/50">
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(ind.data_trasmissione)}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm">
                        {formatTime(ind.ora_inizio)} - {formatTime(ind.ora_fine)}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="max-w-[200px]">
                        <p className="font-medium truncate" title={ind.titolo || ''}>
                          {ind.titolo || '-'}
                        </p>
                        {ind.titolo_episodio && (
                          <p className="text-xs text-muted-foreground truncate">
                            S{ind.numero_stagione || '?'}E{ind.numero_episodio || '?'}: {ind.titolo_episodio}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{getArtistaDisplay(ind)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <Film className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[150px]" title={ind.opere?.titolo || ''}>
                          {ind.opere?.titolo || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline">{ind.ruoli_tipologie?.nome || '-'}</Badge>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <span className={`font-medium ${
                        ind.punteggio_matching >= 0.9 ? 'text-green-600' :
                        ind.punteggio_matching >= 0.7 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {(ind.punteggio_matching * 100).toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      {getStatoBadge(ind.stato)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {!loadingData && individuazioni.length > 0 && (
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalCount)} di {formatNumber(totalCount)} individuazioni
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Pagina {page} di {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={(open) => {
        if (!isCalculatingEstimate && exportState.status === 'idle') {
          setShowExportDialog(open)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Esporta Individuazioni</DialogTitle>
            <DialogDescription>
              Scegli il formato di esportazione per le individuazioni di "{campagna?.nome}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => handleFormatSelect('csv')}
            >
              <FileText className="h-8 w-8" />
              <span>CSV</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => handleFormatSelect('xlsx')}
            >
              <FileSpreadsheet className="h-8 w-8" />
              <span>Excel</span>
            </Button>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Il file conterrà tutte le {formatNumber(campagna?.statistiche?.individuazioni_create || 0)} individuazioni della campagna
          </div>
        </DialogContent>
      </Dialog>

      {/* Time Estimate Dialog */}
      <AlertDialog open={showTimeEstimateDialog} onOpenChange={setShowTimeEstimateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Esportazione</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-muted-foreground">
              Stai per esportare <strong>{formatNumber(campagna?.statistiche?.individuazioni_create || 0)}</strong> individuazioni in formato <strong>{selectedFormat?.toUpperCase()}</strong>.
            </p>
            {estimatedTime !== null && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium mb-1">Tempo stimato:</p>
                <p className="text-lg font-semibold text-primary">
                  {estimatedTime < 60 
                    ? `~${estimatedTime} secondi` 
                    : (() => {
                        const minutes = Math.floor(estimatedTime / 60)
                        return `~${minutes} ${minutes === 1 ? 'minuto' : 'minuti'}`
                      })()
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Il processo può essere minimizzato e continuerà in background.
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Vuoi procedere con l'esportazione?
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExport}>
              Conferma Esportazione
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

