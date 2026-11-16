import { supabaseService } from '../supabase.js'

const BUCKET = 'programmazioni-uploads'
export const UPLOAD_FILE_RETENTION_DAYS = 60
// Finestra controllata a ogni passaggio: i job tra 60 e 90 giorni. Quelli più
// vecchi sono già stati ripuliti nei giorni precedenti.
const WINDOW_DAYS = 30
const PAGE = 500

/**
 * Rimuove dal bucket i file degli upload più vecchi di 60 giorni.
 * Fino al 16/11/2026 il worker cancellava il file a fine upload; ora lo
 * conserva per consentire «Correggi dati dal file» senza ricaricarlo.
 * Rimuovere un file già assente non dà errore.
 */
export async function removeExpiredUploadFiles(now: Date = new Date()): Promise<number> {
  const day = 24 * 60 * 60 * 1000
  const until = new Date(now.getTime() - UPLOAD_FILE_RETENTION_DAYS * day).toISOString()
  const since = new Date(now.getTime() - (UPLOAD_FILE_RETENTION_DAYS + WINDOW_DAYS) * day).toISOString()

  let removed = 0
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseService
      .from('upload_jobs')
      .select('storage_path')
      .lt('created_at', until)
      .gte('created_at', since)
      .in('stato', ['completed', 'error', 'cancelled'])
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`upload_jobs: ${error.message}`)
    const paths = [...new Set((data ?? []).map((row) => row.storage_path as string).filter(Boolean))]
    if (paths.length > 0) {
      const { data: deleted, error: removeError } = await supabaseService.storage.from(BUCKET).remove(paths)
      if (removeError) throw new Error(`storage remove: ${removeError.message}`)
      removed += deleted?.length ?? 0
    }
    if (!data || data.length < PAGE) break
  }
  return removed
}
