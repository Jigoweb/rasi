/**
 * Ruoli applicativi. Livelli operatore (resoconto RASI del 26/10, punto C5):
 * - operatore       → «Operatore pro»: tutto, compresa la validazione delle opere
 * - operatore_base  → legge tutto; nella sezione Opere propone modifiche, non scrive
 * - tirocinante     → solo sezione Opere; propone modifiche, non scrive. Degli artisti
 *                     vede solo i dati per la ricerca nel cast
 * Il blocco vero è nella RLS (20261112090100 e 20261113115053); qui si decide cosa mostrare.
 */
export type UserRole =
  | 'admin'
  | 'operatore'
  | 'operatore_base'
  | 'tirocinante'
  | 'collecting'
  | 'artista'

export const VALID_USER_ROLES: UserRole[] = [
  'admin',
  'operatore',
  'operatore_base',
  'tirocinante',
  'collecting',
  'artista',
]

export type RolePermissions = {
  isAdmin: boolean
  /** Operatore pro (ruolo `operatore`). */
  isOperatore: boolean
  isOperatoreBase: boolean
  isTirocinante: boolean
  isArtista: boolean
  /** Admin o Operatore pro: pieni poteri sui dati. */
  isStaff: boolean
  /** Legge tutta la banca dati (staff + Operatore base). */
  canReadBancaDati: boolean
  /** Lavora nella sezione Opere (staff + Operatore base + Tirocinante). */
  canEditOpereSection: boolean
  /** Valida o svalida un'opera ed elimina opere. */
  canValidateOpere: boolean
  /** Scrive fuori dalla sezione Opere (artisti, programmazioni, individuazioni…). */
  canWriteOutsideOpere: boolean
  canManageUsers: boolean
  canEditRoles: boolean
}

export type RoleChangeResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Fail-closed: ruolo assente/invalido → collecting (zero privilegi nella matrice).
 */
export function resolveUserRole(ruolo: unknown): UserRole {
  if (typeof ruolo === 'string' && VALID_USER_ROLES.includes(ruolo as UserRole)) {
    return ruolo as UserRole
  }
  return 'collecting'
}

/**
 * Legge il ruolo da app_metadata (colonna auth.users.raw_app_meta_data).
 * È l'unica fonte autoritativa: user_metadata è scrivibile dal client
 * con auth.updateUser({ data }) e non va usato per autorizzare.
 * Ruolo assente → null. Nessun fallback.
 */
export function readAppMetadataRole(appMetadata: unknown): string | null {
  if (!appMetadata || typeof appMetadata !== 'object') return null
  const ruolo = (appMetadata as Record<string, unknown>).ruolo
  return typeof ruolo === 'string' && ruolo.length > 0 ? ruolo : null
}

/**
 * Ruolo usato per autorizzare. Ignora user_metadata anche se contiene
 * ruolo=admin o ruolo=operatore.
 */
export function readAuthoritativeUserRole(user: {
  app_metadata?: unknown
  user_metadata?: unknown
} | null | undefined): string | null {
  return readAppMetadataRole(user?.app_metadata)
}

/** Merge del ruolo in app_metadata. Non tocca user_metadata. */
export function mergeAppMetadataWithRole(
  existing: Record<string, unknown> | null | undefined,
  ruolo: string
): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    ruolo,
  }
}

const ARTISTA_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Legge artista_id da app_metadata (auth.users.raw_app_meta_data).
 * Unica fonte autoritativa. user_metadata è scrivibile dal client e va ignorato.
 * Assente o non UUID → null (nessun dato artista).
 */
export function readAppMetadataArtistaId(appMetadata: unknown): string | null {
  if (!appMetadata || typeof appMetadata !== 'object') return null
  const value = (appMetadata as Record<string, unknown>).artista_id
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return ARTISTA_ID_RE.test(trimmed) ? trimmed : null
}

/**
 * Merge di ruolo e collegamento artista in app_metadata.
 * Non sovrascrive le altre chiavi (provider, e il ruolo resta quello passato).
 * Fuori dal ruolo artista la chiave artista_id viene tolta (scollegamento).
 * artistaId null con ruolo artista conserva un collegamento già presente.
 */
export function mergeAppMetadataWithArtistaLink(
  existing: Record<string, unknown> | null | undefined,
  ruolo: string,
  artistaId: string | null
): Record<string, unknown> {
  const merged = mergeAppMetadataWithRole(existing, ruolo)
  if (ruolo === 'artista' && artistaId) {
    return { ...merged, artista_id: artistaId }
  }
  if (ruolo !== 'artista') {
    const next = { ...merged }
    delete next.artista_id
    return next
  }
  return merged
}

const STAFF_ROLES = new Set<string>(['admin', 'operatore'])
const BANCA_DATI_READER_ROLES = new Set<string>(['admin', 'operatore', 'operatore_base'])
const OPERE_EDITOR_ROLES = new Set<string>(['admin', 'operatore', 'operatore_base', 'tirocinante'])

/** Admin o Operatore pro. */
export function isStaffRole(role: string | null | undefined): boolean {
  return !!role && STAFF_ROLES.has(role)
}

/** Staff + Operatore base: legge tutta la banca dati. */
export function canReadBancaDati(role: string | null | undefined): boolean {
  return !!role && BANCA_DATI_READER_ROLES.has(role)
}

/** Staff + Operatore base + Tirocinante: lavora nella sezione Opere. */
export function canEditOpereSection(role: string | null | undefined): boolean {
  return !!role && OPERE_EDITOR_ROLES.has(role)
}

/** Operatore base e Tirocinante salvano nella coda, non sulle tabelle. */
export function mustProposeOpereChanges(role: string | null | undefined): boolean {
  return role === 'operatore_base' || role === 'tirocinante'
}

/**
 * Il ruolo può modificare questa opera (dati, episodi, cast, cast esterno)?
 * Staff sempre; Operatore base e Tirocinante solo se l'opera non è validata.
 * Stessa regola di public.opera_modificabile() nel database.
 */
export function canEditOpera(
  role: string | null | undefined,
  statoValidazione: string | null | undefined,
): boolean {
  if (isStaffRole(role)) return true
  return canEditOpereSection(role) && statoValidazione !== 'validato'
}

/** Messaggio per chi prova a modificare un'opera validata senza essere Operatore pro. */
export const OPERA_VALIDATA_ERROR =
  "Opera validata: solo un Operatore pro o un amministratore può modificarla"

export function getRolePermissions(role: UserRole): RolePermissions {
  const isStaff = isStaffRole(role)
  return {
    isAdmin: role === 'admin',
    isOperatore: role === 'operatore',
    isOperatoreBase: role === 'operatore_base',
    isTirocinante: role === 'tirocinante',
    isArtista: role === 'artista',
    isStaff,
    canReadBancaDati: canReadBancaDati(role),
    canEditOpereSection: canEditOpereSection(role),
    canValidateOpere: isStaff,
    canWriteOutsideOpere: isStaff,
    canManageUsers: isStaff,
    canEditRoles: isStaff,
  }
}

export function rolesAssignableBy(actorRole: UserRole): UserRole[] {
  if (actorRole === 'admin') {
    return [...VALID_USER_ROLES]
  }
  if (actorRole === 'operatore') {
    return ['operatore', 'operatore_base', 'tirocinante', 'collecting', 'artista']
  }
  return []
}

/**
 * Ruoli che l'attore può assegnare in un invito email.
 * Più stretto di rolesAssignableBy: collecting non è invitabile.
 */
export function rolesInvitableBy(actorRole: UserRole): UserRole[] {
  if (actorRole === 'admin') {
    return ['admin', 'operatore', 'operatore_base', 'tirocinante', 'artista']
  }
  if (actorRole === 'operatore') {
    return ['operatore', 'operatore_base', 'tirocinante', 'artista']
  }
  return []
}

export function canActorChangeTargetRole(
  actorRole: UserRole,
  targetCurrentRole: UserRole,
  newRole: UserRole
): RoleChangeResult {
  const assignable = rolesAssignableBy(actorRole)
  if (assignable.length === 0) {
    return { ok: false, error: 'Non hai i permessi per modificare i ruoli' }
  }

  if (actorRole === 'operatore' && targetCurrentRole === 'admin') {
    return {
      ok: false,
      error: 'Gli operatori non possono modificare utenti amministratori',
    }
  }

  if (!assignable.includes(newRole)) {
    if (actorRole === 'operatore' && newRole === 'admin') {
      return {
        ok: false,
        error: 'Gli operatori non possono assegnare il ruolo admin',
      }
    }
    return { ok: false, error: 'Ruolo non assegnabile' }
  }

  return { ok: true }
}

/**
 * Template e import del cast in scheda opera: chi lavora nella sezione Opere.
 * Per Operatore base e Tirocinante serve anche un'opera non validata
 * (canEditOpera, controllato lato server prima di scrivere).
 */
export function canManageOperaCast(role: string | null | undefined): boolean {
  return canEditOpereSection(role)
}

/** Recupero contatti e dati di regime: solo admin e operatore. */
export function canManageArtistiContatti(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'operatore'
}

