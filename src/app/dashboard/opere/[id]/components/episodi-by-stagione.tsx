'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ChevronRight, Edit, MoreHorizontal, Trash2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
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
  alias_titoli?: string[] | null
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
  /** Senza menu Modifica/Elimina (opera validata per Operatore base e Tirocinante). */
  readOnly?: boolean
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
  readOnly = false,
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
    <div>
      {groups.map((group) => {
        const isExpanded = expanded.has(group.key)
        const canPeek = group.count >= 2
        const showPeek = canPeek && !isExpanded

        return (
          <div key={String(group.key)}>
            {canPeek ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 pl-6 py-2 bg-muted/50 text-left hover:bg-muted/70 transition-colors"
                aria-expanded={isExpanded}
                onClick={() => toggleSeason(group.key, !isExpanded)}
              >
                <ChevronRight
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                    isExpanded && 'rotate-90',
                  )}
                />
                <span className="text-sm font-medium">
                  {formatStagioneHeader(group.stagione, group.count)}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 pl-6 py-2 bg-muted/50">
                <span className="text-sm font-medium">
                  {formatStagioneHeader(group.stagione, group.count)}
                </span>
              </div>
            )}

            <div className="relative">
              <div className={showPeek ? 'max-h-[7.5rem] overflow-hidden' : undefined}>
                <div className="hidden lg:block">
                  <Table className="table-fixed w-full">
                    <colgroup>
                      <col className="w-20" />
                      <col className="w-[22%]" />
                      <col className="w-[22%]" />
                      <col className="w-28" />
                      <col className="w-24" />
                      <col className="w-32" />
                      <col className="w-32" />
                      <col className="w-14" />
                    </colgroup>
                    {!showPeek && (
                      <TableHeader>
                        <TableRow>
                          {(
                            [
                              ['Episodio', 'pl-6'],
                              ['Titolo italiano', ''],
                              ['Titolo originale', ''],
                              ['Data', ''],
                              ['Durata', ''],
                              ['IMDb tconst', ''],
                              ['Codice ISAN', ''],
                              [null, 'pr-6'],
                            ] as const
                          ).map(([label, extra], index) => (
                            <TableHead
                              key={label ?? `actions-${index}`}
                              className={cn('h-9 py-2 px-4', extra)}
                            >
                              {label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                    )}
                    <TableBody>
                      {group.episodi.map((e) => (
                        <TableRow key={e.id} className="hover:bg-muted/50">
                          <TableCell className="py-1.5 px-4 pl-6">{e.numero_episodio ?? '—'}</TableCell>
                          <TableCell className="py-1.5 px-4">
                            <div>{e.titolo_episodio || '—'}</div>
                            {Array.isArray(e.alias_titoli) && e.alias_titoli.length > 0 && (
                              <div className="text-xs text-muted-foreground">{e.alias_titoli.join(', ')}</div>
                            )}
                          </TableCell>
                          <TableCell className="py-1.5 px-4 italic text-muted-foreground">
                            {e.titolo_episodio_originale || '—'}
                          </TableCell>
                          <TableCell className="py-1.5 px-4">
                            {e.data_prima_messa_in_onda
                              ? new Date(e.data_prima_messa_in_onda).toLocaleDateString('it-IT')
                              : '—'}
                          </TableCell>
                          <TableCell className="py-1.5 px-4">
                            {e.durata_minuti ? `${e.durata_minuti} min` : '—'}
                          </TableCell>
                          <TableCell className="py-1.5 px-4 font-mono text-sm">
                            <ImdbCell tconst={e.imdb_tconst} />
                          </TableCell>
                          <TableCell className="py-1.5 px-4 font-mono text-sm">
                            {e.codice_isan || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="py-1.5 px-4 pr-6">
                            {!readOnly && <EpisodioActionsMenu episodio={e} onEdit={onEdit} onDelete={onDelete} />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="lg:hidden p-3 space-y-2">
                  {group.episodi.map((e) => (
                    <Card key={e.id} className="gap-2 py-3">
                      <CardContent className="space-y-1.5 px-3">
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
                            {Array.isArray(e.alias_titoli) && e.alias_titoli.length > 0 && (
                              <div className="text-xs text-muted-foreground">{e.alias_titoli.join(', ')}</div>
                            )}
                          </div>
                          <div className="shrink-0">
                            {!readOnly && <EpisodioActionsMenu episodio={e} onEdit={onEdit} onDelete={onDelete} />}
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
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent via-white/90 to-white flex items-end justify-center pb-2">
                  <button
                    type="button"
                    className="pointer-events-auto text-sm font-medium text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                    aria-expanded={false}
                    onClick={() => toggleSeason(group.key, true)}
                  >
                    Espandi
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
