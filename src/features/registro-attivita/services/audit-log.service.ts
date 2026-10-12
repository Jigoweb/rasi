import { supabase } from '@/shared/lib/supabase-client'
import type { Database } from '@/shared/lib/supabase'

export type AuditLogEntry = Database['public']['Tables']['audit_log']['Row']

export type AuditLogFilters = {
  azione?: string
  tabella?: string
  utente?: string
  testo?: string
  dal?: string
  al?: string
  artistaId?: string
  operaId?: string
}

export const AUDIT_PAGE_SIZE = 50

/** Escape per i pattern ilike di PostgREST (% e _ letterali). */
function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

/**
 * Una pagina del registro, dal più recente. Chiede una riga in più per sapere
 * se ce ne sono altre senza contare l'intera tabella (che cresce senza limiti).
 */
export const listAuditLog = async (filters: AuditLogFilters, page = 0) => {
  let query = supabase
    .from('audit_log')
    .select('*')
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .range(page * AUDIT_PAGE_SIZE, page * AUDIT_PAGE_SIZE + AUDIT_PAGE_SIZE)

  if (filters.azione) query = query.eq('azione', filters.azione as AuditLogEntry['azione'])
  if (filters.tabella) query = query.eq('tabella', filters.tabella)
  if (filters.utente?.trim()) query = query.ilike('user_email', likePattern(filters.utente.trim()))
  if (filters.testo?.trim()) query = query.ilike('record_label', likePattern(filters.testo.trim()))
  // Giorni interpretati nel fuso del browser, non in UTC.
  if (filters.dal) query = query.gte('occurred_at', new Date(`${filters.dal}T00:00:00`).toISOString())
  if (filters.al) query = query.lte('occurred_at', new Date(`${filters.al}T23:59:59.999`).toISOString())
  if (filters.artistaId) query = query.eq('artista_id', filters.artistaId)
  if (filters.operaId) query = query.eq('opera_id', filters.operaId)

  const { data, error } = await query
  const rows = data ?? []
  return {
    data: rows.slice(0, AUDIT_PAGE_SIZE),
    hasMore: rows.length > AUDIT_PAGE_SIZE,
    error,
  }
}
