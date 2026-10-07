import type { CastEsternoInput } from '@/features/opere/lib/cast-esterno'
import { primarietaDiRuolo } from '@/features/opere/lib/ruolo-cast'
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

export const replaceCastEsterno = async (operaId: string, rows: CastEsternoInput[]) => {
  const { error } = await supabase.rpc('replace_cast_esterno', {
    p_opera_id: operaId,
    p_rows: rows as unknown as Json,
  })
  return { error }
}

export const createCastEsterno = async (operaId: string, row: CastEsternoInput) => {
  const { data, error } = await supabase
    .from('cast_esterno')
    .insert({
      opera_id: operaId,
      nome: row.nome,
      personaggio: row.personaggio,
      ruolo: row.ruolo,
      primarieta: primarietaDiRuolo(row.ruolo),
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
  patch: Partial<Pick<CastEsternoRow, 'nome' | 'personaggio' | 'ruolo' | 'ordine'>>,
) => {
  const { data, error } = await supabase
    .from('cast_esterno')
    .update({
      ...patch,
      ...(patch.ruolo ? { primarieta: primarietaDiRuolo(patch.ruolo) } : {}),
    })
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
