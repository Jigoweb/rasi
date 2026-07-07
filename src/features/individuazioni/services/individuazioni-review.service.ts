import { supabase } from '@/shared/lib/supabase-client'
import type { Individuazione, IndividuazioneStatus } from './individuazioni.service'
import { normalizeIndividuazioneRow } from './individuazioni-review.shared'

export type IndividuazioneReviewScope =
  | { type: 'single' }
  | { type: 'opera' }
  | { type: 'artista_opera' }
  | { type: 'artista_opera_ruoli'; ruoloIds: string[] }

export interface RuoloScopeOption {
  ruoloId: string
  ruoloNome: string
  count: number
}

export interface IndividuazioneScopeCounts {
  single: number
  opera: number
  artistaOpera: number
  ruoli: RuoloScopeOption[]
}

export interface IndividuazioneScopeContext {
  campagnaId: string
  individuazioneId: string
  operaId: string
  artistaId: string
  ruoloId: string
  operaTitolo: string
  artistaDisplay: string
  ruoloNome: string
}

function buildStatusPayload(stato: IndividuazioneStatus, userId: string, noteValidazione?: string | null) {
  const payload: {
    stato: IndividuazioneStatus
    validato_da: string
    validato_il: string
    note_validazione?: string | null
  } = {
    stato,
    validato_da: userId,
    validato_il: new Date().toISOString(),
  }

  if (noteValidazione !== undefined) {
    payload.note_validazione = noteValidazione?.trim() || null
  }

  return payload
}

const INDIVIDUAZIONE_SELECT = `
  *,
  artisti(nome, cognome, nome_arte),
  opere(titolo, titolo_originale),
  ruoli_tipologie(nome)
`

export async function getIndividuazioneScopeCounts(
  context: IndividuazioneScopeContext
): Promise<{ data: IndividuazioneScopeCounts | null; error: unknown }> {
  try {
    const [{ count: operaCount, error: operaError }, { data: artistaRows, error: artistaError }] = await Promise.all([
      supabase
        .from('individuazioni')
        .select('id', { count: 'exact', head: true })
        .eq('campagna_individuazioni_id', context.campagnaId)
        .eq('opera_id', context.operaId),
      supabase
        .from('individuazioni')
        .select('id, ruolo_id, ruoli_tipologie(nome)')
        .eq('campagna_individuazioni_id', context.campagnaId)
        .eq('opera_id', context.operaId)
        .eq('artista_id', context.artistaId),
    ])

    if (operaError) return { data: null, error: operaError }
    if (artistaError) return { data: null, error: artistaError }

    const ruoloMap = new Map<string, RuoloScopeOption>()
    for (const row of artistaRows || []) {
      const ruoloId = row.ruolo_id as string
      if (!ruoloId) continue
      const ruoloRelation = row.ruoli_tipologie as { nome?: string } | { nome?: string }[] | null
      const ruoloNome = Array.isArray(ruoloRelation)
        ? ruoloRelation[0]?.nome
        : ruoloRelation?.nome
      const existing = ruoloMap.get(ruoloId)
      if (existing) {
        existing.count += 1
      } else {
        ruoloMap.set(ruoloId, {
          ruoloId,
          ruoloNome: ruoloNome || 'Ruolo',
          count: 1,
        })
      }
    }

    return {
      data: {
        single: 1,
        opera: operaCount ?? 0,
        artistaOpera: artistaRows?.length ?? 0,
        ruoli: Array.from(ruoloMap.values()).sort((a, b) => a.ruoloNome.localeCompare(b.ruoloNome, 'it')),
      },
      error: null,
    }
  } catch (error) {
    return { data: null, error }
  }
}

export async function updateIndividuazioniByScope(
  context: IndividuazioneScopeContext,
  scope: IndividuazioneReviewScope,
  stato: IndividuazioneStatus,
  noteValidazione?: string | null
): Promise<{ data: Individuazione[]; error: unknown }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) {
      return { data: [], error: new Error('Utente non autenticato') }
    }

    const payload = buildStatusPayload(stato, userId, noteValidazione)

    if (scope.type === 'single') {
      const { data, error } = await supabase
        .from('individuazioni')
        .update(payload)
        .eq('id', context.individuazioneId)
        .select(INDIVIDUAZIONE_SELECT)

      if (error || !data?.[0]) {
        return { data: [], error: error || new Error('Aggiornamento non riuscito') }
      }

      return { data: [normalizeIndividuazioneRow(data[0] as Individuazione)], error: null }
    }

    let query = supabase
      .from('individuazioni')
      .update(payload)
      .eq('campagna_individuazioni_id', context.campagnaId)
      .eq('opera_id', context.operaId)

    if (scope.type === 'artista_opera' || scope.type === 'artista_opera_ruoli') {
      query = query.eq('artista_id', context.artistaId)
    }

    if (scope.type === 'artista_opera_ruoli') {
      if (scope.ruoloIds.length === 0) {
        return { data: [], error: new Error('Seleziona almeno un ruolo') }
      }
      query = query.in('ruolo_id', scope.ruoloIds)
    }

    const { data, error } = await query.select(INDIVIDUAZIONE_SELECT)
    if (error) {
      return { data: [], error }
    }

    return {
      data: (data || []).map(row => normalizeIndividuazioneRow(row as Individuazione)),
      error: null,
    }
  } catch (error) {
    return { data: [], error }
  }
}

export async function updateIndividuazioniByIds(
  ids: string[],
  stato: IndividuazioneStatus,
  noteValidazione?: string | null
): Promise<{ data: Individuazione[]; error: unknown }> {
  if (ids.length === 0) {
    return { data: [], error: new Error('Nessuna individuazione selezionata') }
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) {
      return { data: [], error: new Error('Utente non autenticato') }
    }

    const payload = buildStatusPayload(stato, userId, noteValidazione)
    const { data, error } = await supabase
      .from('individuazioni')
      .update(payload)
      .in('id', ids)
      .select(INDIVIDUAZIONE_SELECT)

    if (error) {
      return { data: [], error }
    }

    return {
      data: (data || []).map(row => normalizeIndividuazioneRow(row as Individuazione)),
      error: null,
    }
  } catch (error) {
    return { data: [], error }
  }
}
