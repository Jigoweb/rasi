import type { Json } from '@/shared/lib/supabase'
import dirittiCatalog from '../../../../public/diritti-artisti.json'
import {
  parseDirittiAttivi,
  resolveAmbito,
  type AmbitoArtista,
} from './artista-display'

/**
 * Ordine richiesto da RASI.
 * `cinema` è l'ambito salvato per Video / audiovisivo.
 * `entrambi` è Interdisciplinare.
 * Il prestito è scritto qui come «- ALL -», che è la forma in anagrafica.
 */
export const DIRITTI_ORDER_BY_AMBITO: Record<AmbitoArtista, readonly string[]> = {
  entrambi: [
    'Art. 73 - AU - BR BROADCASTING',
    'Art 84 comma 2 - AV - BR BROADCASTING',
    'Artt. 73 e 73-bis - AU - CP COMMUNICATION TO THE PUBLIC',
    'Art 84 comma 3 - AV - CP COMMUNICATION TO THE PUBLIC',
    'Art. 80, comma 2, lett. c) - ALL - CP COMMUNICATION TO THE PUBLIC',
    'Art. 72, comma 1, lett. c) Art. 80, comma 2, lett. f) - ALL - LLE LENDING',
    'Art. 72, comma 1, lett. d) - AU - MA MAKING AVAILABLE',
    'Art 84 comma 3 - AV - MA MAKING AVAILABLE',
    'Art. 80, comma 2, lett. d) - ALL - MA MAKING AVAILABLE',
    'Artt. 71-septies e 71-octies - ALL - PC PRIVATE COPYING',
    'Art. 15 - ALL - PP PUBLIC PERFORMANCE',
    'Art. 72, comma 1, lett. c) Art. 80, comma 2, lett. f) - ALL - RE RENTAL',
    'Art. 72, comma 1, lett. a) Art. 80, comma 2, lett. b) - ALL - RP REPRODUCTION RIGHTS',
    'Art. 180-bis - ALL - RR RETRANSMISSION RIGHTS',
  ],
  cinema: [
    'Art 84 comma 2 - AV - BR BROADCASTING',
    'Art 84 comma 3 - AV - CP COMMUNICATION TO THE PUBLIC',
    'Art. 80, comma 2, lett. c) - ALL - CP COMMUNICATION TO THE PUBLIC',
    'Art. 72, comma 1, lett. c) Art. 80, comma 2, lett. f) - ALL - LLE LENDING',
    'Art 84 comma 3 - AV - MA MAKING AVAILABLE',
    'Art. 80, comma 2, lett. d) - ALL - MA MAKING AVAILABLE',
    'Artt. 71-septies e 71-octies - ALL - PC PRIVATE COPYING',
    'Art. 15 - ALL - PP PUBLIC PERFORMANCE',
    'Art. 72, comma 1, lett. c) Art. 80, comma 2, lett. f) - ALL - RE RENTAL',
    'Art. 72, comma 1, lett. a) Art. 80, comma 2, lett. b) - ALL - RP REPRODUCTION RIGHTS',
    'Art. 180-bis - ALL - RR RETRANSMISSION RIGHTS',
  ],
  musica: [
    'Art. 73 - AU - BR BROADCASTING',
    'Artt. 73 e 73-bis - AU - CP COMMUNICATION TO THE PUBLIC',
    'Art. 80, comma 2, lett. c) - ALL - CP COMMUNICATION TO THE PUBLIC',
    'Art. 72, comma 1, lett. c) Art. 80, comma 2, lett. f) - ALL - LLE LENDING',
    'Art. 72, comma 1, lett. d) - AU - MA MAKING AVAILABLE',
    'Art. 80, comma 2, lett. d) - ALL - MA MAKING AVAILABLE',
    'Artt. 71-septies e 71-octies - ALL - PC PRIVATE COPYING',
    'Art. 15 - ALL - PP PUBLIC PERFORMANCE',
    'Art. 72, comma 1, lett. c) Art. 80, comma 2, lett. f) - ALL - RE RENTAL',
    'Art. 72, comma 1, lett. a) Art. 80, comma 2, lett. b) - ALL - RP REPRODUCTION RIGHTS',
    'Art. 180-bis - ALL - RR RETRANSMISSION RIGHTS',
  ],
}

const LENDING_CANONICAL = 'Art. 72, comma 1, lett. c) Art. 80, comma 2, lett. f) - ALL - LLE LENDING'

function collapse(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase()
}

/**
 * Il JSON di catalogo ha «- AL - LLE LENDING». In anagrafica la stessa voce è «- ALL -».
 * Il confronto le considera lo stesso diritto e non riscrive il testo.
 */
function aliasLending(upper: string): string {
  const canonical = collapse(LENDING_CANONICAL)
  const catalogSpelling = canonical.replace(' - ALL - ', ' - AL - ')
  if (upper === canonical || upper === catalogSpelling) return canonical
  return upper
}

const codeToKey = new Map<string, string>()
for (const diritto of dirittiCatalog.diritti) {
  codeToKey.set(collapse(diritto.codice), aliasLending(collapse(diritto.nome)))
}

export function normalizeDirittoKey(value: string): string {
  const collapsed = collapse(value)
  return codeToKey.get(collapsed) ?? aliasLending(collapsed)
}

function rankFor(ambito: AmbitoArtista): Map<string, number> {
  return new Map(
    DIRITTI_ORDER_BY_AMBITO[ambito].map((nome, index) => [normalizeDirittoKey(nome), index]),
  )
}

/** Riordina senza cambiare le stringhe. Ambito assente: ordine di ingresso. */
export function orderByDirittoLabel<T>(
  items: readonly T[],
  ambito: AmbitoArtista | null | undefined,
  labelOf: (item: T) => string,
): T[] {
  if (!ambito || items.length < 2) return [...items]
  const rank = rankFor(ambito)
  return items
    .map((item, originalIndex) => ({
      item,
      originalIndex,
      position: rank.get(normalizeDirittoKey(labelOf(item))),
    }))
    .sort((a, b) => {
      if (a.position !== undefined && b.position !== undefined) {
        return a.position - b.position || a.originalIndex - b.originalIndex
      }
      if (a.position !== undefined) return -1
      if (b.position !== undefined) return 1
      return a.originalIndex - b.originalIndex
    })
    .map((entry) => entry.item)
}

export function orderDirittiLabels(
  labels: readonly string[],
  ambito: AmbitoArtista | null | undefined,
): string[] {
  return orderByDirittoLabel(labels, ambito, (label) => label)
}

/**
 * Etichette da mostrare per un artista.
 * Prima l'ambito salvato; se è vuoto, la derivazione già usata in scheda (AU/AV).
 * Se l'ambito non è determinabile, resta l'ordine corrente.
 * Le voci fuori elenco restano in coda, nell'ordine in cui sono arrivate.
 */
export function dirittiLabelsInOrdine(
  diritti: Json | null | undefined,
  ambito: AmbitoArtista | null | undefined,
): string[] {
  return orderDirittiLabels(parseDirittiAttivi(diritti), resolveAmbito(ambito, diritti))
}
