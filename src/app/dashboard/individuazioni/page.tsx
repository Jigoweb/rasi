'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCampagneIndividuazione, CampagnaIndividuazione } from '@/features/individuazioni/services/individuazioni.service'
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
  BarChart3
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

export default function IndividuazioniPage() {
  const router = useRouter()
  const [campagne, setCampagne] = useState<CampagnaIndividuazione[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

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
                      <div className="flex items-center gap-2">
                        {getStatoBadge(campagna.stato)}
                        {campagna.stato === 'completata' && campagna.statistiche && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1 text-xs">
                                <p><strong>Programmazioni totali:</strong> {formatNumber(campagna.statistiche.programmazioni_totali)}</p>
                                <p><strong>Con match:</strong> {formatNumber(campagna.statistiche.programmazioni_con_match)}</p>
                                <p><strong>Senza match:</strong> {formatNumber(campagna.statistiche.programmazioni_senza_match)}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
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
    </div>
  )
}

