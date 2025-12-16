'use client'

import { useState, useEffect, useCallback } from 'react'
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
  const [exporting, setExporting] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  
  // Pagination & filters
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchField, setSearchField] = useState<SearchField>('titolo')
  const [statoFilter, setStatoFilter] = useState<string>('all')
  const pageSize = 50

  useEffect(() => {
    loadCampagna()
  }, [campagnaId])

  useEffect(() => {
    if (campagna) {
      loadIndividuazioni()
    }
  }, [campagna, page, searchTerm, searchField, statoFilter])

  const loadCampagna = async () => {
    setLoading(true)
    const { data, error } = await getCampagnaIndividuazione(campagnaId)
    if (data) {
      setCampagna(data)
    }
    if (error) {
      console.error('Errore caricamento campagna:', error)
    }
    setLoading(false)
  }

  const loadIndividuazioni = async () => {
    setLoadingData(true)
    const { data, error, count, totalPages: pages } = await getIndividuazioni(campagnaId, {
      page,
      pageSize,
      search: searchTerm || undefined,
      searchField,
      stato: statoFilter !== 'all' ? statoFilter : undefined
    })
    if (data) {
      setIndividuazioni(data)
      setTotalPages(pages)
      setTotalCount(count || 0)
    }
    if (error) {
      console.error('Errore caricamento individuazioni:', error)
    }
    setLoadingData(false)
  }

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setPage(1)
  }, [])

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExporting(true)
    try {
      const { data, error } = await getIndividuazioniForExport(campagnaId)
      
      if (error) {
        console.error('Errore export:', error)
        alert('Errore durante l\'export')
        return
      }

      if (!data || data.length === 0) {
        alert('Nessun dato da esportare')
        return
      }

      const formattedData = formatIndividuazioniForExport(data)
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

      const fileName = `individuazioni_${campagna?.nome?.replace(/[^a-z0-9]/gi, '_') || campagnaId}_${new Date().toISOString().split('T')[0]}`
      
      if (format === 'csv') {
        XLSX.writeFile(workbook, `${fileName}.csv`, { bookType: 'csv' })
      } else {
        XLSX.writeFile(workbook, `${fileName}.xlsx`, { bookType: 'xlsx' })
      }
    } catch (err) {
      console.error('Errore export:', err)
      alert('Errore durante l\'export')
    } finally {
      setExporting(false)
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
        
        <Button
          onClick={() => setShowExportDialog(true)}
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Esporta Individuazioni
        </Button>
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
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
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
              disabled={exporting}
              onClick={() => {
                setShowExportDialog(false)
                handleExport('csv')
              }}
            >
              <FileText className="h-8 w-8" />
              <span>CSV</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              disabled={exporting}
              onClick={() => {
                setShowExportDialog(false)
                handleExport('xlsx')
              }}
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
    </div>
  )
}

