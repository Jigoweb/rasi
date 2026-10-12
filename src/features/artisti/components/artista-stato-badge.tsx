import { Badge } from '@/shared/components/ui/badge'
import { formatStatoLabel, type StatoIscrizione } from '@/features/artisti/lib/artista-display'

const STATO_STYLES: Record<StatoIscrizione, string> = {
  attivo: 'bg-green-50 text-green-700 border-green-200',
  minorenne: 'bg-sky-50 text-sky-700 border-sky-200',
  sospeso: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  cessato: 'bg-gray-50 text-gray-700 border-gray-200',
  deceduto: 'bg-zinc-100 text-zinc-700 border-zinc-300',
}

export function ArtistaStatoBadge({ stato }: { stato: string | null | undefined }) {
  if (!stato) return null
  const style = STATO_STYLES[stato as StatoIscrizione]
  if (!style) return <Badge variant="outline">Sconosciuto</Badge>
  return (
    <Badge variant="outline" className={style}>
      {formatStatoLabel(stato)}
    </Badge>
  )
}
