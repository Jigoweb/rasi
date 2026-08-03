/**
 * Normalizza i contatori di progresso individuazione per la UI.
 * Gestisce totali assenti/zeri (es. resume worker che non ha scritto
 * programmazioni_totali) evitando frazioni N/0, % a 0 e rimanenti negativi.
 */

export type IndividuazioneProgressCounts = {
  programmazioni_totali: number
  programmazioni_processate: number
  current_chunk: number
  total_chunks: number
  phase?: string | null
}

export type IndividuazioneProgressDisplay = {
  /** null = progresso indeterminato (totale sconosciuto) */
  percentage: number | null
  /** Es. "6.473/52.923" oppure "6.473 processate" */
  progressLabel: string
  /** null se non calcolabile in modo affidabile */
  remainingLabel: string | null
  /** Es. "130/1059", "130" o "—" */
  chunksLabel: string
  isIndeterminate: boolean
}

function formatCount(value: number): string {
  return Math.trunc(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function getIndividuazioneProgressDisplay(
  progress: IndividuazioneProgressCounts,
): IndividuazioneProgressDisplay {
  const processate = Math.max(0, Number(progress.programmazioni_processate) || 0)
  const totali = Math.max(0, Number(progress.programmazioni_totali) || 0)
  const chunk = Math.max(0, Number(progress.current_chunk) || 0)
  const totalChunks = Math.max(0, Number(progress.total_chunks) || 0)

  const hasTotal = totali > 0
  const isIndeterminate = !hasTotal

  const percentage = hasTotal
    ? Math.min(100, Math.round((processate / totali) * 100))
    : null

  const progressLabel = hasTotal
    ? `${formatCount(processate)}/${formatCount(totali)}`
    : processate > 0
      ? `${formatCount(processate)} processate`
      : 'In avvio…'

  const remainingLabel = hasTotal
    ? `${formatCount(Math.max(0, totali - processate))} rimanenti`
    : null

  const chunksLabel = totalChunks > 0
    ? `${chunk}/${totalChunks}`
    : chunk > 0
      ? String(chunk)
      : '—'

  return {
    percentage,
    progressLabel,
    remainingLabel,
    chunksLabel,
    isIndeterminate,
  }
}
