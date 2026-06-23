import { Calendar, ChevronLeft, ChevronRight, Film, Loader2, User } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import type { Individuazione } from '@/features/individuazioni/services/individuazioni.service'

interface IndividuazioniDetailTableProps {
  individuazioni: Individuazione[]
  loadingData: boolean
  searchTerm: string
  page: number
  pageSize: number
  totalPages: number
  totalCount: number
  onPageChange: (page: number) => void
}

export default function IndividuazioniDetailTable({
  individuazioni,
  loadingData,
  searchTerm,
  page,
  pageSize,
  totalPages,
  totalCount,
  onPageChange,
}: IndividuazioniDetailTableProps) {
  return (
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
              individuazioni.map(ind => (
                <TableRow key={ind.id} className="hover:bg-muted/50">
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(ind.data_trasmissione)}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-sm">{formatTime(ind.ora_inizio)} - {formatTime(ind.ora_fine)}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="max-w-[200px]">
                      <p className="font-medium truncate" title={ind.titolo || ''}>{ind.titolo || '-'}</p>
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
                    <span className={`font-medium ${getMatchColor(ind.punteggio_matching)}`}>
                      {(ind.punteggio_matching * 100).toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <StatusBadge stato={ind.stato} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!loadingData && individuazioni.length > 0 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalCount)} di {formatNumber(totalCount)} individuazioni
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">Pagina {page} di {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ stato }: { stato: string | undefined }) {
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

function getArtistaDisplay(ind: Individuazione) {
  if (!ind.artisti) return '-'
  const nome = ind.artisti.nome_arte || `${ind.artisti.nome} ${ind.artisti.cognome}`.trim()
  return nome || '-'
}

function getMatchColor(score: number) {
  if (score >= 0.9) return 'text-green-600'
  if (score >= 0.7) return 'text-yellow-600'
  return 'text-red-600'
}

function formatNumber(num: number | undefined) {
  return (num || 0).toLocaleString('it-IT')
}

function formatDate(dateString: string | undefined) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatTime(timeString: string | undefined) {
  if (!timeString) return '-'
  return timeString.substring(0, 5)
}
