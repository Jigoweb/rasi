'use client'

import Link from 'next/link'
import { ArrowLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { formatOraAttivita, tempoRelativo, type ActivityFeedItem } from './dashboard-home.types'

type DashboardActivityHistoryProps = {
  items: ActivityFeedItem[]
  loading?: boolean
}

export function DashboardActivityHistory({
  items,
  loading = false,
}: DashboardActivityHistoryProps) {
  return (
    <div className="space-y-6 p-4 lg:p-0">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href="/dashboard">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Torna alla dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Storico attività</h1>
          <p className="text-gray-600 text-sm lg:text-base">
            Cronologia delle operazioni con orario, utente e collegamento alla scheda modificata
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Tutte le attività</CardTitle>
          <CardDescription className="text-sm">
            Ordinato dalla più recente; apri una riga per andare alla pagina correlata
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nessuna attività registrata</p>
          ) : (
            <ul className="divide-y">
              {items.map((item, i) => {
                const ora = formatOraAttivita(item.timestamp)
                const relativo = tempoRelativo(item.timestamp)
                const utente = item.utente?.trim()
                const content = (
                  <div className="flex items-start justify-between gap-3 py-3.5">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-medium text-gray-900">{item.label}</p>
                        <span className="text-[10px] uppercase tracking-wide text-gray-400">
                          {item.tipo.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 truncate">{item.dettaglio}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                        <time dateTime={item.timestamp} title={relativo}>
                          {ora}
                          <span className="text-gray-400"> · {relativo}</span>
                        </time>
                        {utente ? (
                          <span className="truncate" title={utente}>
                            Utente: {utente}
                          </span>
                        ) : (
                          <span className="text-gray-400">Utente non disponibile</span>
                        )}
                      </div>
                    </div>
                    {item.href ? (
                      <span className="shrink-0 inline-flex items-center gap-1 text-xs text-gray-500 pt-1">
                        Apri
                        <ChevronRight className="h-4 w-4 text-gray-300" aria-hidden />
                      </span>
                    ) : (
                      <ExternalLink className="h-4 w-4 text-gray-200 shrink-0 mt-1" aria-hidden />
                    )}
                  </div>
                )

                return (
                  <li key={`${item.tipo}-${item.id ?? item.timestamp}-${i}`}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="block hover:bg-gray-50 -mx-1 px-1 rounded transition-colors focus-visible:outline-none focus-visible:bg-gray-50"
                      >
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
