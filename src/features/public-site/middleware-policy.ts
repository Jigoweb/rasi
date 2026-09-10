export type MiddlewareUser = {
  ruolo?: string | null;
} | null;

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
