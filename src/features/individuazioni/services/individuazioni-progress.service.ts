import { supabase } from '@/shared/lib/supabase'
import {
  resolveProcessingActivity,
  type ProcessingActivitySource,
  type ProcessingJobState,
} from '@/features/programmazioni/services/programmazioni.service'

export interface IndividuazioneProcessingProgress {
  programmazioni_processate: number
  programmazioni_totali: number
  individuazioni_create: number
  percentuale: number
  processing_by?: string | null
  processing_started_at?: string | null
  last_activity_at?: string | null
  activity_source?: ProcessingActivitySource
  job_id?: string | null
  job_stato?: ProcessingJobState | null
  job_updated_at?: string | null
}

type CampaignJobActivity = {
  id?: string | null
  stato?: ProcessingJobState | null
  updated_at?: string | null
}

export function calculateProcessingPercent(processed: number, total: number): number {
  return total > 0 ? Math.round((processed / total) * 100) : 0
}

async function getLatestCampaignJobForProgrammazione(
  campagneProgrammazioneId: string,
  userId?: string | null
): Promise<CampaignJobActivity | null> {
  let query = (supabase as any)
    .from('campaign_jobs')
    .select('id, stato, updated_at')
    .eq('campagne_programmazione_id', campagneProgrammazioneId)
    .in('stato', ['queued', 'running', 'error'])
    .order('updated_at', { ascending: false })
    .limit(1)

  if (userId) query = query.eq('created_by', userId)

  const { data, error } = await query.maybeSingle()
  if (error) {
    console.warn('[getIndividuazioneProcessingProgress] campaign_jobs lookup failed:', error)
    return null
  }

  return (data as CampaignJobActivity) ?? null
}

export const getIndividuazioneProcessingProgress = async (
  campagnaIndId: string
): Promise<{ data: IndividuazioneProcessingProgress | null; error: any }> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const { data: campagnaInd, error: indError } = await (supabase as any)
      .from('campagne_individuazione')
      .select('statistiche, campagne_programmazione_id, campagne_programmazione(processing_by, processing_started_at)')
      .eq('id', campagnaIndId)
      .single()

    if (indError) throw indError

    const { count: individuazioni_create, error: countError } = await (supabase as any)
      .from('individuazioni')
      .select('*', { count: 'exact', head: true })
      .eq('campagna_individuazioni_id', campagnaIndId)

    if (countError) throw countError

    let last_activity_at: string | null = null
    if (individuazioni_create && individuazioni_create > 0) {
      const { data: lastInd, error: lastIndError } = await (supabase as any)
        .from('individuazioni')
        .select('created_at')
        .eq('campagna_individuazioni_id', campagnaIndId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!lastIndError && lastInd) {
        last_activity_at = lastInd.created_at
      }
    }

    const statistiche = campagnaInd?.statistiche || {}
    const campagnaProg = campagnaInd?.campagne_programmazione || {}
    const job = await getLatestCampaignJobForProgrammazione(
      campagnaInd?.campagne_programmazione_id,
      session?.user?.id
    )
    const activity = resolveProcessingActivity({ last_activity_at }, job)

    const programmazioni_totali = statistiche.programmazioni_totali || 0
    const programmazioni_processate = statistiche.programmazioni_processate || 0

    return {
      data: {
        programmazioni_processate,
        programmazioni_totali,
        individuazioni_create: individuazioni_create || 0,
        percentuale: calculateProcessingPercent(programmazioni_processate, programmazioni_totali),
        processing_by: campagnaProg.processing_by,
        processing_started_at: campagnaProg.processing_started_at,
        last_activity_at: activity.last_activity_at,
        activity_source: activity.activity_source,
        job_id: job?.id ?? null,
        job_stato: job?.stato ?? null,
        job_updated_at: job?.updated_at ?? null,
      },
      error: null,
    }
  } catch (error) {
    return { data: null, error }
  }
}
