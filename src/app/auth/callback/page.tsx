'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase-client'
import { completeAuthCallback } from '@/features/auth/lib/auth-callback'

function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    let cancelled = false

    async function run() {
      const destination = await completeAuthCallback({
        origin: window.location.origin,
        invite: searchParams.get('invite') === 'true',
        code: searchParams.get('code'),
        hash: window.location.hash,
        exchangeCode: async (code) => {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          return { error }
        },
        setSession: async (tokens) => {
          const { error } = await supabase.auth.setSession(tokens)
          return { error }
        },
      })
      if (!cancelled) {
        router.replace(destination)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-label="Accesso in corso" />
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-label="Accesso in corso" />
        </div>
      }
    >
      <AuthCallbackHandler />
    </Suspense>
  )
}
