import { primarietaDiRuolo, type RuoloCast } from './ruolo-cast'

export type { RuoloCast }
export type FonteCastEsterno = 'imdb' | 'manuale'

export interface ImdbCastCredit {
  id?: string | null
  name?: string | null
  character?: string | null
  categoryGroup?: string | null
  isStar?: boolean | null
  castRole?: string | null
}

export interface CastEsternoInput {
  nome: string
  personaggio: string | null
  ruolo: RuoloCast
  imdb_nconst: string | null
  fonte: FonteCastEsterno
  ordine: number
}

export function ruoloFromCredit(credit: ImdbCastCredit): RuoloCast {
  if (credit.castRole === 'Comprimario') return 'attore_comprimario'
  if (credit.isStar || credit.castRole === 'Primario') return 'attore_primario'
  return 'attore_comprimario'
}

/** @deprecated usa ruoloFromCredit */
export function primarietaFromCredit(credit: ImdbCastCredit): 'primario' | 'comprimario' {
  return primarietaDiRuolo(ruoloFromCredit(credit))
}

/** Attori IMDb/OMDb → righe salvabili. Esclude regia e sceneggiatura. */
export function mapImdbCreditsToCast(credits: ImdbCastCredit[]): CastEsternoInput[] {
  return credits
    .filter((credit) => (credit.categoryGroup ?? 'cast') === 'cast' && Boolean(credit.name?.trim()))
    .map((credit, index) => ({
      nome: credit.name!.trim(),
      personaggio: credit.character?.trim() || null,
      ruolo: ruoloFromCredit(credit),
      imdb_nconst: credit.id?.trim() || null,
      fonte: 'imdb' as const,
      ordine: index,
    }))
}
