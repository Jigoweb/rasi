import { AlertCircle } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { isProcessingStale } from '@/features/programmazioni/services/programmazioni.service'
import type { IndividuazioneProcessingProgress } from '@/features/individuazioni/services/individuazioni.service'

interface IndividuazioneStatusBadgeProps {
  stato: string
  progress?: IndividuazioneProcessingProgress | null
  now?: number
}

export default function IndividuazioneStatusBadge({
  stato,
  progress,
  now,
}: IndividuazioneStatusBadgeProps) {
  switch (stato) {
    case 'completata':
      return <Badge className="bg-green-100 text-green-800 border-green-200">Completata</Badge>
    case 'in_corso':
      if (progress?.job_stato === 'error' || isProcessingStale(progress, now)) {
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="w-3 h-3 mr-1" /> Interrotto
          </Badge>
        )
      }

      if (!progress?.last_activity_at && progress?.job_stato !== 'running') {
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">Da verificare</Badge>
      }

      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In corso</Badge>
    case 'bozza':
      return <Badge variant="secondary">Bozza</Badge>
    case 'archiviata':
      return <Badge variant="outline">Archiviata</Badge>
    default:
      return <Badge variant="secondary">{stato}</Badge>
  }
}
