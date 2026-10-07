export const RUOLI_CAST = [
  'attore_primario',
  'attore_comprimario',
  'doppiatore_primario',
  'doppiatore_comprimario',
] as const

export type RuoloCast = (typeof RUOLI_CAST)[number]

export const RUOLO_CAST_LABEL: Record<RuoloCast, string> = {
  attore_primario: 'Attore primario',
  attore_comprimario: 'Attore comprimario',
  doppiatore_primario: 'Doppiatore primario',
  doppiatore_comprimario: 'Doppiatore comprimario',
}

type Primarieta = 'primario' | 'comprimario'

interface RuoloCatalogo {
  codici: string[]
  nomi: string[]
  ruolo: RuoloCast
}

/** Codici e nomi già presenti in ruoli_tipologie (produzione RUO_* e seed locale). */
const CATALOGO: RuoloCatalogo[] = [
  {
    codici: ['RUO_1', 'PROT_PRIM'],
    nomi: ['primario', 'attore primario', 'protagonista primario'],
    ruolo: 'attore_primario',
  },
  {
    codici: ['RUO_2', 'COMP_PRIM'],
    nomi: ['comprimario', 'attore comprimario', 'comprimario primario'],
    ruolo: 'attore_comprimario',
  },
  {
    codici: ['RUO_3', 'DOPP_PRIM'],
    nomi: ['doppiatore primario'],
    ruolo: 'doppiatore_primario',
  },
  {
    codici: ['RUO_4'],
    nomi: ['doppiatore comprimario'],
    ruolo: 'doppiatore_comprimario',
  },
]

export function primarietaDiRuolo(ruolo: RuoloCast): Primarieta {
  return ruolo.endsWith('_primario') ? 'primario' : 'comprimario'
}

export function ruoloDaPrimarieta(primarieta: Primarieta | null | undefined): RuoloCast {
  return primarieta === 'primario' ? 'attore_primario' : 'attore_comprimario'
}

export function isRuoloCast(value: string | null | undefined): value is RuoloCast {
  return RUOLI_CAST.includes(value as RuoloCast)
}

function normalizzaNome(nome: string | null | undefined): string {
  return (nome ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function ruoloCastDaTipologia(ruolo: {
  codice?: string | null
  nome?: string | null
}): RuoloCast | null {
  const codice = (ruolo.codice ?? '').trim().toUpperCase()
  const nome = normalizzaNome(ruolo.nome)
  const match = CATALOGO.find((voce) => voce.codici.includes(codice) || voce.nomi.includes(nome))
  return match?.ruolo ?? null
}

export function etichettaRuoloCast(ruolo: {
  codice?: string | null
  nome?: string | null
} | null | undefined): string {
  if (!ruolo) return 'Ruolo'
  const noto = ruoloCastDaTipologia(ruolo)
  if (noto) return RUOLO_CAST_LABEL[noto]
  return ruolo.nome?.trim() || 'Ruolo'
}

export interface RuoloTipologiaOption {
  id: string
  nome: string
  codice?: string | null
  label: string
}

/** I quattro ruoli di cast, nell'ordine attore/doppiatore. Gli altri restano fuori. */
export function opzioniRuoloCast<T extends { id: string; nome: string; codice?: string | null }>(
  ruoli: T[],
): Array<T & { label: string }> {
  return CATALOGO.flatMap((voce) => {
    const trovato = ruoli.find((ruolo) => ruoloCastDaTipologia(ruolo) === voce.ruolo)
    return trovato ? [{ ...trovato, label: RUOLO_CAST_LABEL[voce.ruolo] }] : []
  })
}

/** Quattro ruoli in scheda opera. Se il catalogo non combacia, restano tutti i ruoli. */
export function ruoliCastInScheda<T extends { id: string; nome: string; codice?: string | null }>(
  ruoli: T[],
): Array<T & { label: string }> {
  const opzioni = opzioniRuoloCast(ruoli)
  if (opzioni.length > 0) return opzioni
  return ruoli.map((ruolo) => ({ ...ruolo, label: ruolo.nome }))
}

export function idRuoloCastPredefinito<T extends { id: string; nome: string; codice?: string | null }>(
  ruoli: T[],
): string {
  return ruoliCastInScheda(ruoli)[0]?.id ?? ''
}

/** In modifica resta selezionabile anche un ruolo fuori dai quattro, se già assegnato. */
export function opzioniModificaRuoloCast<T extends { id: string; nome: string; codice?: string | null }>(
  ruoli: T[],
  ruoloIdCorrente?: string | null,
): Array<T & { label: string }> {
  const base = ruoliCastInScheda(ruoli)
  if (!ruoloIdCorrente || base.some((ruolo) => ruolo.id === ruoloIdCorrente)) return base
  const corrente = ruoli.find((ruolo) => ruolo.id === ruoloIdCorrente)
  if (!corrente) return base
  return [...base, { ...corrente, label: etichettaRuoloCast(corrente) }]
}
