'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { supabase } from '@/shared/lib/supabase-client'
import { getErrorMessage } from '@/shared/lib/toast'
import {
  alertHref,
  groupAlertScadenze,
  loadAlertScadenze,
  segnaAlertVisti,
  type AlertScadenza,
} from '@/features/dashboard/services/alert-scadenze.service'

const PREVIEW_COUNT = 5

function severityDotClass(severita: string): string {
  if (severita === 'high') return 'bg-red-600'
  if (severita === 'medium') return 'bg-amber-500'
  return 'bg-gray-400'
}

function formatData(value: string): string {
  const [y, m, d] = value.split('-')
  return d && m && y ? `${d}/${m}/${y}` : value
}

const alertId = (alert: Pick<AlertScadenza, 'alert_key' | 'entity_id'>) => `${alert.alert_key}|${alert.entity_id}`

export function DashboardScadenzeAlert() {
  const [rows, setRows] = useState<AlertScadenza[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<Set<string>>(new Set())

  const reload = useCallback(async () => {
    try {
      setRows(await loadAlertScadenze(supabase))
      setError(null)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Impossibile caricare gli alert.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const categorie = useMemo(() => groupAlertScadenze(rows), [rows])

  const acknowledge = async (items: AlertScadenza[], pendingKey: string) => {
    setPending((current) => new Set(current).add(pendingKey))
    try {
      await segnaAlertVisti(supabase, items)
      const done = new Set(items.map(alertId))
      setRows((current) => current.filter((row) => !done.has(alertId(row))))
    } catch (ackError) {
      toast.error(getErrorMessage(ackError, 'Impossibile segnare l\'alert come visto.'))
    } finally {
      setPending((current) => {
        const next = new Set(current)
        next.delete(pendingKey)
        return next
      })
    }
  }

  const toggleExpanded = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section id="scadenze" className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Scadenze e alert
      </h2>
      <Card className="py-0 gap-0 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded" />
              ))}
            </div>
          ) : error ? (
            <p className="p-5 text-sm text-red-600">{error}</p>
          ) : categorie.length === 0 ? (
            <p className="p-5 text-sm text-gray-600">Nessuna scadenza o alert da gestire</p>
          ) : (
            <div className="divide-y">
              {categorie.map((categoria) => {
                const isExpanded = expanded.has(categoria.id)
                const visible = isExpanded ? categoria.items : categoria.items.slice(0, PREVIEW_COUNT)
                const allKey = `all:${categoria.id}`
                return (
                  <div key={categoria.id} className="px-4 py-3 space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {categoria.title}
                          <Badge variant="outline" className="ml-2 tabular-nums">{categoria.items.length}</Badge>
                        </p>
                        <p className="text-xs text-gray-500">{categoria.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-start sm:self-auto"
                        disabled={pending.has(allKey)}
                        onClick={() => {
                          if (window.confirm(`Segnare come visti tutti i ${categoria.items.length} alert di "${categoria.title}"?`)) {
                            void acknowledge(categoria.items, allKey)
                          }
                        }}
                      >
                        {pending.has(allKey) ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                        Segna tutti come visti
                      </Button>
                    </div>
                    <ul className="space-y-1">
                      {visible.map((alert) => {
                        const key = alertId(alert)
                        return (
                          <li key={key} className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-gray-50">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${severityDotClass(alert.severita)}`} aria-hidden />
                            <div className="min-w-0 flex-1">
                              <Link href={alertHref(alert)} className="text-sm font-medium text-gray-900 hover:text-primary">
                                {alert.titolo}
                              </Link>
                              <p className="text-xs text-gray-500 truncate">
                                {alert.dettaglio} · {formatData(alert.data_riferimento)}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 shrink-0"
                              disabled={pending.has(key)}
                              onClick={() => acknowledge([alert], key)}
                              title="Presa visione: l'alert non verrà più mostrato"
                            >
                              {pending.has(key) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              <span className="ml-1 hidden sm:inline">Visto</span>
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                    {categoria.items.length > PREVIEW_COUNT && (
                      <Button variant="link" size="sm" className="h-auto px-2" onClick={() => toggleExpanded(categoria.id)}>
                        {isExpanded ? (
                          <><ChevronUp className="h-4 w-4 mr-1" />Mostra meno</>
                        ) : (
                          <><ChevronDown className="h-4 w-4 mr-1" />Mostra tutti ({categoria.items.length})</>
                        )}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
