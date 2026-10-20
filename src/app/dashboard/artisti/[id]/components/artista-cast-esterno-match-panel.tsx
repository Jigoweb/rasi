'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { formatEpisodioLabel, formatRuoloPrimarieta, suggestRuoloPerPrimarieta, type RuoloOption } from '@/features/opere/lib/cast-esterno'
import {
  cercaCastEsternoPerArtista,
  convertiCastEsternoInPartecipazioni,
  type CastEsternoCorrispondente,
} from '@/features/artisti/services/artista-scheda.service'
import { Loader2, Sparkles } from 'lucide-react'

/**
 * Proposta di riconoscimento: righe di cast esterno con lo stesso nome dell'artista.
 * L'operatore conferma (gli omonimi si tolgono dalla selezione) e le righe diventano partecipazioni.
 */
export function ArtistaCastEsternoMatchPanel({
  artistaId,
  ruoli,
  onConverted,
}: {
  artistaId: string
  ruoli: RuoloOption[]
  onConverted: () => void
}) {
  const [matches, setMatches] = useState<CastEsternoCorrispondente[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [ruoloByCast, setRuoloByCast] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error: loadError } = await cercaCastEsternoPerArtista(artistaId)
    if (loadError) setError(loadError.message)
    setMatches(data)
    setSelected(new Set(data.map((row) => row.cast_id)))
    setLoading(false)
  }, [artistaId])

  useEffect(() => {
    void reload()
  }, [reload])

  // Ruolo proposto da primario/comprimario, finché l'operatore non lo cambia.
  useEffect(() => {
    if (ruoli.length === 0) return
    setRuoloByCast((current) => {
      const next = { ...current }
      for (const row of matches) {
        if (!next[row.cast_id]) {
          const suggested = suggestRuoloPerPrimarieta(row.primarieta, ruoli, row.ruolo)
          if (suggested) next[row.cast_id] = suggested
        }
      }
      return next
    })
  }, [matches, ruoli])

  const opereCount = useMemo(() => new Set(matches.map((row) => row.opera_id)).size, [matches])
  const selectedRows = matches.filter((row) => selected.has(row.cast_id))
  const missingRuolo = selectedRows.some((row) => !ruoloByCast[row.cast_id])

  if (loading || matches.length === 0) return null

  const toggle = (castId: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(castId)) next.delete(castId)
      else next.add(castId)
      return next
    })
  }

  const convert = async () => {
    if (selectedRows.length === 0 || missingRuolo) return
    setConverting(true)
    setError(null)
    const { data: created, error: convertError } = await convertiCastEsternoInPartecipazioni(
      artistaId,
      selectedRows.map((row) => ({ cast_id: row.cast_id, ruolo_id: ruoloByCast[row.cast_id] })),
    )
    setConverting(false)
    if (convertError) {
      setError(convertError.message)
      return
    }
    toast.success(
      created === selectedRows.length
        ? `${created} partecipazion${created === 1 ? 'e creata' : 'i create'} dal cast esterno`
        : `${created} partecipazioni create, ${selectedRows.length - created} già presenti`,
    )
    await reload()
    onConverted()
  }

  return (
    <Card className="gap-3 py-4 border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="mr-2 h-5 w-5 text-emerald-600" />
          Trovato nel cast esterno di {opereCount} {opereCount === 1 ? 'opera' : 'opere'}
        </CardTitle>
        <CardDescription>
          Queste righe portano il nome (o il codice IMDb) dell&apos;artista. Togli la spunta agli omonimi,
          controlla il ruolo e converti: diventano partecipazioni RASI e spariscono dal cast esterno.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="divide-y rounded-md border">
          {matches.map((row) => (
            <div key={row.cast_id} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center">
              <Checkbox
                checked={selected.has(row.cast_id)}
                onCheckedChange={() => toggle(row.cast_id)}
                aria-label={`Seleziona ${row.opera_titolo}`}
              />
              <div className="min-w-0 flex-1 text-sm">
                <Link href={`/dashboard/opere/${row.opera_id}`} className="font-medium hover:text-primary">
                  {row.opera_titolo}
                </Link>
                {row.opera_anno && <span className="text-muted-foreground"> ({row.opera_anno})</span>}
                <div className="text-muted-foreground">
                  {row.episodio_id
                    ? formatEpisodioLabel({
                        id: row.episodio_id,
                        numero_stagione: row.numero_stagione,
                        numero_episodio: row.numero_episodio,
                        titolo_episodio: row.titolo_episodio,
                      })
                    : row.opera_tipo === 'serie_tv' ? 'Tutta la serie' : null}
                  {row.personaggio ? ` · ${row.personaggio}` : ''}
                  {` · scritto «${row.nome}»`}
                </div>
              </div>
              <Badge variant="outline">{formatRuoloPrimarieta(row.ruolo, row.primarieta)}</Badge>
              {row.corrispondenza === 'imdb' && <Badge variant="secondary">IMDb</Badge>}
              <Select
                value={ruoloByCast[row.cast_id] ?? ''}
                onValueChange={(value) => setRuoloByCast((current) => ({ ...current, [row.cast_id]: value }))}
              >
                <SelectTrigger className="w-full sm:w-[220px]" aria-label={`Ruolo per ${row.opera_titolo}`}>
                  <SelectValue placeholder="Scegli ruolo" />
                </SelectTrigger>
                <SelectContent>
                  {ruoli.map((ruolo) => (
                    <SelectItem key={ruolo.id} value={ruolo.id}>{ruolo.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3">
          {missingRuolo && <span className="text-sm text-amber-700">Scegli un ruolo per ogni riga selezionata.</span>}
          <Button onClick={convert} disabled={converting || selectedRows.length === 0 || missingRuolo}>
            {converting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Converti {selectedRows.length} in partecipazioni RASI
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
