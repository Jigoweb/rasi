import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const invite = requestUrl.searchParams.get('invite') === 'true'

  if (code) {
    // Determina destinazione dopo lo scambio del codice
    const destination = invite
      ? `${requestUrl.origin}/auth/imposta-password`
      : `${requestUrl.origin}/dashboard`

    const supabaseResponse = NextResponse.redirect(destination)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(code)

    return supabaseResponse
  }

  // Fallback: se non c'è codice, torna al login
  return NextResponse.redirect(`${requestUrl.origin}/auth`)
}
