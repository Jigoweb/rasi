import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthCallbackDestination } from '@/features/auth/lib/auth-callback'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const invite = requestUrl.searchParams.get('invite') === 'true'
  const origin = requestUrl.origin

  if (!code) {
    return NextResponse.redirect(
      getAuthCallbackDestination({ origin, invite, success: false })
    )
  }

  const destination = getAuthCallbackDestination({
    origin,
    invite,
    success: true,
  })
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

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      getAuthCallbackDestination({ origin, invite, success: false })
    )
  }

  return supabaseResponse
}
