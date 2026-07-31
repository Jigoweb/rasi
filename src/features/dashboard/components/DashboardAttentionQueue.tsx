'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import type { AttentionItem, AttentionSeverity } from './dashboard-home.types'

type DashboardAttentionQueueProps = {
  items: AttentionItem[]
  loading?: boolean
}

function severityDotClass(severity: AttentionSeverity): string {
  switch (severity) {
    case 'high':
      return 'bg-red-600'
    case 'medium':
      return 'bg-amber-500'
    default:
      return 'bg-gray-400'
  }
}

function severityLabel(severity: AttentionSeverity): string {
  switch (severity) {
    case 'high':
      return 'Alta'
    case 'medium':
      return 'Media'
    default:
      return 'Bassa'
  }
}

export function DashboardAttentionQueue({
  items,
  loading = false,
}: DashboardAttentionQueueProps) {
  return (
    <section id="attenzione" className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Richiede attenzione
      </h2>
      <Card className="py-0 gap-0 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">Nessuna azione urgente</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/programmazioni">Apri programmazioni</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map(item => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:bg-gray-50"
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${severityDotClass(item.severity)}`}
                      title={`Severità ${severityLabel(item.severity)}`}
                      aria-label={`Severità ${severityLabel(item.severity)}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      {item.description ? (
                        <p className="text-xs text-gray-500 truncate">{item.description}</p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="shrink-0 tabular-nums">
                      {item.count.toLocaleString('it-IT')}
                    </Badge>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
