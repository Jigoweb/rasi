import { supabase } from '@/shared/lib/supabase-client'
import type { Database } from '@/shared/lib/supabase'

/**
 * Revisione delle modifiche di Operatore base e Tirocinante (fase 2b).
 * Tutte le letture e scritture passano dalle RPC della migration
 * 20261116160000: audit_log resta leggibile solo dall'admin.
 */

export type OperaDaApprovare = Database['public']['Functions']['lista_opere_da_approvare']['Returns'][number]
export type ModificaOperatore = Database['public']['Functions']['lista_modifiche_opera']['Returns'][number]

export const listOpereDaApprovare = async () => {
  const { data, error } = await supabase.rpc('lista_opere_da_approvare')
  return { data: (data ?? []) as OperaDaApprovare[], error }
}

export const contaOpereDaApprovare = async () => {
  const { data, error } = await supabase.rpc('conta_opere_da_approvare')
  return { data: typeof data === 'number' ? data : 0, error }
}

export const listModificheOpera = async (operaId: string) => {
  const { data, error } = await supabase.rpc('lista_modifiche_opera', { p_opera_id: operaId })
  return { data: (data ?? []) as ModificaOperatore[], error }
}

export const ripristinaModifica = async (auditLogId: number) => {
  const { error } = await supabase.rpc('ripristina_modifica', { p_audit_log_id: auditLogId })
  return { error }
}

export const approvaModificheOpera = async (operaId: string, valida: boolean) => {
  const { data, error } = await supabase.rpc('approva_modifiche_opera', { p_opera_id: operaId, p_valida: valida })
  return { data: data as { approvate: number; validata: boolean } | null, error }
}
