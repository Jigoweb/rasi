export const WORKER_POLL_INTERVAL_MS = 2500
export const WORKER_MAX_NETWORK_ERRORS = 10

export type CampaignJobStatus = 'queued' | 'running' | 'completed' | 'error' | 'cancelled'

export type CampaignJobPhase = 'init' | 'processing' | 'finalizing' | 'completed' | 'error'

export interface WorkerJobSnapshot {
  id: string
  stato: CampaignJobStatus
  fase: CampaignJobPhase | null
  campagne_programmazione_id: string
  campagne_individuazione_id: string | null
  programmazioni_totali: number | null
  programmazioni_processate: number | null
  individuazioni_create: number | null
  current_chunk: number | null
  total_chunks: number | null
  error: string | null
  created_by?: string | null
  updated_at?: string | null
}
