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

export interface RuoloOption {
  id: string
  nome: string
  categoria?: string | null
}

/**
 * Ruolo RASI proposto quando una riga di cast esterno diventa partecipazione.
 * primario → "Protagonista…" (o un ruolo "primario" che non sia comprimario),
 * comprimario → "Comprimario…". Nessuna corrispondenza → l'operatore sceglie.
 */
export function suggestRuoloPerPrimarieta(primarieta: string, ruoli: RuoloOption[]): string | null {
  const recitazione = ruoli.filter((ruolo) => !ruolo.categoria || ruolo.categoria === 'recitazione')
  const pool = recitazione.length > 0 ? recitazione : ruoli
  const byName = (pattern: RegExp, exclude?: RegExp) =>
    pool.find((ruolo) => pattern.test(ruolo.nome) && !(exclude && exclude.test(ruolo.nome)))?.id ?? null

  if (primarieta === 'primario') {
    return byName(/protagonist/i) ?? byName(/primari/i, /comprimari/i)
  }
  return byName(/comprimari/i)
}

export interface EpisodioRef {
  id: string
  numero_stagione: number | null
  numero_episodio: number | null
  titolo_episodio?: string | null
}

export function formatEpisodioLabel(episodio: EpisodioRef | null | undefined): string {
  if (!episodio) return 'Tutta la serie'
  const code = `S${episodio.numero_stagione ?? '?'}E${episodio.numero_episodio ?? '?'}`
  return episodio.titolo_episodio ? `${code} – ${episodio.titolo_episodio}` : code
}

/** Raggruppa per episodio: prima il cast dell'intera opera (episodio_id null), poi gli episodi in ordine. */
export function groupCastByEpisodio<T extends { episodio_id: string | null }>(
  rows: T[],
  episodi: EpisodioRef[],
): { episodio: EpisodioRef | null; rows: T[] }[] {
  const byId = new Map(episodi.map((episodio) => [episodio.id, episodio]))
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const key = row.episodio_id && byId.has(row.episodio_id) ? row.episodio_id : ''
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }

  const ordered = [...episodi].sort(
    (a, b) =>
      (a.numero_stagione ?? 9999) - (b.numero_stagione ?? 9999) ||
      (a.numero_episodio ?? 9999) - (b.numero_episodio ?? 9999),
  )

  const result: { episodio: EpisodioRef | null; rows: T[] }[] = []
  if (groups.has('')) result.push({ episodio: null, rows: groups.get('')! })
  for (const episodio of ordered) {
    const list = groups.get(episodio.id)
    if (list) result.push({ episodio, rows: list })
  }
  return result
}
