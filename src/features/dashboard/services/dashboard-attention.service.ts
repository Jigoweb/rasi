import type { SupabaseClient } from '@supabase/supabase-js'

export type AttentionSeverity = 'high' | 'medium' | 'low'

export type AttentionItem = {
  id: string
  severity: AttentionSeverity
  title: string
  count: number
  href: string
  description?: string
}

export type AttentionQueueInputs = {
  matchDaRevisionare: number
  uploadErrors: number
  campagneInCorso: number
  criticalOpereGaps: number
}

export type DashboardAttentionDeps = {
  countMatchDaRevisionare: () => Promise<number>
  countUploadErrors: () => Promise<number>
  countCampagneIndividuazioneInCorso: () => Promise<number>
}

const ATTENTION_QUEUE_CAP = 7

/**
 * Builds the Zona 1 attention queue from precomputed counts.
 * Omits zero-count items, orders by operational priority, caps at 7.
 */
export function buildAttentionQueue(inputs: AttentionQueueInputs): AttentionItem[] {
  const candidates: AttentionItem[] = [
    {
      id: 'match-da-revisionare',
      severity: 'high',
      title: 'Match da revisionare',
      count: inputs.matchDaRevisionare,
      href: '/dashboard/individuazioni',
      description: 'Individuazioni in coda di revisione (dubbioso / episodio mancante)',
    },
    {
      id: 'upload-campagne-errore',
      severity: 'high',
      title: 'Upload / campagne in errore',
      count: inputs.uploadErrors,
      href: '/dashboard/programmazioni',
      description: 'Job di upload o campagne programmazione in stato errore',
    },
    {
      id: 'campagne-individuazione-aperte',
      severity: 'medium',
      title: 'Campagne individuazione aperte',
      count: inputs.campagneInCorso,
      href: '/dashboard/individuazioni?stato=in_corso',
      description: 'Campagne di individuazione ancora in corso',
    },
    {
      id: 'gap-critici-matching-opere',
      severity: 'medium',
      title: 'Gap critici matching opere',
      count: inputs.criticalOpereGaps,
      href: '#data-health',
      description: 'Campi critici (titolo / anno) mancanti sul catalogo opere',
    },
  ]

  return candidates.filter(item => item.count > 0).slice(0, ATTENTION_QUEUE_CAP)
}

export async function loadAttentionQueue(
  deps: DashboardAttentionDeps,
  options: { criticalOpereGaps: number }
): Promise<AttentionItem[]> {
  const [matchDaRevisionare, uploadErrors, campagneInCorso] = await Promise.all([
    deps.countMatchDaRevisionare(),
    deps.countUploadErrors(),
    deps.countCampagneIndividuazioneInCorso(),
  ])

  return buildAttentionQueue({
    matchDaRevisionare,
    uploadErrors,
    campagneInCorso,
    criticalOpereGaps: options.criticalOpereGaps,
  })
}

export function createSupabaseAttentionDeps(supabase: SupabaseClient): DashboardAttentionDeps {
  const count = async (query: PromiseLike<{ count: number | null }>) => {
    const result = await query
    return result.count || 0
  }

  return {
    // Review queue: stato 'dubbioso' (episodio_mancante rows are promoted to dubbioso by the matcher).
    // Legacy 'in_revisione' is not in the DB enum; keep dubbioso-only for exact counts.
    countMatchDaRevisionare: () =>
      count(
        (supabase as any)
          .from('individuazioni')
          .select('id', { count: 'exact', head: true })
          .eq('stato', 'dubbioso')
      ),
    countUploadErrors: async () => {
      const [uploadJobsError, campagneError] = await Promise.all([
        count(
          (supabase as any)
            .from('upload_jobs')
            .select('id', { count: 'exact', head: true })
            .eq('stato', 'error')
        ),
        count(
          (supabase as any)
            .from('campagne_programmazione')
            .select('id', { count: 'exact', head: true })
            .eq('stato', 'error')
        ),
      ])
      return uploadJobsError + campagneError
    },
    countCampagneIndividuazioneInCorso: () =>
      count(
        (supabase as any)
          .from('campagne_individuazione')
          .select('id', { count: 'exact', head: true })
          .eq('stato', 'in_corso')
      ),
  }
}
