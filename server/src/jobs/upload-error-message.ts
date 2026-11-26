const PG_MESSAGES: Record<string, string> = {
  '22008': 'Data o orario fuori intervallo',
  '22007': 'Formato di data o orario non valido',
  '22P02': 'Valore non valido per il tipo della colonna',
  '23502': 'Manca un valore obbligatorio',
  '57014': 'Tempo massimo di caricamento superato',
}

export interface UploadErrorRowRange {
  fileRowStart: number
  fileRowEnd: number
}

function errorParts(error: unknown): { code?: string; message: string } {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code
    return {
      code: typeof code === 'string' ? code : undefined,
      message: error.message,
    }
  }
  if (error && typeof error === 'object') {
    const record = error as { code?: unknown; message?: unknown }
    return {
      code: typeof record.code === 'string' ? record.code : undefined,
      message: typeof record.message === 'string' ? record.message : '',
    }
  }
  return { message: error == null ? '' : String(error) }
}

/**
 * Traduce gli errori Postgres più comuni del caricamento. Il testo originale
 * resta tra parentesi. Gli altri errori restano invariati.
 */
export function humanizeUploadError(error: unknown, range?: UploadErrorRowRange): string {
  const { code, message } = errorParts(error)
  const italian = code ? PG_MESSAGES[code] : undefined
  if (!italian) return message
  const rows = range ? ` (righe ${range.fileRowStart}–${range.fileRowEnd} del file)` : ''
  const original = message ? ` (${message})` : ''
  return `${italian}${rows}${original}`
}
