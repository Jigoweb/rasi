'use client'

import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { formatOraAttivita, tempoRelativo, type ActivityFeedItem } from './dashboard-home.types'

type DashboardActivityFeedProps = {
  items: ActivityFeedItem[]
  loading?: boolean
  /** Max rows to show; default 5. */
  maxItems?: number
  /** Show footer link to full history. Default true. */
  showHistoryLink?: boolean
  /** Compact dashboard mode vs fuller detail list. Default 'compact'. */
  variant?: 'compact' | 'full'
}

function ActivityMeta({ item, variant }: { item: ActivityFeedItem; variant: 'compact' | 'full' }) {
  const ora = formatOraAttivita(item.timestamp)
  const relativo = tempoRelativo(item.timestamp)
  const utente = item.utente?.trim()

  if (variant === 'full') {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
        <time dateTime={item.timestamp} title={relativo}>
          {ora}
          <span className="text-gray-400"> · {relativo}</span>
        </time>
        {utente ? (
          <span className="truncate" title={utente}>
            di {utente}
          </span>
        ) : (
          <span className="text-gray-400">Utente non disponibile</span>
        )}
      </div>
    )
  }

  return (
    <p className="text-xs text-gray-500 truncate">
      {item.dettaglio}
      <span className="text-gray-400"> · {ora}</span>
      <span className="text-gray-400"> · {relativo}</span>
      {utente ? <span className="text-gray-400"> · {utente}</span> : null}
    </p>
  )
}

export function DashboardActivityFeed({
  items,
  loading = false,
  maxItems = 5,
  showHistoryLink = true,
  variant = 'compact',
}: DashboardActivityFeedProps) {
  const visible = items.slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Attività recenti</CardTitle>
            <CardDescription className="text-sm">
              Ultime operazioni nel sistema con orario e autore
            </CardDescription>
          </div>
          {showHistoryLink && variant === 'compact' ? (
            <Button asChild variant="ghost" size="sm" className="shrink-0 -mt-1">
              <Link href="/dashboard/attivita">
                Vedi tutto
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nessuna attività recente</p>
        ) : (
          <ul className="divide-y">
            {visible.map((item, i) => {
              const body = (
                <div className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.label}</p>
                    {variant === 'full' ? (
                      <>
                        <p className="text-sm text-gray-600 truncate">{item.dettaglio}</p>
                        <ActivityMeta item={item} variant="full" />
                      </>
                    ) : (
                      <ActivityMeta item={item} variant="compact" />
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] uppercase tracking-wide text-gray-400">
                      {item.tipo.replace(/_/g, ' ')}
                    </span>
                    {item.href ? (
                      <ChevronRight className="h-4 w-4 text-gray-300" aria-hidden />
                    ) : null}
                  </div>
                </div>
              )

              return (
                <li key={`${item.tipo}-${item.id ?? item.timestamp}-${i}`}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="block hover:bg-gray-50 -mx-1 px-1 rounded transition-colors focus-visible:outline-none focus-visible:bg-gray-50"
                    >
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
      {showHistoryLink && variant === 'compact' && !loading && visible.length > 0 ? (
        <CardFooter className="pt-0">
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link href="/dashboard/attivita">Apri storico completo</Link>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )
}
