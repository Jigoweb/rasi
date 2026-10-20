import { supabase } from '@/shared/lib/supabase-client'
import type { Database, Json } from '@/shared/lib/supabase'
import type { TipoReferente } from '@/features/artisti/lib/artista-display'

export type ArtistaReferente = Database['public']['Tables']['artisti_referenti']['Row']
export type ArtistaReferenteInput = Omit<
  Database['public']['Tables']['artisti_referenti']['Insert'],
  'id' | 'artista_id' | 'created_at' | 'updated_at'
> & { tipo: TipoReferente }

export type CastEsternoCorrispondente =
  Database['public']['Functions']['cerca_cast_esterno_per_artista']['Returns'][number] & { ruolo: string }

export const getArtistaNote = async (artistaId: string) => {
  const { data, error } = await supabase
    .from('artisti_note')
    .select('*')
    .eq('artista_id', artistaId)
    .maybeSingle()

  return { data, error }
}

export const saveArtistaNote = async (artistaId: string, note: string) => {
  const { data, error } = await supabase
    .from('artisti_note')
    .upsert({ artista_id: artistaId, note }, { onConflict: 'artista_id' })
    .select('*')
    .single()

  return { data, error }
}

export const listArtistaReferenti = async (artistaId: string) => {
  const { data, error } = await supabase
    .from('artisti_referenti')
    .select('*')
    .eq('artista_id', artistaId)
    .order('tipo', { ascending: true })
    .order('cognome', { ascending: true, nullsFirst: false })
    .order('nome', { ascending: true })

  return { data, error }
}

export const createArtistaReferente = async (artistaId: string, input: ArtistaReferenteInput) => {
  const { data, error } = await supabase
    .from('artisti_referenti')
    .insert({ ...input, artista_id: artistaId })
    .select('*')
    .single()

  return { data, error }
}

export const updateArtistaReferente = async (id: string, input: Partial<ArtistaReferenteInput>) => {
  const { data, error } = await supabase
    .from('artisti_referenti')
    .update(input)
    .eq('id', id)
    .select('*')
    .single()

  return { data, error }
}

export const deleteArtistaReferente = async (id: string) => {
  const { error } = await supabase
    .from('artisti_referenti')
    .delete()
    .eq('id', id)

  return { error }
}

/** Righe di cast esterno che portano il nome (o il nconst IMDb) dell'artista. */
export const cercaCastEsternoPerArtista = async (artistaId: string) => {
  const { data, error } = await supabase.rpc('cerca_cast_esterno_per_artista', {
    p_artista_id: artistaId,
  })
  const rows = data ?? []
  if (error || rows.length === 0) return { data: [] as CastEsternoCorrispondente[], error }

  // Attore o doppiatore: serve per proporre il ruolo RASI giusto.
  const { data: ruoli } = await supabase
    .from('cast_esterno')
    .select('id, ruolo')
    .in('id', rows.map((row) => row.cast_id))
  const ruoloById = new Map((ruoli ?? []).map((row) => [row.id, row.ruolo]))

  return {
    data: rows.map((row) => ({ ...row, ruolo: ruoloById.get(row.cast_id) ?? 'attore' })),
    error: null,
  }
}

/** Converte le righe confermate in partecipazioni RASI. Ritorna quante ne ha create. */
export const convertiCastEsternoInPartecipazioni = async (
  artistaId: string,
  items: { cast_id: string; ruolo_id: string }[],
) => {
  const { data, error } = await supabase.rpc('converti_cast_esterno_in_partecipazioni', {
    p_artista_id: artistaId,
    p_items: items as unknown as Json,
  })

  return { data: typeof data === 'number' ? data : 0, error }
}
