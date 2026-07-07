import { toast } from 'sonner'

export function getErrorMessage(error: unknown, fallback = 'Si è verificato un errore imprevisto.'): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const record = error as { details?: unknown; message?: unknown }
    if (typeof record.details === 'string') return record.details
    if (typeof record.message === 'string') return record.message
    try {
      return JSON.stringify(error)
    } catch {
      return fallback
    }
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
