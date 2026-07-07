'use client'

import { ChevronDown, Loader2 } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import type { IndividuazioneStatus } from '@/features/individuazioni/services/individuazioni.service'
import { getStatusDisplay } from '@/features/individuazioni/utils/individuazioni-detail'

const REVIEWABLE_STATUSES: IndividuazioneStatus[] = ['validato', 'dubbioso', 'respinto']

interface IndividuazioneStatusDropdownProps {
  stato?: IndividuazioneStatus | string | null
  disabled?: boolean
  saving?: boolean
  onSelectStatus: (stato: IndividuazioneStatus) => void
}

export default function IndividuazioneStatusDropdown({
  stato,
  disabled = false,
  saving = false,
  onSelectStatus,
}: IndividuazioneStatusDropdownProps) {
  const statusDisplay = getStatusDisplay(stato)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || saving}
          className={`h-8 gap-1.5 border ${getStatusBadgeClass(statusDisplay.tone)}`}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Badge className={`pointer-events-none border-0 px-1.5 py-0 ${getStatusBadgeClass(statusDisplay.tone)}`}>
              {statusDisplay.label}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {REVIEWABLE_STATUSES.map(option => {
          const optionDisplay = getStatusDisplay(option)
          return (
            <DropdownMenuItem
              key={option}
              disabled={normalizeStatus(stato) === option}
              onClick={() => onSelectStatus(option)}
            >
              <span className={`mr-2 inline-block h-2 w-2 rounded-full ${getStatusDotClass(optionDisplay.tone)}`} />
              {optionDisplay.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function normalizeStatus(stato?: IndividuazioneStatus | string | null) {
  if (stato === 'in_revisione') return 'dubbioso'
  if (stato === 'rifiutato') return 'respinto'
  return stato
}

function getStatusBadgeClass(tone: 'blue' | 'green' | 'red' | 'yellow' | 'muted') {
  switch (tone) {
    case 'green':
      return 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100'
    case 'blue':
      return 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
    case 'red':
      return 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
    case 'yellow':
      return 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
    default:
      return ''
  }
}

function getStatusDotClass(tone: 'blue' | 'green' | 'red' | 'yellow' | 'muted') {
  switch (tone) {
    case 'green':
      return 'bg-green-600'
    case 'blue':
      return 'bg-blue-600'
    case 'red':
      return 'bg-red-600'
    case 'yellow':
      return 'bg-amber-500'
    default:
      return 'bg-muted-foreground'
  }
}
