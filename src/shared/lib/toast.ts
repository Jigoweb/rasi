import { toast } from 'sonner'

export function getErrorMessage(error: unknown, fallback = 'Si è verificato un errore imprevisto.'): string {
  if (error instanceof Error) {
    return error.message.trim() || fallback
  }
  if (typeof error === 'string') {
    return error.trim() || fallback
  }
  if (error && typeof error === 'object') {
    const record = error as { code?: unknown; details?: unknown; hint?: unknown; message?: unknown }
    const details = typeof record.details === 'string' ? record.details.trim() : ''
    if (details) return details
    const message = typeof record.message === 'string' ? record.message.trim() : ''
    if (message) return message
    const hint = typeof record.hint === 'string' ? record.hint.trim() : ''
    if (hint) return hint
    const code = typeof record.code === 'string' ? record.code.trim() : ''
    if (code === '57014') {
      return 'Timeout del database: la query ha impiegato troppo tempo.'
    }
    if (code) return `Errore ${code}`
    return fallback
  }
  if (error == null) return fallback
  return String(error)
}

export function notifyError(title: string, error?: unknown) {
  const description = error !== undefined ? getErrorMessage(error) : undefined
  toast.error(title, description ? { description } : undefined)
}

export function notifySuccess(title: string, description?: string) {
  toast.success(title, description ? { description } : undefined)
}

export function notifyInfo(title: string, description?: string) {
  toast.info(title, description ? { description } : undefined)
}
