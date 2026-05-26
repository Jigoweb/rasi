import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  // Refresh session (important: use getUser, not getSession)
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Redirect dalla root '/' verso '/auth' se l'utente non è loggato
  if (pathname === '/') {
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/auth'
      return NextResponse.redirect(redirectUrl)
    } else {
      // Se è loggato, possiamo reindirizzarlo alla dashboard
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Route per il login
  if (pathname.startsWith('/auth')) {
    // /auth/imposta-password richiede sessione attiva: lascia sempre passare
    if (pathname.startsWith('/auth/imposta-password') || pathname.startsWith('/auth/callback')) {
      return supabaseResponse
    }
    if (user) {
      // Già loggato su /auth → dashboard
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
    return supabaseResponse
  }

  // Tutte le route della dashboard richiedono login
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/auth'
      return NextResponse.redirect(redirectUrl)
    }

    const userRole = user.user_metadata?.ruolo

    // Artista role: walled garden - only allow /dashboard/profilo
    if (userRole === 'artista') {
      if (!pathname.startsWith('/dashboard/profilo')) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/dashboard/profilo'
        return NextResponse.redirect(redirectUrl)
      }
    }

    // Non-admin/operatore trying to access /dashboard/utenti
    if (pathname.startsWith('/dashboard/utenti') && userRole !== 'admin' && userRole !== 'operatore') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }

    // Non-admin trying to access /dashboard/cms
    if (pathname.startsWith('/dashboard/cms') && userRole !== 'admin') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Per tutte le altre route (es. landing page "/"), lasciamo passare senza check
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
