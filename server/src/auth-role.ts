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
