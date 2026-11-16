'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useInitialPageLoad } from '@/shared/hooks/useInitialPageLoad'
import Link from 'next/link'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
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
  fromRuoloPrimarieta,
  mapImdbCreditsToCast,
  RUOLO_PRIMARIETA_OPTIONS,
  toRuoloPrimarieta,
  type CastEsternoInput,
  type EpisodioRef,
  type PrimarietaCast,
  type RuoloCast,
} from '@/features/opere/lib/cast-esterno'
import {
  CAST_ESTERNO_PAGE_SIZE,
  createCastEsterno,
  deleteCastEsterno,
  listCastEsternoPage,
  listCastEsternoArtistiCorrispondenti,
  replaceCastEsterno,
  updateCastEsterno,
  type CastEsternoRow,
} from '@/features/opere/services/cast-esterno.service'
import { ListPager } from '@/shared/components/list-pager'
import { proponiModifica } from '@/features/approvazioni/services/proposte.service'
import { diffCampi, COLONNE_CONSENTITE, type RigaBatch } from '@/features/approvazioni/lib/modifica-payload'
import { Edit, Info, Loader2, MoreHorizontal, Plus, Search, Trash2, Tv, UserCheck, Users } from 'lucide-react'
import { toast } from 'sonner'

/** Valore Select per "intera opera/serie" (Radix non accetta value vuoto). */
const SERIE_SCOPE = '__serie__'
const ALL_SCOPE = '__all__'

export type CastEsternoEpisodio = EpisodioRef & { imdb_tconst?: string | null }

type EditState = {
  row: CastEsternoRow
  nome: string
  personaggio: string
  primarieta: PrimarietaCast
  ruolo: RuoloCast
  episodioScope: string
}

type ArtistaCorrispondente = { artista_id: string; artista_nome: string }

function emptyDraft(): CastEsternoInput {
  return {
    nome: '',
    personaggio: null,
    primarieta: 'comprimario',
    ruolo: 'attore',
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
  ruoliTipologie = [],
  readOnly = false,
  proposeChanges = false,
  linkArtisti = true,
}: {
  operaId: string
  imdbTconst: string | null
  episodi?: CastEsternoEpisodio[]
  ruoliTipologie?: { id: string; nome: string }[]
  /** Solo consultazione: opera validata per Operatore base e Tirocinante. */
  readOnly?: boolean
  /** Salva nella coda invece che sulla tabella. */
  proposeChanges?: boolean
  /** Link alla scheda artista (il Tirocinante non apre l'anagrafica). */
  linkArtisti?: boolean
}) {
  const hasEpisodi = episodi.length > 0
  const [rows, setRows] = useState<CastEsternoRow[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filteredCount, setFilteredCount] = useState(0)
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
  const ruoliById = useMemo(() => new Map(ruoliTipologie.map((ruolo) => [ruolo.id, ruolo.nome])), [ruoliTipologie])
  const { beginLoad } = useInitialPageLoad(operaId)

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
    const load = beginLoad()
    if (load.initial) setLoading(true)
    const pageResult = await listCastEsternoPage(operaId, {
      page,
      soloSerie: scope === SERIE_SCOPE,
      episodioId: scope !== ALL_SCOPE && scope !== SERIE_SCOPE ? scope : null,
    })
    const loaded = pageResult.data ?? []
    if (pageResult.error) setError(pageResult.error.message)
    else {
      setError(null)
      setRows(loaded)
      setTotal(pageResult.total ?? loaded.length)
      setFilteredCount(pageResult.count ?? loaded.length)
      load.markLoaded()
    }
    const ids = loaded.map((row) => row.id)
    const { data: matches } = ids.length > 0
      ? await listCastEsternoArtistiCorrispondenti(operaId, ids)
      : { data: [] }
    const byCast = new Map<string, ArtistaCorrispondente[]>()
    for (const match of matches ?? []) {
      const list = byCast.get(match.cast_id) ?? []
      list.push({ artista_id: match.artista_id, artista_nome: match.artista_nome })
      byCast.set(match.cast_id, list)
    }
    setCorrispondenti(byCast)
    if (load.initial) setLoading(false)
  }, [operaId, beginLoad, page, scope])

  useEffect(() => {
    void reload()
  }, [reload])

  const groups = useMemo(
    () => (hasEpisodi ? groupCastByEpisodio(rows, episodi) : [{ episodio: null, rows }]),
    [rows, episodi, hasEpisodi],
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
    if (proposeChanges) {
      setError('Il salvataggio che sostituisce il cast già presente non entra in coda. Aggiungi, modifica o elimina le singole righe, oppure importa il file.')
      return
    }
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
    if (proposeChanges) {
      const righe: RigaBatch[] = targets.map((episodioId, index) => ({
        entita: 'cast_esterno',
        operazione: 'insert',
        dopo: {
          opera_id: operaId,
          episodio_id: episodioId,
          nome,
          personaggio: manual.personaggio?.trim() || null,
          primarieta: manual.primarieta,
          ruolo: manual.ruolo,
          imdb_nconst: manual.imdb_nconst,
          fonte: manual.fonte,
          ordine: total + index,
        },
      }))
      const { error: proposalError } = await proponiModifica({ entita: 'cast_esterno', operaId, righe })
      setBusy(false)
      if (proposalError) {
        setError(proposalError.message)
        return
      }
      toast.success('Modifica in attesa di approvazione')
      setManual(emptyDraft())
      return
    }
    for (const [index, episodioId] of targets.entries()) {
      const { error: insertError } = await createCastEsterno(
        operaId,
        {
          ...manual,
          nome,
          personaggio: manual.personaggio?.trim() || null,
          ordine: total + index,
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
      ruolo: row.ruolo === 'doppiatore' ? 'doppiatore' : 'attore',
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
    const patch = {
      nome,
      personaggio: editing.personaggio.trim() || null,
      primarieta: editing.primarieta,
      ruolo: editing.ruolo,
      ...(hasEpisodi ? { episodio_id: scopeToEpisodioId(editing.episodioScope) } : {}),
    }
    if (proposeChanges) {
      const dopo = diffCampi(editing.row, patch, COLONNE_CONSENTITE.cast_esterno)
      if (Object.keys(dopo).length === 0) {
        setBusy(false)
        setEditing(null)
        return
      }
      const { error: proposalError } = await proponiModifica({
        entita: 'cast_esterno',
        operazione: 'update',
        operaId,
        entitaId: editing.row.id,
        dopo,
      })
      setBusy(false)
      if (proposalError) {
        setError(proposalError.message)
        return
      }
      toast.success('Modifica in attesa di approvazione')
      setEditing(null)
      return
    }
    const { error: updateError } = await updateCastEsterno(editing.row.id, patch)
    setBusy(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setEditing(null)
    await reload()
  }

  const changeRuoloPrimarieta = async (row: CastEsternoRow, value: string) => {
    const patch = fromRuoloPrimarieta(value)
    if (proposeChanges) {
      const { error: proposalError } = await proponiModifica({
        entita: 'cast_esterno',
        operazione: 'update',
        operaId,
        entitaId: row.id,
        dopo: patch,
      })
      if (proposalError) setError(proposalError.message)
      else toast.success('Modifica in attesa di approvazione')
      return
    }
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, ...patch } : item)))
    const { error: updateError } = await updateCastEsterno(row.id, patch)
    if (updateError) {
      setError(updateError.message)
      await reload()
    }
  }

  const removeRow = async (id: string) => {
    setBusy(true)
    if (proposeChanges) {
      const { error: proposalError } = await proponiModifica({
        entita: 'cast_esterno',
        operazione: 'delete',
        operaId,
        entitaId: id,
      })
      setBusy(false)
      if (proposalError) {
        setError(proposalError.message)
        return
      }
      toast.success('Modifica in attesa di approvazione')
      return
    }
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
            {row.codice_ipn ? ` · IPN ${row.codice_ipn}` : ''}
          </div>
          {matches.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {matches.map((match) => linkArtisti ? (
                <Link
                  key={match.artista_id}
                  href={`/dashboard/artisti/${match.artista_id}`}
                  className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700 hover:underline"
                  title="Apri la scheda: da lì puoi convertire questa riga in partecipazione RASI"
                >
                  <UserCheck className="h-3 w-3" />
                  In anagrafica: {match.artista_nome}
                </Link>
              ) : (
                <span
                  key={match.artista_id}
                  className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700"
                >
                  <UserCheck className="h-3 w-3" />
                  In anagrafica: {match.artista_nome}
                </span>
              ))}
            </div>
          )}
        </div>
        <Badge variant="outline">{row.fonte === 'imdb' ? 'IMDb' : 'Manuale'}</Badge>
        {row.ruolo_id && ruoliById.get(row.ruolo_id) && (
          <Badge variant="secondary">{ruoliById.get(row.ruolo_id)}</Badge>
        )}
        <Select value={toRuoloPrimarieta(row.ruolo, row.primarieta)} onValueChange={(value) => changeRuoloPrimarieta(row, value)} disabled={readOnly}>
          <SelectTrigger className="w-full sm:w-[200px]" aria-label={`Ruolo di ${row.nome}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RUOLO_PRIMARIETA_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!readOnly && (
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
        )}
      </div>
    )
  }

  const downloadLabel = `Importa da OMDb${scopeEpisodio ? ` (${formatEpisodioLabel({ ...scopeEpisodio, titolo_episodio: null })})` : ''}`
  const downloadTitle = downloadTconst
    ? `Importa gli attori da OMDb per ${downloadTarget}`
    : scopeEpisodio
      ? 'Questo episodio non ha un tconst IMDb'
      : 'Collega prima un tconst IMDb all\'opera'
  const isCastEmpty = !loading && total === 0 && !draft

  const downloadButton = readOnly ? null : (
    <Button
      variant="outline"
      size="sm"
      onClick={downloadFromImdb}
      disabled={busy || !downloadTconst}
      title={downloadTitle}
    >
      {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
      {downloadLabel}
    </Button>
  )

  return (
    <Card className="gap-4 py-4">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Cast esterno
              <Badge variant="secondary" className="ml-2">{total.toLocaleString('it-IT')}</Badge>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="ml-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Informazioni sul cast esterno"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  Nomi non presenti in anagrafica RASI.
                  {hasEpisodi ? ' Ogni nome può valere per tutta la serie o per singoli episodi.' : ''}
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </div>
          {!isCastEmpty && downloadButton}
        </div>
      </CardHeader>
      <CardContent className="px-4 space-y-4">
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
            <Select value={scope} onValueChange={(value) => { setScope(value); setPage(1) }}>
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
                {' '}Il salvataggio sostituisce il cast esterno già presente in questo ambito. I nomi da IMDb entrano come attori: i doppiatori si correggono dopo.
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
                      <SelectItem value="primario">Attore primario</SelectItem>
                      <SelectItem value="comprimario">Attore comprimario</SelectItem>
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
        ) : draft ? null : filteredCount === 0 ? (
          total === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-10 text-center">
              <Users className="h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">Nessun cast esterno salvato.</p>
              {downloadButton}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nessun cast esterno per questa selezione.</p>
          )
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
        {!draft && (
          <ListPager
            page={page}
            pageSize={CAST_ESTERNO_PAGE_SIZE}
            total={filteredCount}
            onPageChange={setPage}
            disabled={loading || busy}
            label="Pagine cast esterno"
          />
        )}

        {!readOnly && (
        <>
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
            value={toRuoloPrimarieta(manual.ruolo, manual.primarieta)}
            onValueChange={(value) => setManual((current) => ({ ...current, ...fromRuoloPrimarieta(value) }))}
          >
            <SelectTrigger aria-label="Ruolo nuovo cast">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RUOLO_PRIMARIETA_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
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
        </>
        )}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica cast esterno</DialogTitle>
            <DialogDescription>Correggi nome, personaggio, ruolo{hasEpisodi ? ' o episodio' : ''}.</DialogDescription>
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
                <Label htmlFor="cast-edit-primarieta">Ruolo</Label>
                <Select
                  value={toRuoloPrimarieta(editing.ruolo, editing.primarieta)}
                  onValueChange={(value) => setEditing({ ...editing, ...fromRuoloPrimarieta(value) })}
                >
                  <SelectTrigger id="cast-edit-primarieta">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RUOLO_PRIMARIETA_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
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
