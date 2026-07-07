import type {
  IndividuazioneReviewScope,
  IndividuazioneScopeContext,
  IndividuazioneScopeCounts,
  RuoloScopeOption,
} from '@/features/individuazioni/services/individuazioni-review.service'
import type { IndividuazioneStatus } from '@/features/individuazioni/services/individuazioni.service'
import { getStatusDisplay } from '@/features/individuazioni/utils/individuazioni-detail'

export type ReviewScopeChoice =
  | { kind: 'single' }
  | { kind: 'opera' }
  | { kind: 'artista_opera' }
  | { kind: 'artista_opera_ruoli'; ruoloIds: string[] }

export function toReviewScope(choice: ReviewScopeChoice): IndividuazioneReviewScope {
  switch (choice.kind) {
    case 'single':
      return { type: 'single' }
    case 'opera':
      return { type: 'opera' }
    case 'artista_opera':
      return { type: 'artista_opera' }
    case 'artista_opera_ruoli':
      return { type: 'artista_opera_ruoli', ruoloIds: choice.ruoloIds }
  }
}

export function getDefaultScopeChoice(counts: IndividuazioneScopeCounts): ReviewScopeChoice {
  if (counts.opera > 1) return { kind: 'opera' }
  if (counts.artistaOpera > 1) return { kind: 'artista_opera' }
  return { kind: 'single' }
}

export function getScopeChoiceCount(choice: ReviewScopeChoice, counts: IndividuazioneScopeCounts): number {
  switch (choice.kind) {
    case 'single':
      return counts.single
    case 'opera':
      return counts.opera
    case 'artista_opera':
      return counts.artistaOpera
    case 'artista_opera_ruoli':
      return counts.ruoli
        .filter(ruolo => choice.ruoloIds.includes(ruolo.ruoloId))
        .reduce((sum, ruolo) => sum + ruolo.count, 0)
  }
}

export function getStatusActionLabel(stato: IndividuazioneStatus): string {
  switch (stato) {
    case 'validato':
      return 'Validare'
    case 'respinto':
      return 'Respingere'
    case 'dubbioso':
      return 'Mettere in revisione'
    default:
      return 'Aggiornare'
  }
}

export function getScopeOptionLabels(
  context: IndividuazioneScopeContext,
  counts: IndividuazioneScopeCounts
) {
  return {
    single: 'Solo questa individuazione',
    opera: `Tutte le individuazioni su «${context.operaTitolo}» (${counts.opera})`,
    artistaOpera: `Tutte per ${context.artistaDisplay} su «${context.operaTitolo}» (${counts.artistaOpera})`,
  }
}

export function getStatusConfirmTitle(stato: IndividuazioneStatus, count: number): string {
  const action = getStatusActionLabel(stato)
  const target = count === 1 ? '1 individuazione' : `${count} individuazioni`
  return `${action} ${target}?`
}

export function getStatusConfirmDescription(stato: IndividuazioneStatus): string {
  const label = getStatusDisplay(stato).label.toLowerCase()
  return `Le righe selezionate passeranno allo stato «${label}». Puoi limitare l'aggiornamento alla riga corrente o estenderlo ad altre righe collegate.`
}

export function toggleRuoloSelection(
  selectedRuoloIds: string[],
  ruoloId: string,
  checked: boolean
): string[] {
  if (checked) {
    return selectedRuoloIds.includes(ruoloId)
      ? selectedRuoloIds
      : [...selectedRuoloIds, ruoloId]
  }
  return selectedRuoloIds.filter(id => id !== ruoloId)
}

export function getRuoloSelectionCount(
  ruoli: RuoloScopeOption[],
  selectedRuoloIds: string[]
): number {
  return ruoli
    .filter(ruolo => selectedRuoloIds.includes(ruolo.ruoloId))
    .reduce((sum, ruolo) => sum + ruolo.count, 0)
}
