'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { tipoReferentePerStato, type TipoReferente } from '@/features/artisti/lib/artista-display'
import {
  createArtistaReferente,
  deleteArtistaReferente,
  listArtistaReferenti,
  updateArtistaReferente,
  type ArtistaReferente,
  type ArtistaReferenteInput,
} from '@/features/artisti/services/artista-scheda.service'
import { Loader2, Pencil, Plus, ShieldCheck, Trash2, Users } from 'lucide-react'

const TIPO_COPY: Record<TipoReferente, { title: string; singular: string; description: string }> = {
  tutore: {
    title: 'Tutori legali',
    singular: 'tutore legale',
    description: 'Chi firma e riceve la documentazione finché l\'artista è minorenne.',
  },
  erede: {
    title: 'Eredi',
    singular: 'erede',
    description: 'Aventi diritto dopo il decesso dell\'artista, con eventuale quota.',
  },
}

type FormState = {
  id: string | null
  tipo: TipoReferente
  nome: string
  cognome: string
  codice_fiscale: string
  relazione: string
  quota_percentuale: string
  email: string
  telefono: string
  indirizzo: string
  note: string
}

function emptyForm(tipo: TipoReferente): FormState {
  return {
    id: null,
    tipo,
    nome: '',
    cognome: '',
    codice_fiscale: '',
    relazione: '',
    quota_percentuale: '',
    email: '',
    telefono: '',
    indirizzo: '',
    note: '',
  }
}

function fromRow(row: ArtistaReferente): FormState {
  return {
    id: row.id,
    tipo: row.tipo,
    nome: row.nome,
    cognome: row.cognome ?? '',
    codice_fiscale: row.codice_fiscale ?? '',
    relazione: row.relazione ?? '',
    quota_percentuale: row.quota_percentuale == null ? '' : String(row.quota_percentuale),
    email: row.email ?? '',
    telefono: row.telefono ?? '',
    indirizzo: row.indirizzo ?? '',
    note: row.note ?? '',
  }
}

function toInput(form: FormState): ArtistaReferenteInput {
  const quota = form.quota_percentuale.trim().replace(',', '.')
  return {
    tipo: form.tipo,
    nome: form.nome.trim(),
    cognome: form.cognome.trim() || null,
    codice_fiscale: form.codice_fiscale.trim().toUpperCase() || null,
    relazione: form.relazione.trim() || null,
    quota_percentuale: form.tipo === 'erede' && quota !== '' ? Number(quota) : null,
    email: form.email.trim() || null,
    telefono: form.telefono.trim() || null,
    indirizzo: form.indirizzo.trim() || null,
    note: form.note.trim() || null,
  }
}

export function ArtistaReferentiPanel({ artistaId, stato }: { artistaId: string; stato: string | null }) {
  const [rows, setRows] = useState<ArtistaReferente[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const { data, error: loadError } = await listArtistaReferenti(artistaId)
    if (loadError) setError(loadError.message)
    setRows(data ?? [])
    setLoading(false)
  }, [artistaId])

  useEffect(() => {
    void reload()
  }, [reload])

  const tipoAtteso = tipoReferentePerStato(stato)
  const tipi = (['tutore', 'erede'] as TipoReferente[]).filter(
    (tipo) => tipo === tipoAtteso || rows.some((row) => row.tipo === tipo),
  )

  if (loading || tipi.length === 0) return null

  const quotaInvalid = (() => {
    if (!form || form.tipo !== 'erede' || form.quota_percentuale.trim() === '') return false
    const value = Number(form.quota_percentuale.replace(',', '.'))
    return Number.isNaN(value) || value < 0 || value > 100
  })()

  const save = async () => {
    if (!form || !form.nome.trim() || quotaInvalid) return
    setSaving(true)
    setError(null)
    const input = toInput(form)
    const { error: saveError } = form.id
      ? await updateArtistaReferente(form.id, input)
      : await createArtistaReferente(artistaId, input)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setForm(null)
    await reload()
  }

  const remove = async (row: ArtistaReferente) => {
    if (!window.confirm(`Eliminare ${row.nome} ${row.cognome ?? ''}?`)) return
    const { error: deleteError } = await deleteArtistaReferente(row.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    await reload()
  }

  return (
    <Card className="gap-3 py-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          {tipoAtteso === 'tutore' ? <ShieldCheck className="mr-2 h-5 w-5" /> : <Users className="mr-2 h-5 w-5" />}
          {tipi.map((tipo) => TIPO_COPY[tipo].title).join(' ed ')}
        </CardTitle>
        {tipoAtteso && <CardDescription>{TIPO_COPY[tipoAtteso].description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-4 space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {tipi.map((tipo) => {
          const list = rows.filter((row) => row.tipo === tipo)
          const quotaTotale = list.reduce((sum, row) => sum + (row.quota_percentuale ?? 0), 0)
          return (
            <div key={tipo} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {TIPO_COPY[tipo].title}
                  {tipo === 'erede' && list.some((row) => row.quota_percentuale != null) && (
                    <span className={`ml-2 font-normal ${Math.abs(quotaTotale - 100) > 0.01 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                      (quote: {quotaTotale.toLocaleString('it-IT')}%)
                    </span>
                  )}
                </h3>
                <Button variant="outline" size="sm" onClick={() => setForm(emptyForm(tipo))}>
                  <Plus className="h-4 w-4 mr-1" />
                  Aggiungi {TIPO_COPY[tipo].singular}
                </Button>
              </div>
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun {TIPO_COPY[tipo].singular} indicato.</p>
              ) : (
                list.map((row) => (
                  <div key={row.id} className="flex items-start gap-3 rounded-md border px-3 py-2">
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="font-medium">
                        {[row.nome, row.cognome].filter(Boolean).join(' ')}
                        {row.relazione && <span className="font-normal text-muted-foreground"> · {row.relazione}</span>}
                        {row.quota_percentuale != null && (
                          <span className="font-normal text-muted-foreground"> · quota {row.quota_percentuale.toLocaleString('it-IT')}%</span>
                        )}
                      </div>
                      <div className="text-muted-foreground break-words">
                        {[row.codice_fiscale, row.email, row.telefono, row.indirizzo].filter(Boolean).join(' · ') || '—'}
                      </div>
                      {row.note && <div className="mt-1 text-muted-foreground">{row.note}</div>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Modifica ${row.nome}`} onClick={() => setForm(fromRow(row))}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Elimina ${row.nome}`} onClick={() => remove(row)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )
        })}
      </CardContent>

      <Dialog open={form !== null} onOpenChange={(open) => { if (!open) setForm(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {form?.id ? 'Modifica' : 'Aggiungi'} {form ? TIPO_COPY[form.tipo].singular : ''}
            </DialogTitle>
            <DialogDescription>Solo il nome è obbligatorio.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="ref-nome">Nome *</Label>
                <Input id="ref-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ref-cognome">Cognome</Label>
                <Input id="ref-cognome" value={form.cognome} onChange={(e) => setForm({ ...form, cognome: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ref-cf">Codice fiscale</Label>
                <Input id="ref-cf" maxLength={16} value={form.codice_fiscale} onChange={(e) => setForm({ ...form, codice_fiscale: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ref-relazione">{form.tipo === 'tutore' ? 'Rapporto (es. madre)' : 'Rapporto (es. figlio)'}</Label>
                <Input id="ref-relazione" value={form.relazione} onChange={(e) => setForm({ ...form, relazione: e.target.value })} />
              </div>
              {form.tipo === 'erede' && (
                <div className="space-y-1">
                  <Label htmlFor="ref-quota">Quota %</Label>
                  <Input
                    id="ref-quota"
                    inputMode="decimal"
                    value={form.quota_percentuale}
                    onChange={(e) => setForm({ ...form, quota_percentuale: e.target.value })}
                    aria-invalid={quotaInvalid}
                  />
                  {quotaInvalid && <p className="text-xs text-destructive">Inserisci un valore tra 0 e 100.</p>}
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="ref-email">Email</Label>
                <Input id="ref-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ref-telefono">Telefono</Label>
                <Input id="ref-telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="ref-indirizzo">Indirizzo</Label>
                <Input id="ref-indirizzo" value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="ref-note">Note</Label>
                <Textarea id="ref-note" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>Annulla</Button>
            <Button onClick={save} disabled={saving || !form?.nome.trim() || quotaInvalid}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
