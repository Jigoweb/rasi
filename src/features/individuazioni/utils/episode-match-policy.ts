/**
 * Policy di matching episodio per serie TV.
 *
 * Specifica eseguibile del comportamento attuale del matcher SQL
 * (`match_programmazione_to_partecipazioni`, fallback A2 + cast distinto a
 * livello serie) e della policy proposta (precisione prima del richiamo).
 *
 * Non è collegata al runtime SQL: serve da contratto per i casi segnalati
 * (FRINGE, HAWAII FIVE-0, YELLOWSTONE) e da guida al porting in migration.
 */

export type CatalogEpisode = {
  id: string
  numeroStagione: number
  numeroEpisodio: number
  artistaIds: string[]
}

export type ProgrammazioneEpisodeRef = {
  numeroStagione: number | null
  numeroEpisodio: number | null
}

export type EpisodeMatchKind =
  | 'exact_se'
  | 'ep_only'
  | 'missing'

export type EpisodeMatchResult = {
  kind: EpisodeMatchKind
  episodioId: string | null
  artistaIds: string[]
  /** Stagione/episodio del catalogo matchato, se c'è. */
  catalogStagione: number | null
  catalogEpisodio: number | null
}

export type MatchPolicy = 'current' | 'proposed'

function uniqueArtists(ids: string[]): string[] {
  return [...new Set(ids)]
}

function exactSeasonEpisode(
  prog: ProgrammazioneEpisodeRef,
  catalog: CatalogEpisode[],
): CatalogEpisode | null {
  if (prog.numeroStagione == null || prog.numeroEpisodio == null) return null
  return (
    catalog.find(
      episode =>
        episode.numeroStagione === prog.numeroStagione
        && episode.numeroEpisodio === prog.numeroEpisodio,
    ) ?? null
  )
}

function episodeOnlyMatches(
  prog: ProgrammazioneEpisodeRef,
  catalog: CatalogEpisode[],
): CatalogEpisode[] {
  if (prog.numeroEpisodio == null) return []
  return catalog.filter(episode => episode.numeroEpisodio === prog.numeroEpisodio)
}

function resultFromEpisode(
  kind: Exclude<EpisodeMatchKind, 'missing'>,
  episode: CatalogEpisode,
  extraArtistaIds: string[] = [],
): EpisodeMatchResult {
  return {
    kind,
    episodioId: episode.id,
    artistaIds: uniqueArtists([...episode.artistaIds, ...extraArtistaIds]),
    catalogStagione: episode.numeroStagione,
    catalogEpisodio: episode.numeroEpisodio,
  }
}

function missingResult(seriesArtistaIds: string[]): EpisodeMatchResult {
  return {
    kind: 'missing',
    episodioId: null,
    artistaIds: uniqueArtists(seriesArtistaIds),
    catalogStagione: null,
    catalogEpisodio: null,
  }
}

/**
 * Comportamento attuale (post SKY gap A2 + distinct series cast):
 * - S+E esatto se esiste.
 * - Altrimenti fallback ep-only anche con stagione valorizzata (A2).
 * - Se nessun episodio: attribuisce il cast distinto dell'intera serie.
 * - In caso di match episodio, il SQL attuale aggiunge anche le
 *   partecipazioni con `episodio_id IS NULL` (cast a livello serie).
 */
export function matchEpisodeCurrent(
  prog: ProgrammazioneEpisodeRef,
  catalog: CatalogEpisode[],
  seriesLevelArtistaIds: string[] = [],
): EpisodeMatchResult {
  const exact = exactSeasonEpisode(prog, catalog)
  if (exact) return resultFromEpisode('exact_se', exact, seriesLevelArtistaIds)

  const epOnly = episodeOnlyMatches(prog, catalog)
  if (epOnly.length > 0) {
    return resultFromEpisode('ep_only', epOnly[0], seriesLevelArtistaIds)
  }

  return missingResult(seriesLevelArtistaIds)
}

/**
 * Policy proposta (precisione):
 * - Con stagione+episodio noti: solo match S+E esatto.
 * - Ep-only solo se la stagione manca E il numero episodio è unico in catalogo.
 * - Episodio assente: nessuna attribuzione artisti (alert, non individuazione).
 * - Mai attaccare il cast di altri episodi o il cast distinto di serie a un
 *   passaggio con dati episodio specifici.
 */
export function matchEpisodeProposed(
  prog: ProgrammazioneEpisodeRef,
  catalog: CatalogEpisode[],
  _seriesLevelArtistaIds: string[] = [],
): EpisodeMatchResult {
  const exact = exactSeasonEpisode(prog, catalog)
  if (exact) return resultFromEpisode('exact_se', exact)

  const seasonKnown = prog.numeroStagione != null && prog.numeroStagione > 0
  if (seasonKnown) return missingResult([])

  const epOnly = episodeOnlyMatches(prog, catalog)
  if (epOnly.length === 1 && prog.numeroEpisodio != null) {
    return resultFromEpisode('ep_only', epOnly[0])
  }

  return missingResult([])
}

export function matchEpisode(
  policy: MatchPolicy,
  prog: ProgrammazioneEpisodeRef,
  catalog: CatalogEpisode[],
  seriesLevelArtistaIds: string[] = [],
): EpisodeMatchResult {
  return policy === 'current'
    ? matchEpisodeCurrent(prog, catalog, seriesLevelArtistaIds)
    : matchEpisodeProposed(prog, catalog, seriesLevelArtistaIds)
}

export type NocoWorkRow = {
  codice: string
  titolo: string
  anno: number | null
}

export type CurrentWorkRow = {
  id: string
  titolo: string
  anno: number | null
}

export function normalizeWorkTitleForCollapse(titolo: string): string {
  return titolo
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/0/gi, 'o')
    .replace(/1/gi, 'i')
    .replace(/3/gi, 'o')
    .replace(/4/gi, 'a')
    .replace(/5/gi, 's')
    .replace(/8/gi, 'b')
    .replace(/[0-9]/g, '')
    .replace(/[^a-zA-Z]+/g, ' ')
    .trim()
    .toLowerCase()
}

export type CollapsedWorkHit = {
  nocoCodici: string[]
  currentOperaIds: string[]
  anniNoco: number[]
}

/**
 * Rileva accorpamenti sospetti: in Noco esistono più anni per lo stesso titolo
 * normalizzato (es. Manuale D'Amore 2005 vs Manuale D'Am3re 2011), ma nel
 * catalogo attuale c'è un solo `opere.id` per quella chiave.
 */
export function detectCollapsedWorksByTitleYear(
  nocoRows: NocoWorkRow[],
  currentWorks: CurrentWorkRow[],
): CollapsedWorkHit[] {
  const nocoGroups = new Map<string, NocoWorkRow[]>()
  for (const row of nocoRows) {
    const key = normalizeWorkTitleForCollapse(row.titolo)
    const group = nocoGroups.get(key) ?? []
    group.push(row)
    nocoGroups.set(key, group)
  }

  const currentByKey = new Map<string, CurrentWorkRow[]>()
  for (const work of currentWorks) {
    const key = normalizeWorkTitleForCollapse(work.titolo)
    const group = currentByKey.get(key) ?? []
    group.push(work)
    currentByKey.set(key, group)
  }

  const hits: CollapsedWorkHit[] = []
  for (const [key, rows] of nocoGroups) {
    const anniNoco = [
      ...new Set(rows.map(row => row.anno).filter((anno): anno is number => anno != null)),
    ]
    if (anniNoco.length < 2) continue

    const currentMatches = currentByKey.get(key) ?? []
    if (currentMatches.length !== 1) continue

    hits.push({
      nocoCodici: rows.map(row => row.codice),
      currentOperaIds: currentMatches.map(work => work.id),
      anniNoco,
    })
  }

  return hits
}
