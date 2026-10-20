/**
 * Ruolo autoritativo da app_metadata. Allineato a
 * readAppMetadataRole in src/shared/lib/auth-permissions.ts.
 * Nessun fallback su user_metadata.
 */
export function readAppMetadataRole(appMetadata: unknown): string | null {
  if (!appMetadata || typeof appMetadata !== 'object') return null
  const ruolo = (appMetadata as Record<string, unknown>).ruolo
  return typeof ruolo === 'string' && ruolo.length > 0 ? ruolo : null
}

const ARTISTA_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * artista_id autoritativo da app_metadata. Nessun fallback su user_metadata.
 * Il worker non filtra i job con questo id (usa il service role); lo legge
 * solo da qui così un claim user_metadata non diventa un'identità artista.
 */
export function readAppMetadataArtistaId(appMetadata: unknown): string | null {
  if (!appMetadata || typeof appMetadata !== 'object') return null
  const value = (appMetadata as Record<string, unknown>).artista_id
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return ARTISTA_ID_RE.test(trimmed) ? trimmed : null
}
