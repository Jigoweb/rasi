import type { CastEsternoInput } from '@/features/opere/lib/cast-esterno'
import { supabase } from '@/shared/lib/supabase-client'
import type { Database, Json } from '@/shared/lib/supabase'

export type CastEsternoRow = Database['public']['Tables']['cast_esterno']['Row']

export const listCastEsterno = async (operaId: string) => {
  const { data, error } = await supabase
    .from('cast_esterno')
    .select('*')
    .eq('opera_id', operaId)
    .order('ordine', { ascending: true })
    .order('nome', { ascending: true })

  return { data, error }
}

/** Sostituisce il cast esterno dell'opera intera (episodioId null) o di un solo episodio. */
export const replaceCastEsterno = async (operaId: string, rows: CastEsternoInput[], episodioId: string | null = null) => {
  const { error } = await supabase.rpc('replace_cast_esterno', {
    p_opera_id: operaId,
    p_rows: rows as unknown as Json,
    p_episodio_id: episodioId,
  })
  return { error }
}

export const createCastEsterno = async (operaId: string, row: CastEsternoInput, episodioId: string | null = null) => {
  const { data, error } = await supabase
    .from('cast_esterno')
    .insert({
      opera_id: operaId,
      episodio_id: episodioId,
      nome: row.nome,
      personaggio: row.personaggio,
      primarieta: row.primarieta,
      imdb_nconst: row.imdb_nconst,
      fonte: row.fonte,
      ordine: row.ordine,
    })
    .select('*')
    .single()

  return { data, error }
}

export const updateCastEsterno = async (
  id: string,
  patch: Partial<Pick<CastEsternoRow, 'nome' | 'personaggio' | 'primarieta' | 'ordine' | 'episodio_id'>>,
) => {
  const { data, error } = await supabase
    .from('cast_esterno')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  return { data, error }
}

export const deleteCastEsterno = async (id: string) => {
  const { error } = await supabase
    .from('cast_esterno')
    .delete()
    .eq('id', id)

  return { error }
}

/** Righe di cast esterno che hanno già una scheda artista con lo stesso nome (o nconst IMDb). */
export const listCastEsternoArtistiCorrispondenti = async (operaId: string) => {
  const { data, error } = await supabase.rpc('cast_esterno_artisti_corrispondenti', {
    p_opera_id: operaId,
  })

  return { data: data ?? [], error }
}
