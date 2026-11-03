'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import {
  CONTATTI_MATCH_LABELS,
  CONTATTI_STATUS_LABELS,
  type ContattiCatalogArtist,
  type ContattiFieldKey,
  type ContattiFieldDecision,
  type ContattiImportRow,
} from '@/features/artisti/lib/contatti-import'
import { normalizePersonName } from '@/features/opere/lib/cast-import'

type ContattiImportPreviewProps = {
  rows: ContattiImportRow[]
  artisti: ContattiCatalogArtist[]
  disabled?: boolean
  onIncludedChange: (rowNumber: number, included: boolean) => void
  onValueChange: (rowNumber: number, key: string, value: string) => void
  onArtistaChange: (rowNumber: number, artistaId: string) => void
  onDecisionChange: (rowNumber: number, key: ContattiFieldKey, decision: ContattiFieldDecision) => void
}

function statusClass(status: ContattiImportRow['status']): string {
  if (status === 'conflitto' || status === 'da_verificare') return 'border-amber-300 bg-amber-50'
  if (status === 'senza_artista') return 'border-slate-200 bg-slate-50'
  if (status === 'invariato') return 'border-slate-200'
  return 'border-emerald-200 bg-emerald-50/40'
}

export function ContattiImportPreview({
  rows,
  artisti,
  disabled = false,
  onIncludedChange,
  onValueChange,
  onArtistaChange,
  onDecisionChange,
}: ContattiImportPreviewProps) {
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <article key={row.rowNumber} className={`rounded-lg border p-4 ${statusClass(row.status)}`}>
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox
              checked={row.included}
              disabled={disabled || !row.includibile}
              aria-label={`Includi riga ${row.rowNumber}`}
              onCheckedChange={(checked) => onIncludedChange(row.rowNumber, checked === true)}
            />
            <span className="text-sm font-medium">Riga {row.rowNumber}</span>
            <Badge variant={row.status === 'pronto' ? 'secondary' : 'outline'}>
              {CONTATTI_STATUS_LABELS[row.status]}
            </Badge>
            {row.matchType && (
              <Badge variant="outline">{CONTATTI_MATCH_LABELS[row.matchType]}</Badge>
            )}
            {row.artistaLabel && <span className="text-sm">{row.artistaLabel}</span>}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Cognome</span>
              <Input
                value={row.values.cognome}
                disabled={disabled}
                aria-label={`Cognome riga ${row.rowNumber}`}
                onChange={(event) => onValueChange(row.rowNumber, 'cognome', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Nome</span>
              <Input
                value={row.values.nome}
                disabled={disabled}
                aria-label={`Nome riga ${row.rowNumber}`}
                onChange={(event) => onValueChange(row.rowNumber, 'nome', event.target.value)}
              />
            </label>
          </div>

          {row.motivo && <p className="mt-2 text-sm text-amber-950">{row.motivo}</p>}

          {row.status === 'da_verificare' && (
            <ArtistaPicker
              rowNumber={row.rowNumber}
              artisti={artisti}
              suggerimenti={row.suggerimenti}
              disabled={disabled}
              onSelect={(artistaId) => onArtistaChange(row.rowNumber, artistaId)}
            />
          )}

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-2 font-medium">Campo</th>
                  <th className="py-1 pr-2 font-medium">Nel file</th>
                  <th className="py-1 pr-2 font-medium">In anagrafica</th>
                  <th className="py-1 font-medium">Scelta</th>
                </tr>
              </thead>
              <tbody>
                {row.fields.map((field) => (
                  <tr key={field.key} className="align-top">
                    <td className="py-1 pr-2">{field.label}</td>
                    <td className="py-1 pr-2">
                      <Input
                        value={field.incoming}
                        disabled={disabled}
                        aria-label={`${field.label} riga ${row.rowNumber}`}
                        className="h-8 min-w-36"
                        onChange={(event) => onValueChange(row.rowNumber, field.key, event.target.value)}
                      />
                    </td>
                    <td className="py-1 pr-2 text-muted-foreground">{field.current || '—'}</td>
                    <td className="py-1">
                      {field.stato === 'conflitto' ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={field.decision === 'tieni' ? 'default' : 'outline'}
                            disabled={disabled}
                            aria-label={`Mantieni ${field.label} riga ${row.rowNumber}`}
                            onClick={() => onDecisionChange(row.rowNumber, field.key, 'tieni')}
                          >
                            Mantieni
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={field.decision === 'sostituisci' ? 'default' : 'outline'}
                            disabled={disabled}
                            aria-label={`Sostituisci ${field.label} riga ${row.rowNumber}`}
                            onClick={() => onDecisionChange(row.rowNumber, field.key, 'sostituisci')}
                          >
                            Sostituisci
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {row.status === 'da_verificare' || row.status === 'senza_artista'
                            ? '—'
                            : field.stato === 'compilare'
                              ? 'Da compilare'
                              : field.stato === 'uguale'
                                ? 'Già uguale'
                                : 'Vuoto'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}
    </div>
  )
}

function ArtistaPicker({
  rowNumber,
  artisti,
  suggerimenti,
  disabled,
  onSelect,
}: {
  rowNumber: number
  artisti: ContattiCatalogArtist[]
  suggerimenti: ContattiImportRow['suggerimenti']
  disabled?: boolean
  onSelect: (artistaId: string) => void
}) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => {
    const term = normalizePersonName(query)
    if (term.length < 2 && query.trim().length < 2) return []
    const raw = query.trim().toLowerCase()
    return artisti.filter((artist) => {
      const name = normalizePersonName(`${artist.nome} ${artist.cognome} ${artist.cognome} ${artist.nome}`)
      const cf = (artist.codice_fiscale ?? '').toLowerCase()
      return name.includes(term) || cf.includes(raw)
    }).slice(0, 20)
  }, [artisti, query])

  return (
    <div className="mt-3 space-y-2">
      {suggerimenti.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggerimenti.map((suggestion) => (
            <Button
              key={suggestion.id}
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => onSelect(suggestion.id)}
            >
              {suggestion.label}
            </Button>
          ))}
        </div>
      )}
      <Input
        value={query}
        disabled={disabled}
        placeholder="Cerca artista per nome o codice fiscale"
        aria-label={`Cerca artista riga ${rowNumber}`}
        onChange={(event) => setQuery(event.target.value)}
      />
      {results.length > 0 && (
        <ul className="max-h-40 overflow-auto rounded-md border bg-white">
          {results.map((artist) => (
            <li key={artist.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => onSelect(artist.id)}
              >
                {artist.cognome} {artist.nome}
                {artist.codice_fiscale ? ` · ${artist.codice_fiscale}` : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
