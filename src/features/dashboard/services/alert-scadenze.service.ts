import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/lib/supabase'

export type AlertScadenza = Database['public']['Functions']['get_alert_scadenze']['Returns'][number]

export type AlertCategoriaId =
  | 'documento_scadenza'
  | 'minorenne_da_aggiornare'
  | 'maggiore_eta'
  | 'over_80'
  | 'opera_av_50'
  | 'opera_musica_70'

export type AlertCategoria = {
  id: AlertCategoriaId
  title: string
  description: string
  items: AlertScadenza[]
}

/** Ordine di visualizzazione = priorità operativa. */
export const ALERT_CATEGORIE: Omit<AlertCategoria, 'items'>[] = [
  { id: 'documento_scadenza', title: 'Documenti scaduti o in scadenza', description: 'Entro 60 giorni' },
  { id: 'minorenne_da_aggiornare', title: 'Minorenni diventati maggiorenni', description: 'Stato ancora "Minorenne"' },
  { id: 'maggiore_eta', title: 'Compiono 18 anni', description: 'Entro un mese: inviare la nuova documentazione' },
  { id: 'over_80', title: 'Artisti con 80 anni o più', description: 'Hanno raggiunto o superato gli 80 anni' },
  { id: 'opera_av_50', title: 'Opere audiovisive con 50+ anni', description: 'Dall\'anno di produzione' },
  { id: 'opera_musica_70', title: 'Opere musicali con 70+ anni', description: 'Dall\'anno di produzione' },
]

export function groupAlertScadenze(rows: AlertScadenza[]): AlertCategoria[] {
  return ALERT_CATEGORIE.map((categoria) => ({
    ...categoria,
    items: rows.filter((row) => row.tipo === categoria.id),
  })).filter((categoria) => categoria.items.length > 0)
}

export function alertHref(alert: Pick<AlertScadenza, 'entity_type' | 'entity_id'>): string {
  return alert.entity_type === 'opera'
    ? `/dashboard/opere/${alert.entity_id}`
    : `/dashboard/artisti/${alert.entity_id}`
}

type Client = SupabaseClient<Database>

export async function loadAlertScadenze(client: Client): Promise<AlertScadenza[]> {
  const { data, error } = await client.rpc('get_alert_scadenze', {})
  if (error) throw error
  return data ?? []
}

/** "Presa visione": l'alert sparisce finché la data di riferimento non cambia. */
export async function segnaAlertVisti(
  client: Client,
  items: Pick<AlertScadenza, 'alert_key' | 'entity_id'>[],
): Promise<void> {
  if (items.length === 0) return
  const rows = items.map((item) => ({ alert_key: item.alert_key, entity_id: item.entity_id }))
  for (let start = 0; start < rows.length; start += 500) {
    const { error } = await client
      .from('alert_prese_visione')
      .upsert(rows.slice(start, start + 500), { onConflict: 'alert_key,entity_id', ignoreDuplicates: true })
    if (error) throw error
  }
}
