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

/** Campagne individuazione ancora operative per la coda di revisione match. */
export const ACTIVE_CAMPAGNA_INDIVIDUAZIONE_STATI_FOR_REVIEW = [
  'bozza',
  'in_corso',
  'completata',
] as const

/**
 * Solo le campagne programmazione ancora `in_corso` contano come "aperte".
 * Dopo finalize la programmazione passa a `individuata` anche se la run
 * figlio può restare erroneamente `in_corso`.
 */
export const ACTIVE_PROGRAMMAZIONE_STATO_FOR_OPEN_RUNS = 'in_corso' as const

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
      description: 'Individuazioni dubbiose su campagne non archiviate',
    },
    {
      id: 'upload-campagne-errore',
      severity: 'high',
      title: 'Campagne programmazione in errore',
      count: inputs.uploadErrors,
      href: '/dashboard/programmazioni',
      description: 'Campagne programmazione attualmente in stato errore',
    },
    {
      id: 'campagne-individuazione-aperte',
      severity: 'medium',
      title: 'Campagne individuazione aperte',
      count: inputs.campagneInCorso,
      href: '/dashboard/individuazioni?stato=in_corso',
      description: 'Run di individuazione ancora in elaborazione',
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
  const count = async (query: PromiseLike<{ count: number | null; error?: { message: string } | null }>) => {
    const result = await query
    if (result.error) throw new Error(result.error.message)
    return result.count || 0
  }

  return {
    // Review queue: solo dubbioso su campagne ancora operative (non archiviate).
    countMatchDaRevisionare: () =>
      count(
        (supabase as any)
          .from('individuazioni')
          .select('id, campagne_individuazione!inner(stato)', { count: 'exact', head: true })
          .eq('stato', 'dubbioso')
          .in('campagne_individuazione.stato', [...ACTIVE_CAMPAGNA_INDIVIDUAZIONE_STATI_FOR_REVIEW])
      ),
    // Solo campagne attualmente in errore: i vecchi upload_jobs.error restano
    // anche dopo retry/chiusura e gonfiavano la coda.
    countUploadErrors: () =>
      count(
        (supabase as any)
          .from('campagne_programmazione')
          .select('id', { count: 'exact', head: true })
          .eq('stato', 'error')
      ),
    // Run ancora aperte solo se anche la programmazione padre è in_corso.
    countCampagneIndividuazioneInCorso: () =>
      count(
        (supabase as any)
          .from('campagne_individuazione')
          .select('id, campagne_programmazione!inner(stato)', { count: 'exact', head: true })
          .eq('stato', 'in_corso')
          .eq('campagne_programmazione.stato', ACTIVE_PROGRAMMAZIONE_STATO_FOR_OPEN_RUNS)
      ),
  }
}
