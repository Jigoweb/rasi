'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Music, AlertCircle, Loader2 } from 'lucide-react'

function LinkErroreContent() {
  const searchParams = useSearchParams()
  const tipo = searchParams.get('tipo')
  const isInvite = tipo === 'invito'

  const title = isInvite ? 'Invito non valido' : 'Link non valido'
  const description = isInvite
    ? 'Il link di invito non è valido o è scaduto. Contatta l’amministrazione RASI per richiedere un nuovo invito.'
    : 'Il link non è valido o è scaduto. Torna al login e riprova.'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Music className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">{title}</CardTitle>
          <CardDescription className="text-center">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <AlertCircle className="h-12 w-12 text-amber-500" aria-hidden />
          <Button asChild className="w-full">
            <Link href="/auth">Torna al login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LinkErrorePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <LinkErroreContent />
    </Suspense>
  )
}
