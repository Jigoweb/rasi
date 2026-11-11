import { CheckCircle, Clock, Euro } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import {
  getRipartizioneStatusLabel,
  isStatoRipartizione,
  type StatoRipartizione,
} from '@/shared/lib/dashboard-status-vocabulary'

const STATUS_CLASS: Record<StatoRipartizione, string> = {
  pianificata: 'bg-blue-50 text-blue-700 border-blue-200',
  calcolata: 'bg-violet-50 text-violet-700 border-violet-200',
  approvata: 'bg-green-50 text-green-700 border-green-200',
  distribuita: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export function RipartizioneStatusBadge({ stato }: { stato: string | null | undefined }) {
  const label = getRipartizioneStatusLabel(stato)

  if (!stato || !isStatoRipartizione(stato)) {
    return <Badge variant="outline">{label}</Badge>
  }

  const Icon = stato === 'pianificata'
    ? Clock
    : stato === 'distribuita'
      ? Euro
      : CheckCircle

  return (
    <Badge variant="outline" className={STATUS_CLASS[stato]}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  )
}
