'use client'

import { useEffect, useState } from 'react'
import { getCatalogAuditLog } from '@/features/opere/services/opere.service'

const ACTION_LABELS: Record<string, string> = {
  insert: 'Creazione',
  update: 'Modifica',
  soft_delete: 'Rimozione',
  restore: 'Ripristino',
}

type AuditRow = {
  id: string
  action: string
  changed_fields: string[] | null
  created_at: string
  actor_id: string | null
}

export function CatalogAuditTimeline({
  entityType,
  entityId,
}: {
  entityType: 'opera' | 'episodio' | 'partecipazione'
  entityId: string
}) {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCatalogAuditLog(entityType, entityId).then(({ data }) => {
      if (!cancelled) {
        setRows((data as AuditRow[] | null) || [])
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [entityType, entityId])

  if (loading) {
    return <p className="text-sm text-muted-foreground">Caricamento storico...</p>
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessun evento registrato.</p>
  }

  return (
    <ol className="space-y-3">
      {rows.map((row) => (
        <li key={row.id} className="border-l-2 border-muted pl-3 text-sm">
          <div className="font-medium">{ACTION_LABELS[row.action] || row.action}</div>
          <div className="text-muted-foreground">
            {new Date(row.created_at).toLocaleString('it-IT')}
          </div>
          {row.changed_fields && row.changed_fields.length > 0 && row.action === 'update' && (
            <div className="text-muted-foreground">Campi: {row.changed_fields.join(', ')}</div>
          )}
        </li>
      ))}
    </ol>
  )
}
