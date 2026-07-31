'use client'

import Link from 'next/link'
import { Activity, Calendar, Euro, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
  formatImportoEur,
  formatMatchingPercent,
  type DashboardKpiValues,
} from './dashboard-home.types'

type DashboardKpiStripProps = DashboardKpiValues & {
  loading?: boolean
}

const KPI_ITEMS: Array<{
  key: keyof DashboardKpiValues
  label: string
  href: string
  icon: typeof Activity
  format: (value: number | null) => string
}> = [
  {
    key: 'campagneAttive',
    label: 'Campagne attive',
    href: '/dashboard/individuazioni',
    icon: Activity,
    format: v => (v ?? 0).toLocaleString('it-IT'),
  },
  {
    key: 'tassoMatching',
    label: 'Tasso matching',
    href: '/dashboard/individuazioni',
    icon: TrendingUp,
    format: v => formatMatchingPercent(v),
  },
  {
    key: 'programmazioniMese',
    label: 'Programmazioni mese',
    href: '/dashboard/programmazioni',
    icon: Calendar,
    format: v => (v ?? 0).toLocaleString('it-IT'),
  },
  {
    key: 'importoDistribuito',
    label: 'Importo distribuito',
    href: '/dashboard/ripartizioni',
    icon: Euro,
    format: v => formatImportoEur(v ?? 0),
  },
]

export function DashboardKpiStrip({
  loading = false,
  campagneAttive,
  tassoMatching,
  programmazioniMese,
  importoDistribuito,
}: DashboardKpiStripProps) {
  const values: DashboardKpiValues = {
    campagneAttive,
    tassoMatching,
    programmazioniMese,
    importoDistribuito,
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-12 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {KPI_ITEMS.map(item => {
        const Icon = item.icon
        return (
          <Link
            key={item.key}
            href={item.href}
            className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="p-4 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-600 truncate">{item.label}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums tracking-tight">
                    {item.format(values[item.key])}
                  </p>
                </div>
                <Icon className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" aria-hidden />
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
