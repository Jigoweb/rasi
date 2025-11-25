'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { FileText, Download, Eye, MoreHorizontal, Calendar, Filter, Search, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

interface Report {
  id: string
  titolo: string
  tipo: 'mensile' | 'trimestrale' | 'annuale' | 'personalizzato'
  stato: 'completato' | 'in_elaborazione' | 'errore' | 'programmato'
  data_creazione: string
  data_periodo_inizio: string
  data_periodo_fine: string
  artisti_coinvolti: number
  opere_analizzate: number
  importo_totale: number
  creato_da: string
}

const reportPlaceholder: Report[] = [
  {
    id: '1',
    titolo: 'Report Mensile Gennaio 2024',
    tipo: 'mensile',
    stato: 'completato',
    data_creazione: '2024-02-01T10:00:00Z',
    data_periodo_inizio: '2024-01-01T00:00:00Z',
    data_periodo_fine: '2024-01-31T23:59:59Z',
    artisti_coinvolti: 245,
    opere_analizzate: 1420,
    importo_totale: 125000,
    creato_da: 'Sistema Automatico'
  },
  {
    id: '2',
    titolo: 'Report Trimestrale Q4 2023',
    tipo: 'trimestrale',
    stato: 'completato',
    data_creazione: '2024-01-15T14:30:00Z',
    data_periodo_inizio: '2023-10-01T00:00:00Z',
    data_periodo_fine: '2023-12-31T23:59:59Z',
    artisti_coinvolti: 892,
    opere_analizzate: 4250,
    importo_totale: 450000,
    creato_da: 'Mario Rossi'
  },
  {
    id: '3',
    titolo: 'Report Personalizzato - Fiction RAI',
    tipo: 'personalizzato',
    stato: 'in_elaborazione',
    data_creazione: '2024-02-10T09:15:00Z',
    data_periodo_inizio: '2023-06-01T00:00:00Z',
    data_periodo_fine: '2024-01-31T23:59:59Z',
    artisti_coinvolti: 156,
    opere_analizzate: 89,
    importo_totale: 0,
    creato_da: 'Laura Bianchi'
  },
  {
    id: '4',
    titolo: 'Report Annuale 2023',
    tipo: 'annuale',
    stato: 'completato',
    data_creazione: '2024-01-05T16:45:00Z',
    data_periodo_inizio: '2023-01-01T00:00:00Z',
    data_periodo_fine: '2023-12-31T23:59:59Z',
    artisti_coinvolti: 1250,
    opere_analizzate: 8900,
    importo_totale: 1850000,
    creato_da: 'Sistema Automatico'
  },
  {
    id: '5',
    titolo: 'Report Mensile Febbraio 2024',
    tipo: 'mensile',
    stato: 'programmato',
    data_creazione: '2024-02-15T08:00:00Z',
    data_periodo_inizio: '2024-02-01T00:00:00Z',
    data_periodo_fine: '2024-02-29T23:59:59Z',
    artisti_coinvolti: 0,
    opere_analizzate: 0,
    importo_totale: 0,
    creato_da: 'Sistema Automatico'
  },
  {
    id: '6',
    titolo: 'Report Errore - Dati Mancanti',
    tipo: 'personalizzato',
    stato: 'errore',
    data_creazione: '2024-02-08T11:20:00Z',
    data_periodo_inizio: '2024-01-01T00:00:00Z',
    data_periodo_fine: '2024-01-15T23:59:59Z',
    artisti_coinvolti: 0,
    opere_analizzate: 0,
    importo_totale: 0,
    creato_da: 'Giuseppe Verdi'
  }
]

export default function ReportPage() {
  const reports = reportPlaceholder
  const [filteredReports, setFilteredReports] = useState<Report[]>(reportPlaceholder)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('tutti')
  const [typeFilter, setTypeFilter] = useState<string>('tutti')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)

  useEffect(() => {
    let filtered = reports

    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.titolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.creato_da.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'tutti') {
      filtered = filtered.filter(report => report.stato === statusFilter)
    }

    if (typeFilter !== 'tutti') {
      filtered = filtered.filter(report => report.tipo === typeFilter)
    }

    setFilteredReports(filtered)
  }, [searchTerm, statusFilter, typeFilter, reports])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    const endDate = new Date(end).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    return `${startDate} - ${endDate}`
  }

  const getStatusBadge = (stato: Report['stato']) => {
    const variants = {
      completato: { variant: 'default' as const, icon: CheckCircle, text: 'Completato', color: 'text-green-600' },
      in_elaborazione: { variant: 'secondary' as const, icon: TrendingUp, text: 'In Elaborazione', color: 'text-blue-600' },
      errore: { variant: 'destructive' as const, icon: AlertCircle, text: 'Errore', color: 'text-red-600' },
      programmato: { variant: 'outline' as const, icon: Calendar, text: 'Programmato', color: 'text-gray-600' }
    }
    
    const config = variants[stato]
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  const getTypeBadge = (tipo: Report['tipo']) => {
    const colors = {
      mensile: 'bg-blue-100 text-blue-800',
      trimestrale: 'bg-green-100 text-green-800',
      annuale: 'bg-purple-100 text-purple-800',
      personalizzato: 'bg-orange-100 text-orange-800'
    }
    
    return (
      <Badge variant="outline" className={colors[tipo]}>
        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6 lg:space-y-8 p-4 lg:p-0">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Report</h1>
        <p className="text-muted-foreground text-sm lg:text-base">
          Gestione e visualizzazione dei report di distribuzione
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Report Totali</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">+2 questo mese</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completati</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">
              {reports.filter(r => r.stato === 'completato').length}
            </div>
            <p className="text-xs text-muted-foreground">83% del totale</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Elaborazione</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">
              {reports.filter(r => r.stato === 'in_elaborazione').length}
            </div>
            <p className="text-xs text-muted-foreground">Tempo stimato: 2h</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Importo Totale</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">
              €{reports.filter(r => r.stato === 'completato').reduce((sum, r) => sum + r.importo_totale, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Report completati</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filtri e Ricerca</CardTitle>
        </CardHeader>
        <CardContent className="p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Cerca per titolo o creatore..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti gli stati</SelectItem>
                  <SelectItem value="completato">Completato</SelectItem>
                  <SelectItem value="in_elaborazione">In Elaborazione</SelectItem>
                  <SelectItem value="errore">Errore</SelectItem>
                  <SelectItem value="programmato">Programmato</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti i tipi</SelectItem>
                  <SelectItem value="mensile">Mensile</SelectItem>
                  <SelectItem value="trimestrale">Trimestrale</SelectItem>
                  <SelectItem value="annuale">Annuale</SelectItem>
                  <SelectItem value="personalizzato">Personalizzato</SelectItem>
                </SelectContent>
              </Select>
              
              <Button className="w-full sm:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Nuovo Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table/Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Elenco Report</span>
            <Badge variant="secondary">
              {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'report'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titolo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Artisti</TableHead>
                  <TableHead>Opere</TableHead>
                  <TableHead>Importo</TableHead>
                  <TableHead>Creato</TableHead>
                  <TableHead className="w-[50px]">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-medium">{report.titolo}</div>
                        <div className="text-sm text-muted-foreground">da {report.creato_da}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(report.tipo)}</TableCell>
                    <TableCell>{getStatusBadge(report.stato)}</TableCell>
                    <TableCell className="text-sm">
                      {formatPeriod(report.data_periodo_inizio, report.data_periodo_fine)}
                    </TableCell>
                    <TableCell>{report.artisti_coinvolti.toLocaleString()}</TableCell>
                    <TableCell>{report.opere_analizzate.toLocaleString()}</TableCell>
                    <TableCell>
                      {report.importo_totale > 0 ? `€${report.importo_totale.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(report.data_creazione)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedReport(report)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizza
                          </DropdownMenuItem>
                          {report.stato === 'completato' && (
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Scarica
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4 p-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{report.titolo}</h3>
                        <p className="text-sm text-muted-foreground">da {report.creato_da}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedReport(report)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizza
                          </DropdownMenuItem>
                          {report.stato === 'completato' && (
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Scarica
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {getTypeBadge(report.tipo)}
                      {getStatusBadge(report.stato)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Periodo:</span>
                        <div className="font-medium text-xs">
                          {formatPeriod(report.data_periodo_inizio, report.data_periodo_fine)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Creato:</span>
                        <div className="font-medium text-xs">{formatDate(report.data_creazione)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Artisti:</span>
                        <div className="font-medium">{report.artisti_coinvolti.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Opere:</span>
                        <div className="font-medium">{report.opere_analizzate.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    {report.importo_totale > 0 && (
                      <div className="pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Dettagli dell&apos;importo:</span>
                        <div className="text-lg font-bold text-green-600">
                          €{report.importo_totale.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Details Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedReport.titolo}
                </DialogTitle>
                <DialogDescription>
                  Report creato da {selectedReport.creato_da} il {formatDate(selectedReport.data_creazione)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Tipo Report:</span>
                    <div>{getTypeBadge(selectedReport.tipo)}</div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Stato:</span>
                    <div>{getStatusBadge(selectedReport.stato)}</div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Periodo Analizzato:</span>
                    <div className="font-medium">
                      {formatPeriod(selectedReport.data_periodo_inizio, selectedReport.data_periodo_fine)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Data Creazione:</span>
                    <div className="font-medium">{formatDate(selectedReport.data_creazione)}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedReport.artisti_coinvolti.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Artisti Coinvolti</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedReport.opere_analizzate.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Opere Analizzate</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedReport.importo_totale > 0 ? `€${selectedReport.importo_totale.toLocaleString()}` : 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">Importo Totale</div>
                    </CardContent>
                  </Card>
                </div>
                
                {selectedReport.stato === 'completato' && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Scarica PDF
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Scarica Excel
                    </Button>
                  </div>
                )}
                
                {selectedReport.stato === 'errore' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Errore durante l'elaborazione</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">
                      Si è verificato un errore durante la generazione del report. 
                      Verificare i dati del periodo selezionato e riprovare.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}