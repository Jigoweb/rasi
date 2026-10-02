import type { Database, Json } from '@/shared/lib/supabase'

export type AmbitoArtista = Database['public']['Enums']['ambito_artista']

export const AMBITO_LABELS: Record<AmbitoArtista, string> = {
  musica: 'Musica',
  cinema: 'Cinema',
  entrambi: 'Entrambi',
}

export function formatAmbitoLabel(ambito: AmbitoArtista | null | undefined): string {
  if (!ambito) return '—'
  return AMBITO_LABELS[ambito] ?? ambito
}

export function parseDirittiAttivi(diritti: Json | null | undefined): string[] {
  if (!diritti) return []
  if (Array.isArray(diritti)) {
    return diritti.map((d) => String(d)).filter(Boolean)
  }
  if (typeof diritti === 'object') {
    return Object.keys(diritti as Record<string, unknown>)
  }
  return []
}

export function formatDirittiCompact(diritti: Json | null | undefined, maxVisible = 2): {
  labels: string[]
  remaining: number
  total: number
} {
  const all = parseDirittiAttivi(diritti)
  return {
    labels: all.slice(0, maxVisible),
    remaining: Math.max(0, all.length - maxVisible),
    total: all.length,
  }
}

export function shouldShowFineMandato(stato: string | null | undefined): boolean {
  return stato === 'cessato' || stato === 'sospeso'
}
