'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { tempoRelativo, type ActivityFeedItem } from './dashboard-home.types'

type DashboardActivityFeedProps = {
  items: ActivityFeedItem[]
  loading?: boolean
  /** Max rows to show; default 5. */
  maxItems?: number
}

export function DashboardActivityFeed({
  items,
  loading = false,
  maxItems = 5,
}: DashboardActivityFeedProps) {
  const visible = items.slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Attività recenti</CardTitle>
        <CardDescription className="text-sm">Ultime operazioni nel sistema</CardDescription>
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
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.label}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {item.dettaglio}
                      <span className="text-gray-400"> · {tempoRelativo(item.timestamp)}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-400 pt-0.5">
                    {item.tipo.replace(/_/g, ' ')}
                  </span>
                </div>
              )

              return (
                <li key={`${item.tipo}-${item.timestamp}-${i}`}>
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
    </Card>
  )
}
