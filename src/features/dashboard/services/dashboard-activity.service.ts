import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActivityFeedItem } from '../components/dashboard-home.types'

export type ActivityTipo =
  | 'artista'
  | 'opera'
  | 'campagna_individuazione'
  | 'campagna_programmazione'

export type AttivitaItem = ActivityFeedItem & {
  tipo: ActivityTipo
}

export type LoadActivityFeedOptions = {
  /** Max items after merge/sort. Default 5. */
  limit?: number
  /** Per-source fetch size before merge. Default max(limit, 10). */
  perSourceLimit?: number
}

type RawActivityRow = {
  id: string
  tipo: ActivityTipo
  label: string
  dettaglio: string
  timestamp: string
  href: string
  utenteId: string | null
}

const UPDATE_THRESHOLD_MS = 60_000

function isLikelyUpdate(createdAt: string | null | undefined, updatedAt: string | null | undefined): boolean {
  if (!createdAt || !updatedAt) return false
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > UPDATE_THRESHOLD_MS
}

export function buildArtistaActivity(row: {
  id: string
  nome: string | null
  cognome: string | null
  created_at: string | null
  updated_at?: string | null
  created_by?: string | null
  updated_by?: string | null
}): RawActivityRow | null {
  if (!row.id || !row.created_at) return null
  const updated = isLikelyUpdate(row.created_at, row.updated_at)
  return {
    id: row.id,
    tipo: 'artista',
    label: updated ? 'Artista aggiornato' : 'Nuovo artista registrato',
    dettaglio: [row.nome, row.cognome].filter(Boolean).join(' ').trim() || 'Senza nome',
    timestamp: updated && row.updated_at ? row.updated_at : row.created_at,
    href: `/dashboard/artisti/${row.id}`,
    utenteId: updated ? (row.updated_by ?? row.created_by ?? null) : (row.created_by ?? null),
  }
}

export function buildOperaActivity(row: {
  id: string
  titolo: string | null
  created_at: string | null
  updated_at?: string | null
  created_by?: string | null
  updated_by?: string | null
}): RawActivityRow | null {
  if (!row.id || !row.created_at) return null
  const updated = isLikelyUpdate(row.created_at, row.updated_at)
  return {
    id: row.id,
    tipo: 'opera',
    label: updated ? 'Opera aggiornata' : 'Nuova opera catalogata',
    dettaglio: row.titolo?.trim() || 'Senza titolo',
    timestamp: updated && row.updated_at ? row.updated_at : row.created_at,
    href: `/dashboard/opere/${row.id}`,
    utenteId: updated ? (row.updated_by ?? row.created_by ?? null) : (row.created_by ?? null),
  }
}

export function buildCampagnaIndividuazioneActivity(row: {
  id: string
  nome: string | null
  updated_at: string | null
  created_by?: string | null
}): RawActivityRow | null {
  if (!row.id || !row.updated_at) return null
  return {
    id: row.id,
    tipo: 'campagna_individuazione',
    label: 'Campagna completata',
    dettaglio: row.nome?.trim() || 'Senza nome',
    timestamp: row.updated_at,
    href: `/dashboard/individuazioni/${row.id}`,
    utenteId: row.created_by ?? null,
  }
}

export function buildCampagnaProgrammazioneActivity(row: {
  id: string
  nome: string | null
  created_at: string | null
  created_by?: string | null
}): RawActivityRow | null {
  if (!row.id || !row.created_at) return null
  return {
    id: row.id,
    tipo: 'campagna_programmazione',
    label: 'Nuova campagna programmazione',
    dettaglio: row.nome?.trim() || 'Senza nome',
    timestamp: row.created_at,
    href: `/dashboard/programmazioni/${row.id}`,
    utenteId: row.created_by ?? null,
  }
}

export function mergeAndSortActivities(rows: RawActivityRow[], limit: number): RawActivityRow[] {
  return [...rows]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}

export async function resolveActivityUserEmails(
  supabase: SupabaseClient,
  userIds: Array<string | null | undefined>
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter((id): id is string => Boolean(id)))]
  const entries = await Promise.all(
    unique.map(async id => {
      try {
        const { data, error } = await supabase.rpc('get_user_email_by_id', { user_id: id })
        if (error || !data) return [id, null] as const
        return [id, String(data)] as const
      } catch {
        return [id, null] as const
      }
    })
  )

  const map = new Map<string, string>()
  for (const [id, email] of entries) {
    if (email) map.set(id, email)
  }
  return map
}

export function attachUsersToActivities(
  rows: RawActivityRow[],
  emailsByUserId: Map<string, string>
): AttivitaItem[] {
  return rows.map(row => ({
    id: row.id,
    tipo: row.tipo,
    label: row.label,
    dettaglio: row.dettaglio,
    timestamp: row.timestamp,
    href: row.href,
    utenteId: row.utenteId,
    utente: row.utenteId ? (emailsByUserId.get(row.utenteId) ?? null) : null,
  }))
}

export async function loadActivityFeed(
  supabase: SupabaseClient,
  options: LoadActivityFeedOptions = {}
): Promise<AttivitaItem[]> {
  const limit = options.limit ?? 5
  const perSourceLimit = options.perSourceLimit ?? Math.max(limit, 10)

  const [ultArtisti, ultOpere, ultCampagneInd, ultCampagneProg] = await Promise.all([
    supabase
      .from('artisti')
      .select('id, nome, cognome, created_at, updated_at, created_by, updated_by')
      .order('updated_at', { ascending: false })
      .limit(perSourceLimit),
    supabase
      .from('opere')
      .select('id, titolo, created_at, updated_at, created_by, updated_by')
      .order('updated_at', { ascending: false })
      .limit(perSourceLimit),
    supabase
      .from('campagne_individuazione')
      .select('id, nome, updated_at, created_by, stato')
      .eq('stato', 'completata')
      .order('updated_at', { ascending: false })
      .limit(perSourceLimit),
    (supabase as any)
      .from('campagne_programmazione')
      .select('id, nome, created_at, created_by')
      .order('created_at', { ascending: false })
      .limit(perSourceLimit),
  ])

  const raw = mergeAndSortActivities(
    [
      ...(ultArtisti.data || []).map(buildArtistaActivity),
      ...(ultOpere.data || []).map(buildOperaActivity),
      ...(ultCampagneInd.data || []).map(buildCampagnaIndividuazioneActivity),
      ...(ultCampagneProg.data || []).map(buildCampagnaProgrammazioneActivity),
    ].filter((row): row is RawActivityRow => row != null),
    limit
  )

  const emails = await resolveActivityUserEmails(
    supabase,
    raw.map(row => row.utenteId)
  )

  return attachUsersToActivities(raw, emails)
}
