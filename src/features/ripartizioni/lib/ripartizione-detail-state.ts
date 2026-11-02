type RipartizioneLoadError = {
  code?: string | null
  message?: string | null
}

export type RipartizioneLoadOutcome = 'ok' | 'missing' | 'failed'

const MISSING_ROW_MESSAGE = 'JSON object requested, multiple (or no) rows returned'

/** Distingue una campagna assente da un errore di lettura nascosto. */
export function classifyRipartizioneLoadError(
  error: RipartizioneLoadError | null | undefined,
): RipartizioneLoadOutcome {
  if (!error) return 'ok'
  if (error.code === 'PGRST116') return 'missing'
  if ((error.message ?? '').includes(MISSING_ROW_MESSAGE)) return 'missing'
  return 'failed'
}
