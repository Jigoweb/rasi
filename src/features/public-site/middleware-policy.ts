import {
  readAppMetadataArtistaId,
  readAppMetadataRole,
} from "@/shared/lib/auth-permissions";

export type MiddlewareUser = {
  ruolo?: string | null;
  /** Da app_metadata.artista_id. Assente → null, nessun dato artista. */
  artistaId?: string | null;
} | null;

export type MiddlewareClaims = {
  app_metadata?: unknown;
} | null;

/**
 * True solo se il redirect dipende dall'identità verificata.
 * Sulle altre route il middleware rinnova la sessione senza chiamare Auth.
 */
export function middlewareRequiresVerifiedUser(pathname: string): boolean {
  return middlewareVerification(pathname) !== null;
}

/**
 * `claims`: basta il JWT verificato (presenza sessione, es. /auth).
 * `user`: servono ruolo e artista_id dal record Auth, aggiornati prima
 * del refresh del token (muri del dashboard).
 * `null`: nessuna decisione di accesso.
 */
export type MiddlewareVerification = "claims" | "user";

export function middlewareVerification(
  pathname: string
): MiddlewareVerification | null {
  if (
    pathname.startsWith("/auth/imposta-password") ||
    pathname.startsWith("/auth/callback")
  ) {
    return null;
  }

  if (pathname.startsWith("/dashboard")) return "user";
  if (pathname.startsWith("/auth")) return "claims";
  return null;
}

/**
 * Utente per il redirect, solo da claim JWT già verificati.
 * Ignora user_metadata: è scrivibile dal client.
 */
export function middlewareUserFromClaims(
  claims: MiddlewareClaims | undefined
): MiddlewareUser {
  if (!claims) return null;
  return {
    ruolo: readAppMetadataRole(claims.app_metadata),
    artistaId: readAppMetadataArtistaId(claims.app_metadata),
  };
}

export function resolveMiddlewareRedirect(
  pathname: string,
  user: MiddlewareUser
): string | null {
  if (pathname === "/") {
    return null;
  }

  if (pathname.startsWith("/auth")) {
    if (
      pathname.startsWith("/auth/imposta-password") ||
      pathname.startsWith("/auth/callback")
    ) {
      return null;
    }
    if (user) return "/dashboard";
    return null;
  }

  if (pathname.startsWith("/dashboard")) {
    if (!user) return "/auth";

    const role = user.ruolo;
    if (role === "artista" && !pathname.startsWith("/dashboard/profilo")) {
      return "/dashboard/profilo";
    }
    if (
      pathname.startsWith("/dashboard/utenti") &&
      role !== "admin" &&
      role !== "operatore"
    ) {
      return "/dashboard";
    }
    if (pathname.startsWith("/dashboard/cms") && role !== "admin") {
      return "/dashboard";
    }
  }

  return null;
}
