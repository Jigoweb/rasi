'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { getTitleCredits } from '@/features/opere/services/external/imdb.service'
import { mapImdbCreditsToCast, type CastEsternoInput, type PrimarietaCast } from '@/features/opere/lib/cast-esterno'
import {
  createCastEsterno,
  deleteCastEsterno,
  listCastEsterno,
  replaceCastEsterno,
  updateCastEsterno,
  type CastEsternoRow,
} from '@/features/opere/services/cast-esterno.service'
import { Download, Loader2, Plus, Trash2, Users } from 'lucide-react'

const PRIMARIETA_LABEL: Record<PrimarietaCast, string> = {
  primario: 'Primario',
  comprimario: 'Comprimario',
}

function emptyDraft(): CastEsternoInput {
  return {
    nome: '',
    personaggio: null,
    primarieta: 'comprimario',
    imdb_nconst: null,
    fonte: 'manuale',
    ordine: 0,
  }
}

export function CastEsternoPanel({
  operaId,
  imdbTconst,
}: {
  operaId: string
  imdbTconst: string | null
}) {
  const [rows, setRows] = useState<CastEsternoRow[]>([])
  const [draft, setDraft] = useState<CastEsternoInput[] | null>(null)
  const [manual, setManual] = useState<CastEsternoInput>(emptyDraft())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error: loadError } = await listCastEsterno(operaId)
    if (loadError) setError(loadError.message)
    else setRows(data ?? [])
    setLoading(false)
  }, [operaId])

  useEffect(() => {
    void reload()
  }, [reload])

  const downloadFromImdb = async () => {
    if (!imdbTconst) return
    setBusy(true)
    setError(null)
    try {
      const { ok, error: fetchError, message, result } = await getTitleCredits(imdbTconst)
      if (!ok || !result) {
        if (fetchError === 'config') {
          setError(message || 'OMDB_API_KEY non configurata. Il cast si può comunque inserire a mano.')
        } else {
          setError('Download del cast non riuscito. Verifica il tconst IMDb oppure inserisci i nomi a mano.')
        }
        return
      }
      const mapped = mapImdbCreditsToCast(result.cast || [])
      if (mapped.length === 0) {
        setError('IMDb/OMDb non ha restituito attori per questo titolo. Aggiungili a mano.')
        return
      }
      setDraft(mapped)
    } finally {
      setBusy(false)
    }
  }

  const saveDraft = async () => {
    if (!draft) return
    setBusy(true)
    setError(null)
    const { error: saveError } = await replaceCastEsterno(operaId, draft.filter((row) => row.nome.trim()))
    setBusy(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setDraft(null)
    await reload()
  }

  const addManual = async () => {
    const nome = manual.nome.trim()
    if (!nome) return
    setBusy(true)
    setError(null)
    const { error: insertError } = await createCastEsterno(operaId, {
      ...manual,
      nome,
      personaggio: manual.personaggio?.trim() || null,
      ordine: rows.length,
    })
    setBusy(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setManual(emptyDraft())
    await reload()
  }

  const changePrimarieta = async (row: CastEsternoRow, primarieta: PrimarietaCast) => {
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, primarieta } : item)))
    const { error: updateError } = await updateCastEsterno(row.id, { primarieta })
    if (updateError) {
      setError(updateError.message)
      await reload()
    }
  }

  const removeRow = async (id: string) => {
    setBusy(true)
    const { error: deleteError } = await deleteCastEsterno(id)
    setBusy(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    await reload()
  }

  return (
    <Card className="gap-4 py-4">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Cast esterno
            </CardTitle>
            <CardDescription>
              Nomi non presenti in anagrafica RASI. Primario e comprimario restano salvati su questa opera.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadFromImdb}
            disabled={busy || !imdbTconst}
            title={imdbTconst ? 'Scarica gli attori dal titolo IMDb collegato' : 'Collega prima un tconst IMDb all\'opera'}
          >
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Scarica cast da IMDb
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Il download usa OMDb (chiave gratuita <span className="font-mono">OMDB_API_KEY</span>): solo gli attori in evidenza, senza personaggio e senza codice persona.
          OMDb li propone tutti come primari; la primarietà si corregge qui e non viene riscaricata da sola.
          Il cast completo IMDb (comprimari) non è incluso in quel piano: aggiungilo a mano.
        </p>
        {!imdbTconst && (
          <p className="text-sm text-muted-foreground">Nessun tconst IMDb su questa opera. Il cast esterno si può comunque compilare a mano.</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {draft && (
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium">Anteprima da IMDb ({draft.length}). Il salvataggio sostituisce il cast esterno già presente.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDraft(null)} disabled={busy}>Annulla</Button>
                <Button size="sm" onClick={saveDraft} disabled={busy}>Salva sulla scheda</Button>
              </div>
            </div>
            <div className="space-y-2">
              {draft.map((row, index) => (
                <div key={`${row.nome}-${index}`} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_180px_auto] gap-2 items-center">
                  <Input
                    value={row.nome}
                    aria-label={`Nome ${index + 1}`}
                    onChange={(event) => setDraft((current) => current?.map((item, i) => i === index ? { ...item, nome: event.target.value } : item) ?? null)}
                  />
                  <Input
                    value={row.personaggio ?? ''}
                    placeholder="Personaggio"
                    aria-label={`Personaggio ${index + 1}`}
                    onChange={(event) => setDraft((current) => current?.map((item, i) => i === index ? { ...item, personaggio: event.target.value || null } : item) ?? null)}
                  />
                  <Select
                    value={row.primarieta}
                    onValueChange={(value) => setDraft((current) => current?.map((item, i) => i === index ? { ...item, primarieta: value as PrimarietaCast } : item) ?? null)}
                  >
                    <SelectTrigger aria-label={`Primarietà ${index + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primario">Primario</SelectItem>
                      <SelectItem value="comprimario">Comprimario</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Rimuovi ${row.nome}`}
                    onClick={() => setDraft((current) => current?.filter((_, i) => i !== index) ?? null)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="h-16 animate-pulse rounded bg-muted" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun cast esterno salvato.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{row.nome}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {row.personaggio || 'Personaggio non indicato'}
                    {row.imdb_nconst ? ` · ${row.imdb_nconst}` : ''}
                  </div>
                </div>
                <Badge variant="outline">{row.fonte === 'imdb' ? 'IMDb' : 'Manuale'}</Badge>
                <Select value={row.primarieta} onValueChange={(value) => changePrimarieta(row, value as PrimarietaCast)}>
                  <SelectTrigger className="w-full sm:w-[180px]" aria-label={`Primarietà di ${row.nome}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primario">{PRIMARIETA_LABEL.primario}</SelectItem>
                    <SelectItem value="comprimario">{PRIMARIETA_LABEL.comprimario}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" aria-label={`Elimina ${row.nome}`} onClick={() => removeRow(row.id)} disabled={busy}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_180px_auto] gap-2 items-end border-t pt-4">
          <Input
            value={manual.nome}
            placeholder="Nome"
            aria-label="Nome cast esterno"
            onChange={(event) => setManual((current) => ({ ...current, nome: event.target.value }))}
          />
          <Input
            value={manual.personaggio ?? ''}
            placeholder="Personaggio"
            aria-label="Personaggio cast esterno"
            onChange={(event) => setManual((current) => ({ ...current, personaggio: event.target.value || null }))}
          />
          <Select
            value={manual.primarieta}
            onValueChange={(value) => setManual((current) => ({ ...current, primarieta: value as PrimarietaCast }))}
          >
            <SelectTrigger aria-label="Primarietà nuovo cast">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primario">Primario</SelectItem>
              <SelectItem value="comprimario">Comprimario</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addManual} disabled={busy || !manual.nome.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
