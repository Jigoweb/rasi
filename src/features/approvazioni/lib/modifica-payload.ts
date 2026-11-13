/**
 * Contratto della coda modifiche_proposte (fase 2b).
 * Le chiavi devono restare allineate a public.modifica_colonne_consentite()
 * nella migration 20261113115053_coda_approvazione_modifiche.sql.
 */

export const ENTITA_PROPOSTA = ['opera', 'episodio', 'partecipazione', 'cast_esterno', 'artista'] as const
export type EntitaProposta = (typeof ENTITA_PROPOSTA)[number]

export const ENTITA_PROPONIBILI = ['opera', 'episodio', 'partecipazione', 'cast_esterno'] as const
export type EntitaProponibile = (typeof ENTITA_PROPONIBILI)[number]

export const OPERAZIONI_PROPOSTA = ['insert', 'update', 'delete'] as const
export type OperazioneProposta = (typeof OPERAZIONI_PROPOSTA)[number]

export const COLONNE_CONSENTITE: Record<EntitaProponibile, readonly string[]> = {
  opera: [
    'titolo',
    'titolo_originale',
    'alias_titoli',
    'tipo',
    'has_episodes',
    'anno_produzione',
    'anno_produzione_fine',
    'regista',
    'codice_isan',
    'codice_opera',
    'imdb_tconst',
    'codici_esterni',
    'durata_minuti',
    'dettagli_serie',
    'metadati',
  ],
  episodio: [
    'opera_id',
    'numero_stagione',
    'numero_episodio',
    'titolo_episodio',
    'titolo_episodio_originale',
    'alias_titoli',
    'descrizione',
    'durata_minuti',
    'data_prima_messa_in_onda',
    'imdb_tconst',
    'codice_isan',
    'metadati',
  ],
  partecipazione: ['artista_id', 'opera_id', 'ruolo_id', 'episodio_id', 'personaggio'],
  cast_esterno: [
    'opera_id',
    'episodio_id',
    'nome',
    'personaggio',
    'primarieta',
    'ruolo',
    'ruolo_id',
    'imdb_nconst',
    'codice_ipn',
    'fonte',
    'ordine',
  ],
}

export const ETICHETTA_ENTITA: Record<EntitaProposta, string> = {
  opera: 'Opera',
  episodio: 'Episodio',
  partecipazione: 'Partecipazione',
  cast_esterno: 'Cast esterno',
  artista: 'Artista',
}

export const ETICHETTA_OPERAZIONE: Record<OperazioneProposta, string> = {
  insert: 'Inserimento',
  update: 'Modifica',
  delete: 'Eliminazione',
}

export const ETICHETTA_CAMPO: Record<string, string> = {
  titolo: 'Titolo',
  titolo_originale: 'Titolo originale',
  alias_titoli: 'Titoli alternativi',
  tipo: 'Tipo',
  has_episodes: 'Ha episodi',
  anno_produzione: 'Anno di produzione',
  anno_produzione_fine: 'Anno fine produzione',
  regista: 'Regia',
  codice_isan: 'Codice ISAN',
  codice_opera: 'Codice opera',
  imdb_tconst: 'IMDb',
  codici_esterni: 'Codici esterni',
  durata_minuti: 'Durata (minuti)',
  dettagli_serie: 'Dettagli serie',
  metadati: 'Metadati',
  opera_id: 'Opera',
  numero_stagione: 'Stagione',
  numero_episodio: 'Episodio',
  titolo_episodio: 'Titolo episodio',
  titolo_episodio_originale: 'Titolo originale episodio',
  descrizione: 'Descrizione',
  data_prima_messa_in_onda: 'Prima messa in onda',
  artista_id: 'Artista',
  ruolo_id: 'Ruolo',
  episodio_id: 'Episodio collegato',
  personaggio: 'Personaggio',
  nome: 'Nome',
  primarieta: 'Primarietà',
  ruolo: 'Ruolo',
  imdb_nconst: 'IMDb persona',
  codice_ipn: 'IPN',
  fonte: 'Fonte',
  ordine: 'Ordine',
}

const CAMPI_OBBLIGATORI: Record<EntitaProponibile, readonly string[]> = {
  opera: ['titolo', 'tipo'],
  episodio: ['opera_id', 'numero_stagione', 'numero_episodio'],
  partecipazione: ['artista_id', 'opera_id', 'ruolo_id'],
  cast_esterno: ['opera_id', 'nome'],
}

export type RigaBatch = {
  entita: EntitaProponibile
  operazione: OperazioneProposta
  entitaId?: string | null
  prima?: Record<string, unknown>
  dopo?: Record<string, unknown>
}

export type PayloadProposta = {
  prima?: Record<string, unknown>
  dopo?: Record<string, unknown>
  batch?: boolean
  righe?: RigaBatch[]
}

export type DiffCampo = {
  campo: string
  etichetta: string
  prima: string
  dopo: string
}

export function colonneNonConsentite(entita: EntitaProponibile, campi: readonly string[]): string[] {
  const ammessi = new Set(COLONNE_CONSENTITE[entita])
  return campi.filter((campo) => !ammessi.has(campo))
}

export function stessoValore(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

/** Tiene solo i campi in whitelist il cui valore è diverso da quello già salvato. */
export function diffCampi(
  prima: Record<string, unknown>,
  dopo: Record<string, unknown>,
  colonne: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of colonne) {
    if (!Object.prototype.hasOwnProperty.call(dopo, key)) continue
    if (!stessoValore(prima[key], dopo[key])) out[key] = dopo[key] ?? null
  }
  return out
}

/**
 * Applica i campi `dopo` sulla riga. Se c'è un campo fuori whitelist
 * non modifica nulla e restituisce i nomi rifiutati.
 */
export function applicaPayload<T extends Record<string, unknown>>(
  riga: T,
  dopo: Record<string, unknown>,
  colonne: readonly string[],
): { riga: T; rifiutati: string[] } {
  const ammessi = new Set(colonne)
  const rifiutati = Object.keys(dopo).filter((campo) => !ammessi.has(campo))
  if (rifiutati.length > 0) return { riga, rifiutati }
  const next = { ...riga }
  for (const key of Object.keys(dopo)) {
    next[key as keyof T] = (dopo[key] ?? null) as T[keyof T]
  }
  return { riga: next, rifiutati: [] }
}

export function filtraConsentiti(
  entita: EntitaProponibile,
  valori: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of COLONNE_CONSENTITE[entita]) {
    if (Object.prototype.hasOwnProperty.call(valori, key)) out[key] = valori[key] ?? null
  }
  return out
}

export type EsitoValidazione =
  | { ok: true }
  | { ok: false; error: string }

export function validaProposta(input: {
  entita: string
  operazione: string
  dopo?: Record<string, unknown> | null
  righe?: RigaBatch[] | null
  batch?: boolean
}): EsitoValidazione {
  if (!ENTITA_PROPONIBILI.includes(input.entita as EntitaProponibile)) {
    return { ok: false, error: 'Entità non proponibile' }
  }
  if (!OPERAZIONI_PROPOSTA.includes(input.operazione as OperazioneProposta)) {
    return { ok: false, error: 'Operazione non valida' }
  }
  const entita = input.entita as EntitaProponibile
  const operazione = input.operazione as OperazioneProposta
  if (entita === 'opera' && operazione === 'delete' && !input.batch) {
    return { ok: false, error: 'Non si può proporre l\'eliminazione di un\'opera' }
  }
  if (input.batch) {
    if (!input.righe || input.righe.length === 0) {
      return { ok: false, error: 'La proposta batch non ha righe' }
    }
    if (input.righe.length > 5000) {
      return { ok: false, error: 'La proposta batch supera le 5000 righe' }
    }
    for (const riga of input.righe) {
      const esito = validaRiga(riga.entita, riga.operazione, riga.dopo ?? {}, true, riga.entitaId)
      if (!esito.ok) return esito
    }
    return { ok: true }
  }
  return validaRiga(entita, operazione, input.dopo ?? {}, false, null)
}

function validaRiga(
  entita: EntitaProponibile,
  operazione: OperazioneProposta,
  dopo: Record<string, unknown>,
  richiedeId: boolean,
  entitaId?: string | null,
): EsitoValidazione {
  if (entita === 'opera' && operazione === 'delete') {
    return { ok: false, error: 'Non si può proporre l\'eliminazione di un\'opera' }
  }
  if (operazione !== 'insert' && richiedeId && !entitaId) {
    return { ok: false, error: 'Manca l\'id della riga' }
  }
  if (operazione === 'delete') return { ok: true }
  const rifiutati = colonneNonConsentite(entita, Object.keys(dopo))
  if (rifiutati.length > 0) {
    return { ok: false, error: `Campo non consentito: ${rifiutati[0]}` }
  }
  if (operazione === 'update') {
    if (Object.keys(dopo).length === 0) return { ok: false, error: 'Nessun campo da aggiornare' }
    return { ok: true }
  }
  for (const campo of CAMPI_OBBLIGATORI[entita]) {
    const valore = dopo[campo]
    if (valore == null || (typeof valore === 'string' && valore.trim() === '')) {
      return { ok: false, error: 'Mancano i campi obbligatori' }
    }
  }
  return { ok: true }
}

export function applicaPayloadEntita<T extends Record<string, unknown>>(
  entita: EntitaProponibile,
  riga: T,
  dopo: Record<string, unknown>,
): { riga: T; rifiutati: string[] } {
  return applicaPayload(riga, dopo, COLONNE_CONSENTITE[entita])
}

export function formattaValore(valore: unknown): string {
  if (valore == null || valore === '') return 'vuoto'
  if (typeof valore === 'boolean') return valore ? 'sì' : 'no'
  if (Array.isArray(valore)) {
    if (valore.length === 0) return 'vuoto'
    return valore.map((item) => formattaValore(item)).join(', ')
  }
  if (typeof valore === 'object') return JSON.stringify(valore)
  return String(valore)
}

export function diffDaPayload(payload: PayloadProposta | null | undefined): DiffCampo[] {
  if (!payload || payload.batch) return []
  const dopo = payload.dopo ?? {}
  const prima = payload.prima ?? {}
  return Object.keys(dopo).map((campo) => ({
    campo,
    etichetta: ETICHETTA_CAMPO[campo] ?? campo,
    prima: formattaValore(prima[campo]),
    dopo: formattaValore(dopo[campo]),
  }))
}

export function riepilogoBatch(payload: PayloadProposta | null | undefined): string | null {
  if (!payload?.batch || !payload.righe) return null
  const n = payload.righe.length
  const inserimenti = payload.righe.filter((riga) => riga.operazione === 'insert').length
  const modifiche = payload.righe.filter((riga) => riga.operazione === 'update').length
  const eliminazioni = payload.righe.filter((riga) => riga.operazione === 'delete').length
  const parti = [
    inserimenti ? `${inserimenti} inserimenti` : '',
    modifiche ? `${modifiche} modifiche` : '',
    eliminazioni ? `${eliminazioni} eliminazioni` : '',
  ].filter(Boolean)
  return `${n} righe${parti.length ? `: ${parti.join(', ')}` : ''}`
}

/** Operazione da scrivere sulla riga quando il batch mescola insert e update. */
export function operazioneBatch(righe: readonly { operazione: OperazioneProposta }[]): OperazioneProposta {
  const distinte = new Set(righe.map((riga) => riga.operazione))
  if (distinte.size === 1) return righe[0]?.operazione ?? 'update'
  if (distinte.has('delete') && distinte.size === 1) return 'delete'
  return 'update'
}
