import type { SupabaseClient } from '@supabase/supabase-js'

export interface DashboardStats {
  artisti_attivi: number
  opere_totali: number
  episodi_totali: number
  opere_film: number
  opere_serie_tv: number
  programmazioni_mese: number
  campagne_attive: number
  importo_distribuito: number
  tasso_matching: number
}

export interface AttivitaItem {
  tipo: 'artista' | 'opera' | 'campagna_individuazione' | 'campagna_programmazione'
  label: string
  dettaglio: string
  timestamp: string
}

export interface StatsAggiuntive {
  individuazioni: number
  partecipazioni: number
  campagneRipartizione: number
  ultimoDato: string | null
}

export type Metric = { label: string; missing: number; total: number }

export interface DashboardDateRange {
  firstDay: string
  lastDay: string
}

export interface DashboardPrimaryData {
  stats: DashboardStats
  totalArtisti: number
  totalOpere: number
  individuazioniTotal: number
}

export interface DashboardSecondaryData {
  attivitaRecenti: AttivitaItem[]
  statsAggiuntive: StatsAggiuntive
}

export interface DashboardHealthData {
  artistiIncompleti: number
  opereIncomplete: number
  artistiMetrics: Metric[]
  opereMetrics: Metric[]
}

export interface DashboardRpcData {
  primary: DashboardPrimaryData
  secondary: DashboardSecondaryData
  health: DashboardHealthData
}

export interface DashboardDataDeps {
  countActiveArtisti: () => Promise<number>
  countOpere: () => Promise<number>
  countEpisodi: () => Promise<number>
  countFilm: () => Promise<number>
  countSerieTv: () => Promise<number>
  countProgrammazioniInRange: (range: DashboardDateRange) => Promise<number>
  countCampagneIndividuazioneInCorso: () => Promise<number>
  sumImportoDistribuito: () => Promise<number>
  countIndividuazioni: () => Promise<number>
  countIndividuazioniValide: () => Promise<number>
  loadRecentActivities: () => Promise<AttivitaItem[]>
  countPartecipazioni: () => Promise<number>
  countCampagneRipartizione: () => Promise<number>
  loadUltimoDatoCaricato: () => Promise<string | null>
  countArtistiIncompleti: () => Promise<number>
  countOpereIncomplete: () => Promise<number>
  countMissingArtistiFields: () => Promise<number[]>
  countMissingOpereFields: () => Promise<number[]>
}

const ARTISTI_INCOMPLETI_OR =
  'codice_ipn.is.null,codice_ipn.eq.,nome.is.null,nome.eq.,cognome.is.null,cognome.eq.,stato.is.null,imdb_nconst.is.null,imdb_nconst.eq.,data_nascita.is.null,codice_fiscale.is.null,codice_fiscale.eq.'
const OPERE_INCOMPLETE_OR =
  'titolo.is.null,titolo.eq.,tipo.is.null,anno_produzione.is.null,imdb_tconst.is.null,imdb_tconst.eq.,titolo_originale.is.null,titolo_originale.eq.'

export async function loadDashboardPrimaryData(
  deps: DashboardDataDeps,
  range: DashboardDateRange
): Promise<DashboardPrimaryData> {
  const [
    artistiAttivi,
    opereTotali,
    episodiTotali,
    opereFilm,
    opereSerieTv,
    programmazioniMese,
    campagneAttive,
    importoDistribuito,
    individuazioniTotal,
    individuazioniValide,
  ] = await Promise.all([
    deps.countActiveArtisti(),
    deps.countOpere(),
    deps.countEpisodi(),
    deps.countFilm(),
    deps.countSerieTv(),
    deps.countProgrammazioniInRange(range),
    deps.countCampagneIndividuazioneInCorso(),
    deps.sumImportoDistribuito(),
    deps.countIndividuazioni(),
    deps.countIndividuazioniValide(),
  ])

  return {
    stats: {
      artisti_attivi: artistiAttivi,
      opere_totali: opereTotali,
      episodi_totali: episodiTotali,
      opere_film: opereFilm,
      opere_serie_tv: opereSerieTv,
      programmazioni_mese: programmazioniMese,
      campagne_attive: campagneAttive,
      importo_distribuito: importoDistribuito,
      tasso_matching: individuazioniTotal
        ? Math.round((individuazioniValide / individuazioniTotal) * 1000) / 10
        : 0,
    },
    totalArtisti: artistiAttivi,
    totalOpere: opereTotali,
    individuazioniTotal,
  }
}

export async function loadDashboardSecondaryData(
  deps: DashboardDataDeps,
  primary: Pick<DashboardPrimaryData, 'individuazioniTotal'>
): Promise<DashboardSecondaryData> {
  const [
    attivitaRecenti,
    partecipazioni,
    campagneRipartizione,
    ultimoDato,
  ] = await Promise.all([
    deps.loadRecentActivities(),
    deps.countPartecipazioni(),
    deps.countCampagneRipartizione(),
    deps.loadUltimoDatoCaricato(),
  ])

  return {
    attivitaRecenti,
    statsAggiuntive: {
      individuazioni: primary.individuazioniTotal,
      partecipazioni,
      campagneRipartizione,
      ultimoDato,
    },
  }
}

export async function loadDashboardHealthData(
  deps: DashboardDataDeps,
  totals: Pick<DashboardPrimaryData, 'totalArtisti' | 'totalOpere'>
): Promise<DashboardHealthData> {
  const [
    artistiIncompleti,
    opereIncomplete,
    artistsMissing,
    opereMissing,
  ] = await Promise.all([
    deps.countArtistiIncompleti(),
    deps.countOpereIncomplete(),
    deps.countMissingArtistiFields(),
    deps.countMissingOpereFields(),
  ])

  return {
    artistiIncompleti,
    opereIncomplete,
    artistiMetrics: [
      { label: 'Codice IPN', missing: artistsMissing[0] ?? 0, total: totals.totalArtisti },
      { label: 'Nome', missing: artistsMissing[1] ?? 0, total: totals.totalArtisti },
      { label: 'Cognome', missing: artistsMissing[2] ?? 0, total: totals.totalArtisti },
      { label: 'Stato', missing: artistsMissing[3] ?? 0, total: totals.totalArtisti },
      { label: 'IMDB nconst', missing: artistsMissing[4] ?? 0, total: totals.totalArtisti },
      { label: 'Data nascita', missing: artistsMissing[5] ?? 0, total: totals.totalArtisti },
      { label: 'Codice fiscale', missing: artistsMissing[6] ?? 0, total: totals.totalArtisti },
    ],
    opereMetrics: [
      { label: 'Titolo', missing: opereMissing[0] ?? 0, total: totals.totalOpere },
      { label: 'Tipo', missing: opereMissing[1] ?? 0, total: totals.totalOpere },
      { label: 'Anno produzione', missing: opereMissing[2] ?? 0, total: totals.totalOpere },
      { label: 'IMDB tconst', missing: opereMissing[3] ?? 0, total: totals.totalOpere },
      { label: 'Titolo originale', missing: opereMissing[4] ?? 0, total: totals.totalOpere },
    ],
  }
}

export async function loadDashboardRpcData(
  supabase: SupabaseClient,
  range: DashboardDateRange
): Promise<DashboardRpcData> {
  const { data, error } = await supabase.rpc('get_dashboard_metrics', {
    p_first_day: range.firstDay,
    p_last_day: range.lastDay,
  })

  if (error) throw error
  return normalizeDashboardRpcPayload(data)
}

export function normalizeDashboardRpcPayload(payload: any): DashboardRpcData {
  return {
    primary: {
      stats: payload.stats,
      totalArtisti: payload.totalArtisti ?? payload.total_artisti ?? 0,
      totalOpere: payload.totalOpere ?? payload.total_opere ?? 0,
      individuazioniTotal: payload.individuazioniTotal ?? payload.individuazioni_total ?? 0,
    },
    secondary: {
      attivitaRecenti: payload.secondary?.attivitaRecenti ?? payload.secondary?.attivita_recenti ?? [],
      statsAggiuntive: payload.secondary?.statsAggiuntive ?? payload.secondary?.stats_aggiuntive ?? {
        individuazioni: 0,
        partecipazioni: 0,
        campagneRipartizione: 0,
        ultimoDato: null,
      },
    },
    health: {
      artistiIncompleti: payload.health?.artistiIncompleti ?? payload.health?.artisti_incompleti ?? 0,
      opereIncomplete: payload.health?.opereIncomplete ?? payload.health?.opere_incomplete ?? 0,
      artistiMetrics: payload.health?.artistiMetrics ?? payload.health?.artisti_metrics ?? [],
      opereMetrics: payload.health?.opereMetrics ?? payload.health?.opere_metrics ?? [],
    },
  }
}

export function createSupabaseDashboardDataDeps(supabase: SupabaseClient): DashboardDataDeps {
  const count = async (query: PromiseLike<{ count: number | null }>) => {
    const result = await query
    return result.count || 0
  }

  return {
    countActiveArtisti: () => count(supabase.from('artisti').select('id', { count: 'exact', head: true }).eq('stato', 'attivo')),
    countOpere: () => count(supabase.from('opere').select('id', { count: 'exact', head: true })),
    countEpisodi: () => count(supabase.from('episodi').select('id', { count: 'exact', head: true })),
    countFilm: () => count(supabase.from('opere').select('id', { count: 'exact', head: true }).eq('tipo', 'film')),
    countSerieTv: () => count(supabase.from('opere').select('id', { count: 'exact', head: true }).eq('tipo', 'serie_tv')),
    countProgrammazioniInRange: range => count(
      supabase
        .from('programmazioni')
        .select('id', { count: 'exact', head: true })
        .gte('data_trasmissione', range.firstDay)
        .lte('data_trasmissione', range.lastDay)
    ),
    countCampagneIndividuazioneInCorso: () => count(
      (supabase as any)
        .from('campagne_individuazione')
        .select('id', { count: 'exact', head: true })
        .eq('stato', 'in_corso')
    ),
    sumImportoDistribuito: async () => {
      const { data } = await supabase
        .from('campagne_ripartizione')
        .select('importo_totale_disponibile')
        .eq('stato', 'distribuita')
      return (data || []).reduce(
        (acc: number, row: any) => acc + (parseFloat(row.importo_totale_disponibile) || 0),
        0
      )
    },
    countIndividuazioni: () => count((supabase as any).from('individuazioni').select('id', { count: 'exact', head: true })),
    countIndividuazioniValide: () => count((supabase as any).from('individuazioni').select('id', { count: 'exact', head: true }).neq('stato', 'respinto')),
    loadRecentActivities: async () => {
      const [ultArtisti, ultOpere, ultCampagneInd, ultCampagneProg] = await Promise.all([
        supabase.from('artisti').select('nome, cognome, created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('opere').select('titolo, created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('campagne_individuazione').select('nome, updated_at, stato').eq('stato', 'completata').order('updated_at', { ascending: false }).limit(3),
        (supabase as any).from('campagne_programmazione').select('nome, created_at').order('created_at', { ascending: false }).limit(3),
      ])

      return [
        ...(ultArtisti.data || []).map((a: any) => ({
          tipo: 'artista' as const,
          label: 'Nuovo artista registrato',
          dettaglio: `${a.nome} ${a.cognome}`,
          timestamp: a.created_at,
        })),
        ...(ultOpere.data || []).map((o: any) => ({
          tipo: 'opera' as const,
          label: 'Nuova opera catalogata',
          dettaglio: o.titolo,
          timestamp: o.created_at,
        })),
        ...(ultCampagneInd.data || []).map((c: any) => ({
          tipo: 'campagna_individuazione' as const,
          label: 'Campagna completata',
          dettaglio: c.nome,
          timestamp: c.updated_at,
        })),
        ...(ultCampagneProg.data || []).map((c: any) => ({
          tipo: 'campagna_programmazione' as const,
          label: 'Nuova campagna programmazione',
          dettaglio: c.nome,
          timestamp: c.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5)
    },
    countPartecipazioni: () => count(supabase.from('partecipazioni').select('id', { count: 'exact', head: true })),
    countCampagneRipartizione: () => count(supabase.from('campagne_ripartizione').select('id', { count: 'exact', head: true })),
    loadUltimoDatoCaricato: async () => {
      const { data } = await supabase.from('programmazioni').select('created_at').order('created_at', { ascending: false }).limit(1)
      return data?.[0]?.created_at || null
    },
    countArtistiIncompleti: () => count(supabase.from('artisti').select('id', { count: 'exact', head: true }).or(ARTISTI_INCOMPLETI_OR)),
    countOpereIncomplete: () => count(supabase.from('opere').select('id', { count: 'exact', head: true }).or(OPERE_INCOMPLETE_OR)),
    countMissingArtistiFields: () => Promise.all([
      count(supabase.from('artisti').select('id', { count: 'exact', head: true }).or('codice_ipn.is.null,codice_ipn.eq.')),
      count(supabase.from('artisti').select('id', { count: 'exact', head: true }).or('nome.is.null,nome.eq.')),
      count(supabase.from('artisti').select('id', { count: 'exact', head: true }).or('cognome.is.null,cognome.eq.')),
      count(supabase.from('artisti').select('id', { count: 'exact', head: true }).is('stato', null)),
      count(supabase.from('artisti').select('id', { count: 'exact', head: true }).or('imdb_nconst.is.null,imdb_nconst.eq.')),
      count(supabase.from('artisti').select('id', { count: 'exact', head: true }).is('data_nascita', null)),
      count(supabase.from('artisti').select('id', { count: 'exact', head: true }).or('codice_fiscale.is.null,codice_fiscale.eq.')),
    ]),
    countMissingOpereFields: () => Promise.all([
      count(supabase.from('opere').select('id', { count: 'exact', head: true }).or('titolo.is.null,titolo.eq.')),
      count(supabase.from('opere').select('id', { count: 'exact', head: true }).is('tipo', null)),
      count(supabase.from('opere').select('id', { count: 'exact', head: true }).is('anno_produzione', null)),
      count(supabase.from('opere').select('id', { count: 'exact', head: true }).or('imdb_tconst.is.null,imdb_tconst.eq.')),
      count(supabase.from('opere').select('id', { count: 'exact', head: true }).or('titolo_originale.is.null,titolo_originale.eq.')),
    ]),
  }
}
