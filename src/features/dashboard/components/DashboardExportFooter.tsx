'use client'

import Link from 'next/link'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

type DashboardExportFooterProps = {
  onExport: () => void
  isExporting: boolean
  /** True when this footer’s full-database export is the active job. */
  exportingThis?: boolean
}

export function DashboardExportFooter({
  onExport,
  isExporting,
  exportingThis = false,
}: DashboardExportFooterProps) {
  const busy = isExporting && exportingThis

  return (
    <footer className="border-t pt-4 mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-gray-500">
        Azioni secondarie · export completo e query ad hoc
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isExporting}
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Esportazione in corso…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Esporta banca dati
            </>
          )}
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/query">Apri Query</Link>
        </Button>
      </div>
    </footer>
  )
}
