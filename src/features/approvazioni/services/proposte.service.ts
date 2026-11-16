import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/shared/lib/supabase-client'
import type { Database, Json } from '@/shared/lib/supabase'
import {
  operazioneBatch,
  validaProposta,
  type EntitaProponibile,
  type OperazioneProposta,
  type PayloadProposta,
  type RigaBatch,
} from '@/features/approvazioni/lib/modifica-payload'

type DbClient = SupabaseClient<Database>

export type Proposta = {
  id: string
  entita: string
  entita_id: string | null
  opera_id: string | null
  operazione: OperazioneProposta
  payload: PayloadProposta
  stato: 'in_attesa' | 'approvata' | 'respinta'
  proposta_da: string
  revisionata_da: string | null
  nota_revisione: string | null
  creata_il: string
  revisionata_il: string | null
}

const PROPOSTA_SELECT =
  'id, entita, entita_id, opera_id, operazione, payload, stato, proposta_da, revisionata_da, nota_revisione, creata_il, revisionata_il'

export async function proponiModifica(
  input: {
    entita: EntitaProponibile
    operazione?: OperazioneProposta
    operaId?: string | null
    entitaId?: string | null
    dopo?: Record<string, unknown> | null
    righe?: RigaBatch[] | null
  },
  client: DbClient = supabase as DbClient,
) {
  const batch = Boolean(input.righe && input.righe.length > 0)
  const operazione = input.operazione ?? (batch ? operazioneBatch(input.righe ?? []) : 'update')
  const esito = validaProposta({
    entita: input.entita,
    operazione,
    dopo: input.dopo,
    righe: input.righe,
    batch,
  })
  if (!esito.ok) return { id: null as string | null, error: { message: esito.error } }

  const payload = batch
    ? { batch: true, righe: (input.righe ?? []).map((riga) => ({
      entita: riga.entita,
      operazione: riga.operazione,
      entita_id: riga.entitaId ?? null,
      dopo: riga.dopo ?? {},
    })) }
    : { dopo: input.dopo ?? {} }

  const { data, error } = await client.rpc('proponi_modifica', {
    p_entita: input.entita,
    p_operazione: operazione,
    p_payload: payload as Json,
    p_entita_id: input.entitaId ?? null,
    p_opera_id: input.operaId ?? null,
  })
  if (error) return { id: null as string | null, error }
  return { id: typeof data === 'string' ? data : null, error: null }
}

export async function approvaModifica(id: string, nota?: string | null) {
  const { error } = await supabase.rpc('approva_modifica', {
    p_id: id,
    p_nota: nota ?? null,
  })
  return { error }
}

export async function respingiModifica(id: string, nota?: string | null) {
  const { error } = await supabase.rpc('respingi_modifica', {
    p_id: id,
    p_nota: nota ?? null,
  })
  return { error }
}

export async function listProposteInAttesa() {
  const { data, error } = await supabase
    .from('modifiche_proposte')
    .select(PROPOSTA_SELECT)
    .eq('stato', 'in_attesa')
    .order('creata_il', { ascending: true })
  return { data: (data ?? []) as Proposta[], error }
}

export async function listProposteOpera(operaId: string) {
  const { data, error } = await supabase
    .from('modifiche_proposte')
    .select('id, entita, operazione, creata_il')
    .eq('opera_id', operaId)
    .eq('stato', 'in_attesa')
  return { data: data ?? [], error }
}

export async function contaProposteInAttesa() {
  const { count, error } = await supabase
    .from('modifiche_proposte')
    .select('id', { count: 'exact', head: true })
    .eq('stato', 'in_attesa')
  return { count: count ?? 0, error }
}
