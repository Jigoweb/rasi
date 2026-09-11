/**
 * Classifies catalog (artisti/opere) completeness fields by their impact on
 * individuazione matching. Matching resolves programmazioni → opere
 * (+ episodi) → partecipazioni → artisti; artist anagrafica fields are not
 * match signals.
 */

export type CatalogHealthImpact = 'critical' | 'matching' | 'identity' | 'admin'

export type CatalogHealthEntity = 'artista' | 'opera'

export interface CatalogHealthFieldPolicy {
  key: string
  label: string
  entity: CatalogHealthEntity
  impact: CatalogHealthImpact
  /** Short operator-facing explanation of why this field matters. */
  hint: string
}

export const CATALOG_HEALTH_IMPACT_LABEL: Record<CatalogHealthImpact, string> = {
  critical: 'Critico matching',
  matching: 'Utile matching',
  identity: 'Identità risultato',
  admin: 'Anagrafica',
}

export const CATALOG_HEALTH_IMPACT_ORDER: Record<CatalogHealthImpact, number> = {
  critical: 0,
  matching: 1,
  identity: 2,
  admin: 3,
}

/** Stable policies keyed by metric label as emitted by dashboard health loaders/RPC. */
export const CATALOG_HEALTH_FIELD_POLICIES: CatalogHealthFieldPolicy[] = [
  {
    key: 'titolo',
    label: 'Titolo',
    entity: 'opera',
    impact: 'critical',
    hint: 'Segnale obbligatorio: senza titolo l’opera non può matchare una programmazione.',
  },
  {
    key: 'anno_produzione',
    label: 'Anno produzione',
    entity: 'opera',
    impact: 'critical',
    hint: 'Discriminante forte: anno assente indebolisce il match; anno errato può escludere candidati.',
  },
  {
    key: 'titolo_originale',
    label: 'Titolo originale',
    entity: 'opera',
    impact: 'matching',
    hint: 'Bonus e canale di match alternativo sul titolo programmazione.',
  },
  {
    key: 'tipo',
    label: 'Tipo',
    entity: 'opera',
    impact: 'matching',
    hint: 'Instrada film vs serie TV e la ricerca episodio obbligatoria sulle serie.',
  },
  {
    key: 'imdb_tconst',
    label: 'IMDB tconst',
    entity: 'opera',
    impact: 'matching',
    hint: 'Identificatore esatto usato dalle strategie di matching gerarchico.',
  },
  {
    key: 'regista',
    label: 'Regia',
    entity: 'opera',
    impact: 'matching',
    hint: 'Discriminante fuzzy vs programmazioni.regia: assente è neutro, errato penalizza il match.',
  },
  {
    key: 'alias_titoli',
    label: 'Alias titoli',
    entity: 'opera',
    impact: 'matching',
    hint: 'Fallback titolo e sorgente degli alias canonici nel matching gerarchico.',
  },
  {
    key: 'codice_isan',
    label: 'Codice ISAN',
    entity: 'opera',
    impact: 'matching',
    hint: 'Identificatore esatto (strategia codice_isan) quando la programmazione lo fornisce.',
  },
  {
    key: 'anno_produzione_fine',
    label: 'Anno produzione fine',
    entity: 'opera',
    impact: 'matching',
    hint: 'Chiude il range anno sulle serie; se assente il matcher usa solo anno produzione.',
  },
  {
    key: 'episodi',
    label: 'Episodi (serie TV)',
    entity: 'opera',
    impact: 'matching',
    hint: 'Senza episodi una serie non può matchare stagione/episodio della programmazione.',
  },
  {
    key: 'nome',
    label: 'Nome',
    entity: 'artista',
    impact: 'identity',
    hint: 'Non guida il matching; serve a identificare l’artista nelle individuazioni generate.',
  },
  {
    key: 'cognome',
    label: 'Cognome',
    entity: 'artista',
    impact: 'identity',
    hint: 'Non guida il matching; serve a identificare l’artista nelle individuazioni generate.',
  },
  {
    key: 'imdb_nconst',
    label: 'IMDB nconst',
    entity: 'artista',
    impact: 'admin',
    hint: 'Anagrafica/arricchimento: il matcher opera sulle opere, non sull’nconst artista.',
  },
  {
    key: 'codice_ipn',
    label: 'Codice IPN',
    entity: 'artista',
    impact: 'admin',
    hint: 'Anagrafica diritti/ripartizione: non usato dal matching individuazione.',
  },
  {
    key: 'stato',
    label: 'Stato',
    entity: 'artista',
    impact: 'admin',
    hint: 'Stato amministrativo del record: non è un segnale di matching.',
  },
  {
    key: 'data_nascita',
    label: 'Data nascita',
    entity: 'artista',
    impact: 'admin',
    hint: 'Anagrafica: non usato dal matching individuazione.',
  },
  {
    key: 'codice_fiscale',
    label: 'Codice fiscale',
    entity: 'artista',
    impact: 'admin',
    hint: 'Anagrafica/fiscale: non usato dal matching individuazione.',
  },
]

const POLICY_BY_LABEL = new Map(
  CATALOG_HEALTH_FIELD_POLICIES.map(policy => [policy.label.toLowerCase(), policy])
)

const POLICY_BY_KEY = new Map(
  CATALOG_HEALTH_FIELD_POLICIES.map(policy => [policy.key, policy])
)

export function resolveCatalogHealthPolicy(
  metric: { key?: string | null; label?: string | null }
): CatalogHealthFieldPolicy | null {
  if (metric.key && POLICY_BY_KEY.has(metric.key)) {
    return POLICY_BY_KEY.get(metric.key) ?? null
  }
  if (metric.label && POLICY_BY_LABEL.has(metric.label.toLowerCase())) {
    return POLICY_BY_LABEL.get(metric.label.toLowerCase()) ?? null
  }
  return null
}

export function annotateCatalogHealthMetric<T extends { label: string; missing: number; total: number; key?: string }>(
  metric: T
): T & {
  key: string
  impact: CatalogHealthImpact
  impactLabel: string
  impactHint: string
} {
  const policy = resolveCatalogHealthPolicy(metric)
  const impact = policy?.impact ?? 'admin'
  return {
    ...metric,
    key: policy?.key ?? metric.key ?? slugifyLabel(metric.label),
    impact,
    impactLabel: CATALOG_HEALTH_IMPACT_LABEL[impact],
    impactHint: policy?.hint ?? 'Campo di completezza catalogo senza ruolo diretto nel matching.',
  }
}

export function sortCatalogHealthMetrics<T extends { impact?: CatalogHealthImpact; label: string; missing: number }>(
  metrics: T[]
): T[] {
  return [...metrics].sort((a, b) => {
    const impactA = CATALOG_HEALTH_IMPACT_ORDER[a.impact ?? 'admin']
    const impactB = CATALOG_HEALTH_IMPACT_ORDER[b.impact ?? 'admin']
    if (impactA !== impactB) return impactA - impactB
    if (b.missing !== a.missing) return b.missing - a.missing
    return a.label.localeCompare(b.label, 'it')
  })
}

export function countMetricsByImpact<T extends { impact?: CatalogHealthImpact; missing: number }>(
  metrics: T[],
  impacts: CatalogHealthImpact[]
): { fieldsWithGaps: number; maxMissing: number } {
  const relevant = metrics.filter(m => m.impact && impacts.includes(m.impact) && m.missing > 0)
  return {
    fieldsWithGaps: relevant.length,
    maxMissing: relevant.reduce((max, m) => Math.max(max, m.missing), 0),
  }
}

function slugifyLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}
