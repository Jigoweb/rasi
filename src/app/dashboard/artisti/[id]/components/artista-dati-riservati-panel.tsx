'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { getArtistaDatiRiservati } from '@/features/artisti/services/artista-scheda.service'
import { Landmark } from 'lucide-react'

function valueOrDash(value: string | null | undefined): string {
  const text = value?.trim()
  return text ? text : '—'
}

export function ArtistaDatiRiservatiPanel({ artistaId }: { artistaId: string }) {
  const [regime, setRegime] = useState<string | null>(null)
  const [tassazione, setTassazione] = useState<string | null>(null)
  const [dettagli, setDettagli] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getArtistaDatiRiservati(artistaId).then(({ data, error: loadError }) => {
      if (cancelled) return
      if (loadError) setError(loadError.message)
      setRegime(data?.regime ?? null)
      setTassazione(data?.tassazione ?? null)
      setDettagli(data?.dettagli_regime ?? null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [artistaId])

  return (
    <Card className="gap-3 py-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Landmark className="mr-2 h-5 w-5" />
          Regime e tassazione
        </CardTitle>
        <CardDescription>
          Visibili solo ad amministratori e operatori. L&apos;artista non può leggerli.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        {loading ? (
          <div className="h-16 animate-pulse rounded bg-muted" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">Regime</dt>
              <dd className="font-medium">{valueOrDash(regime)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Tassazione</dt>
              <dd className="font-medium">{valueOrDash(tassazione)}</dd>
            </div>
            <div className="sm:col-span-3">
              <dt className="text-sm text-muted-foreground">Dettagli regime</dt>
              <dd className="font-medium whitespace-pre-wrap">{valueOrDash(dettagli)}</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
