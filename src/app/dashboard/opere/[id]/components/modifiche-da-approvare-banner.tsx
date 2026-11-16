'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardCheck } from 'lucide-react'
import { listModificheOpera } from '@/features/approvazioni/services/approvazioni.service'

/**
 * Sulla scheda opera, per admin e Operatore pro: quante modifiche di
 * Operatori base e Tirocinanti aspettano la revisione (fase 2b).
 */
export function ModificheDaApprovareBanner({ operaId, refreshKey }: { operaId: string; refreshKey?: unknown }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    void listModificheOpera(operaId).then(({ data, error }) => {
      if (cancelled || error) return
      setCount(data.filter((modifica) => !modifica.esito).length)
    })
    return () => {
      cancelled = true
    }
  }, [operaId, refreshKey])

  if (count === 0) return null
  return (
    <div role="status" className="flex flex-wrap items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
      <ClipboardCheck className="h-4 w-4 shrink-0" />
      <span>
        {count === 1 ? '1 modifica' : `${count} modifiche`} di Operatori base o Tirocinanti da rivedere.
      </span>
      <Link href={`/dashboard/approvazioni/${operaId}`} className="font-medium underline">
        Apri la revisione
      </Link>
    </div>
  )
}
