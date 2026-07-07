import type { IndividuazioneStatus } from '@/features/individuazioni/services/individuazioni.service'

export function getNextIndividuazioneId(
  individuazioni: Array<{ id: string }>,
  currentId: string
): string | null {
  const index = individuazioni.findIndex(item => item.id === currentId)
  if (index < 0 || index >= individuazioni.length - 1) return null
  return individuazioni[index + 1]?.id ?? null
}

export function getReviewStatusSuccessMessage(stato: IndividuazioneStatus): string {
  switch (stato) {
    case 'validato':
      return 'Individuazione validata'
    case 'respinto':
      return 'Individuazione respinta'
    case 'dubbioso':
      return 'Individuazione messa in revisione'
    default:
      return 'Stato aggiornato'
  }
}
