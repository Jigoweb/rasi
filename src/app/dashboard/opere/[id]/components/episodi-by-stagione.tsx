'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Edit, MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import {
  formatStagioneHeader,
  groupEpisodiByStagione,
  type StagioneKey,
} from '@/features/opere/lib/episodi-by-stagione'

export type EpisodioListItem = {
  id: string
  numero_stagione: number | null
  numero_episodio: number | null
  titolo_episodio: string | null
  titolo_episodio_originale: string | null
  data_prima_messa_in_onda: string | null
  durata_minuti: number | null
  imdb_tconst: string | null
  codice_isan: string | null
}

export type EpisodiByStagioneProps = {
  episodi: EpisodioListItem[]
  onEdit: (episodio: EpisodioListItem) => void
  onDelete: (episodio: EpisodioListItem) => void
  emptyActions?: ReactNode
}

function EpisodioActionsMenu({
  episodio,
  onEdit,
  onDelete,
}: {
  episodio: EpisodioListItem
  onEdit: (episodio: EpisodioListItem) => void
  onDelete: (episodio: EpisodioListItem) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Azioni episodio" variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(episodio)}>
          <Edit className="h-4 w-4 mr-2" />
          Modifica episodio
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(episodio)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Elimina episodio
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ImdbCell({ tconst }: { tconst: string | null }) {
  if (!tconst) return <span className="text-muted-foreground">—</span>
  return (
    <a
      href={`https://www.imdb.com/title/${tconst}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      {tconst}
    </a>
  )
}

export function EpisodiByStagione({
  episodi,
  onEdit,
  onDelete,
  emptyActions,
}: EpisodiByStagioneProps) {
  const [expanded, setExpanded] = useState<Set<StagioneKey>>(() => new Set())
  const groups = useMemo(() => groupEpisodiByStagione(episodi), [episodi])

  function toggleSeason(key: StagioneKey, open: boolean) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (open) next.add(key)
      else next.delete(key)
      return next
    })
  }

  if (episodi.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 px-4">
        <p className="text-muted-foreground">Nessun episodio associato</p>
        {emptyActions}
      </div>
    )
  }

  return (
    <div className="divide-y">
      {groups.map((group) => {
        const isExpanded = expanded.has(group.key)
        const canPeek = group.count >= 2
        const showPeek = canPeek && !isExpanded

        return (
          <div key={String(group.key)} className="py-2">
            <div className="flex items-center justify-between gap-3 px-4 pl-6 py-2">
              <h3 className="text-sm font-medium">
                {formatStagioneHeader(group.stagione, group.count)}
              </h3>
              {canPeek && isExpanded && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSeason(group.key, false)}
                >
                  Riduci
                </Button>
              )}
            </div>

            <div className="relative">
              <div className={showPeek ? 'max-h-[4.75rem] overflow-hidden' : undefined}>
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-3 px-4 pl-6">Episodio</TableHead>
                        <TableHead className="py-3 px-4">Titolo italiano</TableHead>
                        <TableHead className="py-3 px-4">Titolo originale</TableHead>
                        <TableHead className="py-3 px-4">Data</TableHead>
                        <TableHead className="py-3 px-4">Durata</TableHead>
                        <TableHead className="py-3 px-4">IMDb tconst</TableHead>
                        <TableHead className="py-3 px-4">Codice ISAN</TableHead>
                        <TableHead className="py-3 px-4 pr-6 w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.episodi.map((e) => (
                        <TableRow key={e.id} className="hover:bg-muted/50">
                          <TableCell className="py-4 px-4 pl-6">{e.numero_episodio ?? '—'}</TableCell>
                          <TableCell className="py-4 px-4">{e.titolo_episodio || '—'}</TableCell>
                          <TableCell className="py-4 px-4 italic text-muted-foreground">
                            {e.titolo_episodio_originale || '—'}
                          </TableCell>
                          <TableCell className="py-4 px-4">
                            {e.data_prima_messa_in_onda
                              ? new Date(e.data_prima_messa_in_onda).toLocaleDateString('it-IT')
                              : '—'}
                          </TableCell>
                          <TableCell className="py-4 px-4">
                            {e.durata_minuti ? `${e.durata_minuti} min` : '—'}
                          </TableCell>
                          <TableCell className="py-4 px-4 font-mono text-sm">
                            <ImdbCell tconst={e.imdb_tconst} />
                          </TableCell>
                          <TableCell className="py-4 px-4 font-mono text-sm">
                            {e.codice_isan || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="py-4 px-4 pr-6">
                            <EpisodioActionsMenu episodio={e} onEdit={onEdit} onDelete={onDelete} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="lg:hidden p-4 space-y-3">
                  {group.episodi.map((e) => (
                    <Card key={e.id} className="gap-4 py-4">
                      <CardContent className="space-y-2 px-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">
                              S{e.numero_stagione ?? '?'} E{e.numero_episodio ?? '?'}
                            </div>
                            <div className="text-sm">{e.titolo_episodio || '—'}</div>
                            {e.titolo_episodio_originale && (
                              <div className="text-sm italic text-muted-foreground">
                                {e.titolo_episodio_originale}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0">
                            <EpisodioActionsMenu episodio={e} onEdit={onEdit} onDelete={onDelete} />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {e.data_prima_messa_in_onda
                            ? new Date(e.data_prima_messa_in_onda).toLocaleDateString('it-IT')
                            : '—'}
                          {e.durata_minuti && ` • ${e.durata_minuti} min`}
                        </div>
                        {(e.imdb_tconst || e.codice_isan) && (
                          <div className="text-xs space-y-1">
                            {e.imdb_tconst && (
                              <div>
                                <a
                                  href={`https://www.imdb.com/title/${e.imdb_tconst}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline font-mono"
                                >
                                  IMDb: {e.imdb_tconst}
                                </a>
                              </div>
                            )}
                            {e.codice_isan && (
                              <div className="font-mono text-muted-foreground">
                                ISAN: {e.codice_isan}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {showPeek && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-card flex items-end justify-center pb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="pointer-events-auto rounded-full"
                    aria-expanded={false}
                    onClick={() => toggleSeason(group.key, true)}
                  >
                    Espandi stagione
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
