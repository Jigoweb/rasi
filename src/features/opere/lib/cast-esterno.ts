export type PrimarietaCast = 'primario' | 'comprimario'
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
  primarieta: PrimarietaCast
  imdb_nconst: string | null
  fonte: FonteCastEsterno
  ordine: number
}

export function primarietaFromCredit(credit: ImdbCastCredit): PrimarietaCast {
  if (credit.castRole === 'Comprimario') return 'comprimario'
  if (credit.isStar || credit.castRole === 'Primario') return 'primario'
  return 'comprimario'
}

/** Attori IMDb/OMDb → righe salvabili. Esclude regia e sceneggiatura. */
export function mapImdbCreditsToCast(credits: ImdbCastCredit[]): CastEsternoInput[] {
  return credits
    .filter((credit) => (credit.categoryGroup ?? 'cast') === 'cast' && Boolean(credit.name?.trim()))
    .map((credit, index) => ({
      nome: credit.name!.trim(),
      personaggio: credit.character?.trim() || null,
      primarieta: primarietaFromCredit(credit),
      imdb_nconst: credit.id?.trim() || null,
      fonte: 'imdb' as const,
      ordine: index,
    }))
}
