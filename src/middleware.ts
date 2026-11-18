import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  middlewareUserFromClaims,
  middlewareVerification,
  resolveMiddlewareRedirect,
  type MiddlewareUser,
} from '@/features/public-site/middleware-policy'
import { readAppMetadataArtistaId, readAppMetadataRole } from '@/shared/lib/auth-permissions'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname
  const verification = middlewareVerification(pathname)

  // Nessuna decisione di accesso: si rinnova solo il cookie in scadenza.
  // La sessione letta dai cookie non è verificata e non autorizza.
  if (!verification) {
    await supabase.auth.getSession()
    return supabaseResponse
  }

  let user: MiddlewareUser = null
  if (verification === 'claims') {
    // Presenza sessione. getClaims verifica la firma in locale quando il
    // progetto usa una chiave asimmetrica (JWKS in cache). Con HS256
    // ricontrolla la sessione su Auth. Non si usa user_metadata.
    const { data } = await supabase.auth.getClaims()
    user = middlewareUserFromClaims(data?.claims)
  } else {
    // I muri di ruolo leggono app_metadata dal record Auth, non dal claim:
    // un cambio ruolo vale prima del refresh del JWT.
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      user = {
        ruolo: readAppMetadataRole(authUser.app_metadata),
        artistaId: readAppMetadataArtistaId(authUser.app_metadata),
      }
    }
  }

  const redirectTo = resolveMiddlewareRedirect(pathname, user)

  if (redirectTo) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = redirectTo
    const redirectResponse = NextResponse.redirect(redirectUrl)
    // Il refresh del JWT scrive i cookie su supabaseResponse. Vanno copiati,
    // altrimenti il redirect perde la sessione appena ruotata.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, public folder contents
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
