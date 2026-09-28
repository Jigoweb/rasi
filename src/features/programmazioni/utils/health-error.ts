export type ProgrammazioniHealthErrorStage =
  | 'campagna'
  | 'conteggi'
  | 'campi'
  | 'periodo'

const STAGE_TIMEOUT_MESSAGES: Record<ProgrammazioniHealthErrorStage, string> = {
  campagna: 'Timeout nel caricamento del profilo emittente della campagna. Riprova tra poco.',
  conteggi:
    'Timeout sui conteggi di copertura (totale, processate, errori). Succede su campagne con molti record; riprova tra poco.',
  campi:
    'Timeout sul calcolo dei campi mancanti. Su campagne grandi il profilo qualità dati può non essere disponibile; riprova tra poco.',
  periodo: 'Timeout sul calcolo del periodo di copertura. Riprova tra poco.',
}

const STAGE_FALLBACK_MESSAGES: Record<ProgrammazioniHealthErrorStage, string> = {
  campagna: 'Impossibile caricare il profilo copertura dell’emittente.',
  conteggi: 'Impossibile calcolare i conteggi di copertura dati.',
  campi: 'Impossibile calcolare i campi mancanti per la copertura dati.',
  periodo: 'Periodo di copertura non disponibile.',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function readText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export function isProgrammazioniHealthTimeoutError(error: unknown): boolean {
  const record = asRecord(error)
  const code = readText(record.code)
  if (code === '57014') return true

  const message = readText(record.message, record.details, record.hint, error instanceof Error ? error.message : null).toLowerCase()
  return (
    message.includes('statement timeout')
    || message.includes('canceling statement')
    || message.includes('timed out')
    || /\btimeout\b/.test(message)
  )
}

/** HEAD count di PostgREST spesso restituiscono `{ message: "" }` senza code su timeout. */
export function isBlankProgrammazioniHealthError(error: unknown): boolean {
  if (error == null) return true
  if (typeof error === 'string') return !error.trim()
  if (error instanceof Error) return !error.message.trim()

  const record = asRecord(error)
  const meaningful = readText(record.message, record.details, record.hint, record.code)
  return !meaningful
}

export function describeProgrammazioniHealthError(
  error: unknown,
  stage: ProgrammazioniHealthErrorStage
): string {
  const treatAsTimeout = isProgrammazioniHealthTimeoutError(error)
    || (isBlankProgrammazioniHealthError(error) && stage !== 'campagna')

  if (treatAsTimeout) return STAGE_TIMEOUT_MESSAGES[stage]

  const record = asRecord(error)
  const code = readText(record.code)
  const raw = readText(
    record.message,
    record.details,
    error instanceof Error ? error.message : null,
    typeof error === 'string' ? error : null
  )

  if (code === 'PGRST116') {
    return stage === 'campagna'
      ? 'Campagna non trovata o senza emittente associato.'
      : STAGE_FALLBACK_MESSAGES[stage]
  }

  if (code === '42501' || /permission denied|not authorized|jwt/i.test(raw)) {
    return 'Permessi insufficienti per calcolare la copertura dati.'
  }

  if (raw && !/^[\{\[]/.test(raw)) return raw

  return STAGE_FALLBACK_MESSAGES[stage]
}

export function toProgrammazioniHealthError(
  error: unknown,
  stage: ProgrammazioniHealthErrorStage
): Error {
  const message = describeProgrammazioniHealthError(error, stage)
  const wrapped = new Error(message)
  ;(wrapped as Error & { cause?: unknown }).cause = error
  return wrapped
}
