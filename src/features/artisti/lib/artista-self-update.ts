export type ArtistaSelfUpdateForm = {
  nome: string
  cognome: string
  nome_arte: string
  codice_fiscale: string
  data_nascita: string
  luogo_nascita: string
  tipologia: string
  email: string
  telefono: string
  via: string
  civico: string
  cap: string
  citta: string
  provincia: string
}

export type ArtistaSelfUpdatePayload = {
  nome: string
  cognome: string
  nome_arte: string | null
  codice_fiscale: string | null
  data_nascita: string | null
  luogo_nascita: string | null
  tipologia: 'AIE' | 'PRODUTTORE' | null
  contatti: Record<string, unknown>
  indirizzo: Record<string, unknown>
}

export type ValidateSelfUpdateResult =
  | { ok: true }
  | { ok: false; error: string }

const CF_REGEX = /^[A-Z0-9]{16}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function validateArtistaSelfUpdate(
  form: ArtistaSelfUpdateForm
): ValidateSelfUpdateResult {
  if (!form.nome.trim() || !form.cognome.trim()) {
    return { ok: false, error: 'Nome e cognome sono obbligatori.' }
  }

  const email = form.email.trim()
  if (email && !EMAIL_REGEX.test(email)) {
    return { ok: false, error: 'Indirizzo email non valido.' }
  }

  const cf = form.codice_fiscale.trim().toUpperCase()
  if (cf && !CF_REGEX.test(cf)) {
    return {
      ok: false,
      error: 'Codice fiscale non valido (attesi 16 caratteri alfanumerici).',
    }
  }

  if (form.tipologia && form.tipologia !== 'AIE' && form.tipologia !== 'PRODUTTORE') {
    return { ok: false, error: 'Tipologia non valida.' }
  }

  return { ok: true }
}

/**
 * Builds a whitelist-only update payload for artist self-service.
 * Never includes mandato / IPN / societari / stato fields.
 */
export function buildArtistaSelfUpdatePayload(
  form: ArtistaSelfUpdateForm,
  existing?: { contatti?: unknown; indirizzo?: unknown }
): ArtistaSelfUpdatePayload {
  const existingContatti = asRecord(existing?.contatti)
  const existingIndirizzo = asRecord(existing?.indirizzo)

  const tipologia =
    form.tipologia === 'AIE' || form.tipologia === 'PRODUTTORE'
      ? form.tipologia
      : null

  return {
    nome: form.nome.trim(),
    cognome: form.cognome.trim(),
    nome_arte: emptyToNull(form.nome_arte),
    codice_fiscale: emptyToNull(form.codice_fiscale)?.toUpperCase() ?? null,
    data_nascita: emptyToNull(form.data_nascita),
    luogo_nascita: emptyToNull(form.luogo_nascita),
    tipologia,
    contatti: {
      ...existingContatti,
      email: emptyToNull(form.email),
      telefono: emptyToNull(form.telefono),
    },
    indirizzo: {
      ...existingIndirizzo,
      via: emptyToNull(form.via),
      civico: emptyToNull(form.civico),
      cap: emptyToNull(form.cap),
      citta: emptyToNull(form.citta),
      provincia: emptyToNull(form.provincia),
    },
  }
}

export function formFromArtista(artista: {
  nome?: string | null
  cognome?: string | null
  nome_arte?: string | null
  codice_fiscale?: string | null
  data_nascita?: string | null
  luogo_nascita?: string | null
  tipologia?: string | null
  contatti?: unknown
  indirizzo?: unknown
}): ArtistaSelfUpdateForm {
  const contatti = asRecord(artista.contatti)
  const indirizzo = asRecord(artista.indirizzo)
  return {
    nome: artista.nome ?? '',
    cognome: artista.cognome ?? '',
    nome_arte: artista.nome_arte ?? '',
    codice_fiscale: artista.codice_fiscale ?? '',
    data_nascita: artista.data_nascita ?? '',
    luogo_nascita: artista.luogo_nascita ?? '',
    tipologia: artista.tipologia ?? '',
    email: typeof contatti.email === 'string' ? contatti.email : '',
    telefono: typeof contatti.telefono === 'string' ? contatti.telefono : '',
    via: typeof indirizzo.via === 'string' ? indirizzo.via : '',
    civico: typeof indirizzo.civico === 'string' ? indirizzo.civico : '',
    cap: typeof indirizzo.cap === 'string' ? indirizzo.cap : '',
    citta: typeof indirizzo.citta === 'string' ? indirizzo.citta : '',
    provincia: typeof indirizzo.provincia === 'string' ? indirizzo.provincia : '',
  }
}
