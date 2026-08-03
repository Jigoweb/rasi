import { AlertCircle } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { getIndividuazioneDisplayStatus } from '@/features/individuazioni/utils/individuazione-display-status'
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
  const display = getIndividuazioneDisplayStatus(stato, progress, now)

  switch (display) {
    case 'completata':
      return <Badge className="bg-green-100 text-green-800 border-green-200">Completata</Badge>
    case 'interrotto':
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="w-3 h-3 mr-1" /> Interrotto
        </Badge>
      )
    case 'da_verificare':
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">Da verificare</Badge>
    case 'in_corso':
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In corso</Badge>
    case 'bozza':
      return <Badge variant="secondary">Bozza</Badge>
    case 'archiviata':
      return <Badge variant="outline">Archiviata</Badge>
    default:
      return <Badge variant="secondary">{stato}</Badge>
  }
}
