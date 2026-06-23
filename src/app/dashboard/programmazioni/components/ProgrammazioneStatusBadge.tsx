import { AlertCircle, Loader2 } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import type { ProgrammazioneRowBadge } from '@/features/programmazioni/services/programmazioni-state.service'
import { PROGRAMMAZIONE_STATUS_LABELS } from '@/shared/lib/dashboard-status-vocabulary'

interface ProgrammazioneStatusBadgeProps {
  badge: ProgrammazioneRowBadge
}

export default function ProgrammazioneStatusBadge({ badge }: ProgrammazioneStatusBadgeProps) {
  switch (badge) {
    case 'uploading':
      return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {PROGRAMMAZIONE_STATUS_LABELS.uploading}</Badge>
    case 'deleting':
      return <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {PROGRAMMAZIONE_STATUS_LABELS.deleting}</Badge>
    case 'upload_error':
    case 'error':
      return <Badge variant="destructive">Errore</Badge>
    case 'in_review':
      return <Badge variant="default">{PROGRAMMAZIONE_STATUS_LABELS.in_review}</Badge>
    case 'individuazione_stale':
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="w-3 h-3 mr-1" /> {PROGRAMMAZIONE_STATUS_LABELS.individuazione_stale}
        </Badge>
      )
    case 'individuazione_running':
      return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {PROGRAMMAZIONE_STATUS_LABELS.individuazione_running}</Badge>
    case 'individuata':
      return <Badge variant="default" className="bg-green-600">{PROGRAMMAZIONE_STATUS_LABELS.individuata}</Badge>
    case 'bozza':
      return <Badge variant="outline">{PROGRAMMAZIONE_STATUS_LABELS.bozza}</Badge>
    default:
      return <Badge variant="secondary">{badge}</Badge>
  }
}
