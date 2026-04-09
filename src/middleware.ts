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

  // No session -> redirect to /auth
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

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
