'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { MultiSelect } from '@/shared/components/ui/multi-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { getTitleCredits } from '@/features/opere/services/external/imdb.service'
import {
  formatEpisodioLabel,
  groupCastByEpisodio,
  mapImdbCreditsToCast,
  type CastEsternoInput,
  type EpisodioRef,
  type PrimarietaCast,
} from '@/features/opere/lib/cast-esterno'
import {
  createCastEsterno,
  deleteCastEsterno,
  listCastEsterno,
  listCastEsternoArtistiCorrispondenti,
  replaceCastEsterno,
  updateCastEsterno,
  type CastEsternoRow,
} from '@/features/opere/services/cast-esterno.service'
import { Download, Edit, Loader2, MoreHorizontal, Plus, Trash2, Tv, UserCheck, Users } from 'lucide-react'

const PRIMARIETA_LABEL: Record<PrimarietaCast, string> = {
  primario: 'Primario',
  comprimario: 'Comprimario',
}

/** Valore Select per "intera opera/serie" (Radix non accetta value vuoto). */
const SERIE_SCOPE = '__serie__'
const ALL_SCOPE = '__all__'

export type CastEsternoEpisodio = EpisodioRef & { imdb_tconst?: string | null }

type EditState = {
  row: CastEsternoRow
  nome: string
  personaggio: string
  primarieta: PrimarietaCast
  episodioScope: string
}

type ArtistaCorrispondente = { artista_id: string; artista_nome: string }

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

function scopeToEpisodioId(scope: string): string | null {
  return scope === SERIE_SCOPE || scope === ALL_SCOPE ? null : scope
}

export function CastEsternoPanel({
  operaId,
  imdbTconst,
  episodi = [],
}: {
  operaId: string
  imdbTconst: string | null
  episodi?: CastEsternoEpisodio[]
}) {
  const hasEpisodi = episodi.length > 0
  const [rows, setRows] = useState<CastEsternoRow[]>([])
  const [draft, setDraft] = useState<{ rows: CastEsternoInput[]; episodioId: string | null } | null>(null)
  const [manual, setManual] = useState<CastEsternoInput>(emptyDraft())
  const [manualEpisodi, setManualEpisodi] = useState<string[]>([])
  const [scope, setScope] = useState<string>(ALL_SCOPE)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [corrispondenti, setCorrispondenti] = useState<Map<string, ArtistaCorrispondente[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const episodiById = useMemo(() => new Map(episodi.map((episodio) => [episodio.id, episodio])), [episodi])

  const episodioOptions = useMemo(
    () =>
      [...episodi]
        .sort(
          (a, b) =>
            (a.numero_stagione ?? 9999) - (b.numero_stagione ?? 9999) ||
            (a.numero_episodio ?? 9999) - (b.numero_episodio ?? 9999),
        )
        .map((episodio) => ({
          value: episodio.id,
          label: formatEpisodioLabel(episodio),
          category: `Stagione ${episodio.numero_stagione ?? '?'}`,
        })),
    [episodi],
  )

  const reload = useCallback(async () => {
    setLoading(true)
    const [{ data, error: loadError }, { data: matches }] = await Promise.all([
      listCastEsterno(operaId),
      listCastEsternoArtistiCorrispondenti(operaId),
    ])
    if (loadError) setError(loadError.message)
    else setRows(data ?? [])
    const byCast = new Map<string, ArtistaCorrispondente[]>()
    for (const match of matches ?? []) {
      const list = byCast.get(match.cast_id) ?? []
      list.push({ artista_id: match.artista_id, artista_nome: match.artista_nome })
      byCast.set(match.cast_id, list)
    }
    setCorrispondenti(byCast)
    setLoading(false)
  }, [operaId])

  useEffect(() => {
    void reload()
  }, [reload])

  const visibleRows = useMemo(() => {
    if (!hasEpisodi || scope === ALL_SCOPE) return rows
    const episodioId = scopeToEpisodioId(scope)
    return rows.filter((row) => (row.episodio_id ?? null) === episodioId)
  }, [rows, scope, hasEpisodi])

  const groups = useMemo(
    () => (hasEpisodi ? groupCastByEpisodio(visibleRows, episodi) : [{ episodio: null, rows: visibleRows }]),
    [visibleRows, episodi, hasEpisodi],
  )

  const scopeEpisodio = scope === ALL_SCOPE || scope === SERIE_SCOPE ? null : episodiById.get(scope) ?? null
  const downloadTconst = scopeEpisodio ? scopeEpisodio.imdb_tconst ?? null : imdbTconst
  const downloadTarget = scopeEpisodio ? formatEpisodioLabel(scopeEpisodio) : hasEpisodi ? 'tutta la serie' : 'questa opera'

  const draftEpisodio = draft?.episodioId ? episodiById.get(draft.episodioId) ?? null : null
  const draftTarget = draftEpisodio ? formatEpisodioLabel(draftEpisodio) : hasEpisodi ? 'tutta la serie' : 'questa opera'

  const downloadFromImdb = async () => {
    if (!downloadTconst) return
    setBusy(true)
    setError(null)
    try {
      const { ok, error: fetchError, message, result } = await getTitleCredits(downloadTconst)
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
      setDraft({ rows: mapped, episodioId: scopeEpisodio?.id ?? null })
    } finally {
      setBusy(false)
    }
  }

  const saveDraft = async () => {
    if (!draft) return
    setBusy(true)
    setError(null)
    const { error: saveError } = await replaceCastEsterno(
      operaId,
      draft.rows.filter((row) => row.nome.trim()),
      draft.episodioId,
    )
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
    // Nessun episodio scelto = cast dell'intera opera/serie; più episodi = una riga per episodio.
    const targets: (string | null)[] = hasEpisodi && manualEpisodi.length > 0 ? manualEpisodi : [null]
    for (const [index, episodioId] of targets.entries()) {
      const { error: insertError } = await createCastEsterno(
        operaId,
        {
          ...manual,
          nome,
          personaggio: manual.personaggio?.trim() || null,
          ordine: rows.length + index,
        },
        episodioId,
      )
      if (insertError) {
        setBusy(false)
        setError(insertError.message)
        await reload()
        return
      }
    }
    setBusy(false)
    setManual(emptyDraft())
    await reload()
  }

  const openEdit = (row: CastEsternoRow) => {
    setEditing({
      row,
      nome: row.nome,
      personaggio: row.personaggio ?? '',
      primarieta: row.primarieta,
      episodioScope: row.episodio_id ?? SERIE_SCOPE,
    })
  }

  const saveEdit = async () => {
    if (!editing) return
    const nome = editing.nome.trim()
    if (!nome) {
      setError('Il nome è obbligatorio.')
      return
    }
    setBusy(true)
    setError(null)
    const { error: updateError } = await updateCastEsterno(editing.row.id, {
      nome,
      personaggio: editing.personaggio.trim() || null,
      primarieta: editing.primarieta,
      ...(hasEpisodi ? { episodio_id: scopeToEpisodioId(editing.episodioScope) } : {}),
    })
    setBusy(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setEditing(null)
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

  const renderRow = (row: CastEsternoRow) => {
    const matches = corrispondenti.get(row.id) ?? []
    return (
      <div key={row.id} className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{row.nome}</div>
          <div className="text-sm text-muted-foreground truncate">
            {row.personaggio || 'Personaggio non indicato'}
            {row.imdb_nconst ? ` · ${row.imdb_nconst}` : ''}
          </div>
          {matches.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {matches.map((match) => (
                <Link
                  key={match.artista_id}
                  href={`/dashboard/artisti/${match.artista_id}`}
                  className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700 hover:underline"
                  title="Apri la scheda: da lì puoi convertire questa riga in partecipazione RASI"
                >
                  <UserCheck className="h-3 w-3" />
                  In anagrafica: {match.artista_nome}
                </Link>
              ))}
            </div>
          )}
        </div>
        <Badge variant="outline">{row.fonte === 'imdb' ? 'IMDb' : 'Manuale'}</Badge>
        <Select value={row.primarieta} onValueChange={(value) => changePrimarieta(row, value as PrimarietaCast)}>
          <SelectTrigger className="w-full sm:w-[160px]" aria-label={`Primarietà di ${row.nome}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primario">{PRIMARIETA_LABEL.primario}</SelectItem>
            <SelectItem value="comprimario">{PRIMARIETA_LABEL.comprimario}</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Azioni per ${row.nome}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row)}>
              <Edit className="h-4 w-4 mr-2" />
              Modifica
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => removeRow(row.id)} className="text-red-600" disabled={busy}>
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <Card className="gap-4 py-4">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Cast esterno
              <Badge variant="secondary" className="ml-2">{rows.length}</Badge>
            </CardTitle>
            <CardDescription>
              Nomi non presenti in anagrafica RASI.
              {hasEpisodi ? ' Ogni nome può valere per tutta la serie o per singoli episodi.' : ''}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadFromImdb}
            disabled={busy || !downloadTconst}
            title={
              downloadTconst
                ? `Scarica gli attori IMDb per ${downloadTarget}`
                : scopeEpisodio
                  ? 'Questo episodio non ha un tconst IMDb'
                  : 'Collega prima un tconst IMDb all\'opera'
            }
          >
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Scarica cast da IMDb{scopeEpisodio ? ` (${formatEpisodioLabel({ ...scopeEpisodio, titolo_episodio: null })})` : ''}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Il download usa OMDb (chiave gratuita <span className="font-mono">OMDB_API_KEY</span>): solo gli attori in evidenza, senza personaggio e senza codice persona.
          OMDb li propone tutti come primari; la primarietà si corregge qui e non viene riscaricata da sola.
          Il cast completo IMDb (comprimari) non è incluso in quel piano: aggiungilo a mano.
        </p>
        {!imdbTconst && !hasEpisodi && (
          <p className="text-sm text-muted-foreground">Nessun tconst IMDb su questa opera. Il cast esterno si può comunque compilare a mano.</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {hasEpisodi && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Label htmlFor="cast-esterno-scope" className="text-sm text-muted-foreground shrink-0">
              <Tv className="inline h-4 w-4 mr-1" />
              Mostra
            </Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger id="cast-esterno-scope" className="w-full sm:w-[320px]" aria-label="Episodio da mostrare">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SCOPE}>Tutto il cast, raggruppato per episodio</SelectItem>
                <SelectItem value={SERIE_SCOPE}>Solo cast di tutta la serie</SelectItem>
                {episodioOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {draft && (
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium">
                Anteprima da IMDb ({draft.rows.length}) per {draftTarget}.
                {' '}Il salvataggio sostituisce il cast esterno già presente in questo ambito.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDraft(null)} disabled={busy}>Annulla</Button>
                <Button size="sm" onClick={saveDraft} disabled={busy}>Salva sulla scheda</Button>
              </div>
            </div>
            <div className="space-y-2">
              {draft.rows.map((row, index) => (
                <div key={`${row.nome}-${index}`} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_180px_auto] gap-2 items-center">
                  <Input
                    value={row.nome}
                    aria-label={`Nome ${index + 1}`}
                    onChange={(event) => setDraft((current) => current && { ...current, rows: current.rows.map((item, i) => i === index ? { ...item, nome: event.target.value } : item) })}
                  />
                  <Input
                    value={row.personaggio ?? ''}
                    placeholder="Personaggio"
                    aria-label={`Personaggio ${index + 1}`}
                    onChange={(event) => setDraft((current) => current && { ...current, rows: current.rows.map((item, i) => i === index ? { ...item, personaggio: event.target.value || null } : item) })}
                  />
                  <Select
                    value={row.primarieta}
                    onValueChange={(value) => setDraft((current) => current && { ...current, rows: current.rows.map((item, i) => i === index ? { ...item, primarieta: value as PrimarietaCast } : item) })}
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
                    onClick={() => setDraft((current) => current && { ...current, rows: current.rows.filter((_, i) => i !== index) })}
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
        ) : visibleRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {rows.length === 0 ? 'Nessun cast esterno salvato.' : 'Nessun cast esterno per questa selezione.'}
          </p>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.episodio?.id ?? 'serie'} className="space-y-2">
                {hasEpisodi && (
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Tv className="h-4 w-4 text-muted-foreground" />
                    {formatEpisodioLabel(group.episodio)}
                    <Badge variant="outline" className="font-normal">{group.rows.length}</Badge>
                  </div>
                )}
                {group.rows.map(renderRow)}
              </div>
            ))}
          </div>
        )}

        <div className={`grid grid-cols-1 gap-2 items-end border-t pt-4 ${hasEpisodi ? 'sm:grid-cols-[1fr_1fr_160px_1fr_auto]' : 'sm:grid-cols-[1fr_1fr_180px_auto]'}`}>
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
          {hasEpisodi && (
            <MultiSelect
              options={episodioOptions}
              selected={manualEpisodi}
              onChange={setManualEpisodi}
              placeholder="Tutta la serie"
              groupByCategory
            />
          )}
          <Button onClick={addManual} disabled={busy || !manual.nome.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi
          </Button>
        </div>
        {hasEpisodi && (
          <p className="text-xs text-muted-foreground">
            Senza episodi selezionati il nome vale per tutta la serie. Con più episodi selezionati viene creata una riga per episodio.
          </p>
        )}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica cast esterno</DialogTitle>
            <DialogDescription>Correggi nome, personaggio, primarietà{hasEpisodi ? ' o episodio' : ''}.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="cast-edit-nome">Nome</Label>
                <Input
                  id="cast-edit-nome"
                  value={editing.nome}
                  onChange={(event) => setEditing({ ...editing, nome: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cast-edit-personaggio">Personaggio</Label>
                <Input
                  id="cast-edit-personaggio"
                  value={editing.personaggio}
                  onChange={(event) => setEditing({ ...editing, personaggio: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cast-edit-primarieta">Primarietà</Label>
                <Select
                  value={editing.primarieta}
                  onValueChange={(value) => setEditing({ ...editing, primarieta: value as PrimarietaCast })}
                >
                  <SelectTrigger id="cast-edit-primarieta">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primario">Primario</SelectItem>
                    <SelectItem value="comprimario">Comprimario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasEpisodi && (
                <div className="space-y-2">
                  <Label htmlFor="cast-edit-episodio">Episodio</Label>
                  <Select
                    value={editing.episodioScope}
                    onValueChange={(value) => setEditing({ ...editing, episodioScope: value })}
                  >
                    <SelectTrigger id="cast-edit-episodio">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SERIE_SCOPE}>Tutta la serie</SelectItem>
                      {episodioOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>Annulla</Button>
            <Button onClick={saveEdit} disabled={busy || !editing?.nome.trim()}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
