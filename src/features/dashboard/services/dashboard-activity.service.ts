import type { SupabaseClient } from '@supabase/supabase-js'
import { formatRuoloPrimarieta } from '@/features/opere/lib/cast-esterno'
import type { ActivityFeedItem } from '../components/dashboard-home.types'

export type ActivityTipo =
  | 'artista'
  | 'opera'
  | 'partecipazione'
  | 'cast_esterno'
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

type NamedRelation = { nome?: string | null; cognome?: string | null; titolo?: string | null; id?: string | null }

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function joinDettaglio(parts: Array<string | null | undefined>): string {
  const text = parts.map(part => part?.trim()).filter(Boolean).join(' — ')
  return text || 'Senza nome'
}

export function buildPartecipazioneActivity(row: {
  id: string
  opera_id?: string | null
  created_at: string | null
  updated_at?: string | null
  created_by?: string | null
  updated_by?: string | null
  artisti?: NamedRelation | NamedRelation[] | null
  opere?: NamedRelation | NamedRelation[] | null
}): RawActivityRow | null {
  if (!row.id || !row.created_at) return null
  const opera = relationOne(row.opere)
  const operaId = row.opera_id || opera?.id
  if (!operaId) return null

  const updated = isLikelyUpdate(row.created_at, row.updated_at)
  const artista = relationOne(row.artisti)
  const nome = [artista?.nome, artista?.cognome].filter(Boolean).join(' ').trim()

  return {
    id: row.id,
    tipo: 'partecipazione',
    label: updated ? 'Partecipazione aggiornata' : 'Nuova partecipazione',
    dettaglio: joinDettaglio([nome || 'Artista', opera?.titolo]),
    timestamp: updated && row.updated_at ? row.updated_at : row.created_at,
    href: `/dashboard/opere/${operaId}`,
    utenteId: updated ? (row.updated_by ?? row.created_by ?? null) : (row.created_by ?? null),
  }
}

export function buildCastEsternoActivity(row: {
  id: string
  nome: string | null
  ruolo?: string | null
  primarieta?: string | null
  opera_id?: string | null
  created_at: string | null
  updated_at?: string | null
  opere?: NamedRelation | NamedRelation[] | null
}): RawActivityRow | null {
  if (!row.id || !row.created_at) return null
  const opera = relationOne(row.opere)
  const operaId = row.opera_id || opera?.id
  if (!operaId) return null

  const updated = isLikelyUpdate(row.created_at, row.updated_at)
  const ruolo =
    row.ruolo || row.primarieta
      ? formatRuoloPrimarieta(row.ruolo, row.primarieta || 'comprimario')
      : null

  return {
    id: row.id,
    tipo: 'cast_esterno',
    label: updated ? 'Cast esterno aggiornato' : 'Cast esterno aggiunto',
    dettaglio: joinDettaglio([row.nome, ruolo, opera?.titolo]),
    timestamp: updated && row.updated_at ? row.updated_at : row.created_at,
    href: `/dashboard/opere/${operaId}`,
    // cast_esterno non ha created_by / updated_by.
    utenteId: null,
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

  const [ultArtisti, ultOpere, ultPartecipazioni, ultCastEsterno, ultCampagneInd, ultCampagneProg] =
    await Promise.all([
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
        .from('partecipazioni')
        .select('id, opera_id, created_at, updated_at, created_by, updated_by, artisti(nome, cognome), opere(id, titolo)')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(perSourceLimit),
      supabase
        .from('cast_esterno')
        .select('id, nome, ruolo, primarieta, opera_id, created_at, updated_at, opere(titolo)')
        .order('updated_at', { ascending: false, nullsFirst: false })
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
      ...(ultPartecipazioni.data || []).map(buildPartecipazioneActivity),
      ...(ultCastEsterno.data || []).map(buildCastEsternoActivity),
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
