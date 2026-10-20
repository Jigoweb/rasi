'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Textarea } from '@/shared/components/ui/textarea'
import { getArtistaNote, saveArtistaNote } from '@/features/artisti/services/artista-scheda.service'
import { Loader2, NotebookPen } from 'lucide-react'

export function ArtistaNotePanel({ artistaId }: { artistaId: string }) {
  const [saved, setSaved] = useState('')
  const [value, setValue] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getArtistaNote(artistaId).then(({ data, error: loadError }) => {
      if (cancelled) return
      if (loadError) setError(loadError.message)
      setSaved(data?.note ?? '')
      setValue(data?.note ?? '')
      setUpdatedAt(data?.updated_at ?? null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [artistaId])

  const save = async () => {
    setSaving(true)
    setError(null)
    const { data, error: saveError } = await saveArtistaNote(artistaId, value)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setSaved(data?.note ?? value)
    setUpdatedAt(data?.updated_at ?? null)
  }

  const dirty = value !== saved

  return (
    <Card className="gap-3 py-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          <NotebookPen className="mr-2 h-5 w-5" />
          Note
        </CardTitle>
        <CardDescription>Note interne dello staff. Non sono visibili all&apos;artista.</CardDescription>
      </CardHeader>
      <CardContent className="px-4 space-y-2">
        {loading ? (
          <div className="h-24 animate-pulse rounded bg-muted" />
        ) : (
          <Textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Scrivi una nota…"
            rows={4}
            aria-label="Note sull'artista"
          />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {updatedAt ? `Ultima modifica: ${new Date(updatedAt).toLocaleString('it-IT')}` : ''}
          </span>
          <div className="flex gap-2">
            {dirty && (
              <Button variant="outline" size="sm" onClick={() => setValue(saved)} disabled={saving}>
                Annulla
              </Button>
            )}
            <Button size="sm" onClick={save} disabled={!dirty || saving || loading}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salva note
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
