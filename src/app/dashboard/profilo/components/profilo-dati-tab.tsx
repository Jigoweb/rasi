'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Loader2, Pencil, Check, X } from 'lucide-react'
import {
  ArtistaSelfUpdateForm,
  buildArtistaSelfUpdatePayload,
  formFromArtista,
  validateArtistaSelfUpdate,
} from '@/features/artisti/lib/artista-self-update'
import { updateArtista } from '@/features/artisti/services/artisti.service'
import type { Database } from '@/shared/lib/supabase'

type ArtistaRecord = {
  id: string
  nome?: string | null
  cognome?: string | null
  nome_arte?: string | null
  codice_fiscale?: string | null
  data_nascita?: string | null
  luogo_nascita?: string | null
  tipologia?: string | null
  stato?: string | null
  data_inizio_mandato?: string | null
  data_fine_mandato?: string | null
  territorio?: string | null
  codice_ipn?: string | null
  is_rasi?: boolean | null
  imdb_nconst?: string | null
  codice_paese?: string | null
  diritti_attivi?: string[] | null
  ragione_sociale?: string | null
  forma_giuridica?: string | null
  partita_iva?: number | string | null
  contatti?: unknown
  indirizzo?: unknown
}

type Props = {
  artista: ArtistaRecord
  onArtistaUpdated: (artista: ArtistaRecord) => void
}

function InfoRow({ label, value }: { label: string; value: unknown }) {
  if (value == null || value === '') return null
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-right">{String(value)}</span>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-500">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function formatIndirizzo(indirizzo: Record<string, unknown>): string | null {
  const via = typeof indirizzo.via === 'string' ? indirizzo.via : ''
  if (!via) return null
  const civico = typeof indirizzo.civico === 'string' ? indirizzo.civico : ''
  const cap = typeof indirizzo.cap === 'string' ? indirizzo.cap : ''
  const citta = typeof indirizzo.citta === 'string' ? indirizzo.citta : ''
  const provincia = typeof indirizzo.provincia === 'string' ? indirizzo.provincia : ''
  return `${via} ${civico}, ${cap} ${citta}${provincia ? ` (${provincia})` : ''}`.replace(/\s+/g, ' ').trim()
}

export function ProfiloDatiTab({ artista, onArtistaUpdated }: Props) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ArtistaSelfUpdateForm>(() => formFromArtista(artista))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const contatti = (artista.contatti && typeof artista.contatti === 'object'
    ? artista.contatti
    : {}) as Record<string, unknown>
  const indirizzo = (artista.indirizzo && typeof artista.indirizzo === 'object'
    ? artista.indirizzo
    : {}) as Record<string, unknown>

  const hasSocietari = Boolean(
    artista.ragione_sociale || artista.forma_giuridica || artista.partita_iva
  )

  function startEdit() {
    setForm(formFromArtista(artista))
    setError(null)
    setSuccess(false)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setError(null)
    setForm(formFromArtista(artista))
  }

  function patchForm<K extends keyof ArtistaSelfUpdateForm>(key: K, value: ArtistaSelfUpdateForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setError(null)
    setSuccess(false)
    const validation = validateArtistaSelfUpdate(form)
    if (!validation.ok) {
      setError(validation.error)
      return
    }

    setSaving(true)
    try {
      const payload = buildArtistaSelfUpdatePayload(form, {
        contatti: artista.contatti,
        indirizzo: artista.indirizzo,
      })
      const { data, error: updateError } = await updateArtista(
        artista.id,
        payload as Database['public']['Tables']['artisti']['Update']
      )
      if (updateError) throw updateError
      if (data) onArtistaUpdated(data as ArtistaRecord)
      setEditing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-500">
          {editing
            ? 'Modifica i campi consentiti e salva le modifiche.'
            : 'I dati di mandato e gli identificativi ufficiali non sono modificabili.'}
        </p>
        <div className="flex items-center gap-2">
          {success && !editing && (
            <span className="text-sm text-green-700 flex items-center gap-1">
              <Check className="h-4 w-4" /> Salvato
            </span>
          )}
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saving}>
                <X className="h-4 w-4 mr-1" />
                Annulla
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Salva
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={startEdit}>
              <Pencil className="h-4 w-4 mr-1" />
              Modifica dati
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="gap-4 py-4">
          <CardHeader>
            <CardTitle className="text-base">Anagrafica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 text-sm">
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nome *" value={form.nome} onChange={(v) => patchForm('nome', v)} />
                <Field label="Cognome *" value={form.cognome} onChange={(v) => patchForm('cognome', v)} />
                <Field label="Nome d'arte" value={form.nome_arte} onChange={(v) => patchForm('nome_arte', v)} />
                <Field
                  label="Codice fiscale"
                  value={form.codice_fiscale}
                  onChange={(v) => patchForm('codice_fiscale', v)}
                />
                <Field
                  label="Data di nascita"
                  type="date"
                  value={form.data_nascita}
                  onChange={(v) => patchForm('data_nascita', v)}
                />
                <Field
                  label="Luogo di nascita"
                  value={form.luogo_nascita}
                  onChange={(v) => patchForm('luogo_nascita', v)}
                />
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-gray-500">Tipologia</Label>
                  <Select
                    value={form.tipologia || 'none'}
                    onValueChange={(v) => patchForm('tipologia', v === 'none' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipologia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non specificata</SelectItem>
                      <SelectItem value="AIE">AIE</SelectItem>
                      <SelectItem value="PRODUTTORE">Produttore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <>
                <InfoRow label="Nome" value={artista.nome} />
                <InfoRow label="Cognome" value={artista.cognome} />
                <InfoRow label="Nome d'arte" value={artista.nome_arte} />
                <InfoRow label="Codice Fiscale" value={artista.codice_fiscale} />
                <InfoRow label="Data di nascita" value={artista.data_nascita} />
                <InfoRow label="Luogo di nascita" value={artista.luogo_nascita} />
                <InfoRow label="Tipologia" value={artista.tipologia} />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="gap-4 py-4">
          <CardHeader>
            <CardTitle className="text-base">Contatti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 text-sm">
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Email" value={form.email} onChange={(v) => patchForm('email', v)} />
                <Field label="Telefono" value={form.telefono} onChange={(v) => patchForm('telefono', v)} />
                <Field label="Via" value={form.via} onChange={(v) => patchForm('via', v)} />
                <Field label="Civico" value={form.civico} onChange={(v) => patchForm('civico', v)} />
                <Field label="CAP" value={form.cap} onChange={(v) => patchForm('cap', v)} />
                <Field label="Città" value={form.citta} onChange={(v) => patchForm('citta', v)} />
                <Field
                  label="Provincia"
                  value={form.provincia}
                  onChange={(v) => patchForm('provincia', v)}
                />
              </div>
            ) : (
              <>
                <InfoRow label="Email" value={contatti.email} />
                <InfoRow label="Telefono" value={contatti.telefono} />
                <InfoRow label="Indirizzo" value={formatIndirizzo(indirizzo)} />
              </>
            )}
          </CardContent>
        </Card>

        {hasSocietari && (
          <Card className="gap-4 py-4">
            <CardHeader>
              <CardTitle className="text-base">Dati societari</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 text-sm">
              <InfoRow label="Ragione sociale" value={artista.ragione_sociale} />
              <InfoRow label="Forma giuridica" value={artista.forma_giuridica} />
              <InfoRow label="Partita IVA" value={artista.partita_iva} />
            </CardContent>
          </Card>
        )}

        <Card className="gap-4 py-4">
          <CardHeader>
            <CardTitle className="text-base">Mandato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 text-sm">
            <InfoRow label="Stato" value={artista.stato} />
            <InfoRow label="Data inizio mandato" value={artista.data_inizio_mandato} />
            <InfoRow label="Data fine mandato" value={artista.data_fine_mandato} />
            <InfoRow label="Territorio" value={artista.territorio} />
            <InfoRow label="Codice IPN" value={artista.codice_ipn} />
            <InfoRow label="RASI" value={artista.is_rasi ? 'Sì' : 'No'} />
          </CardContent>
        </Card>

        <Card className="gap-4 py-4">
          <CardHeader>
            <CardTitle className="text-base">Identificativi esterni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 text-sm">
            <InfoRow label="IMDB" value={artista.imdb_nconst} />
            <InfoRow label="Codice Paese" value={artista.codice_paese} />
            {artista.diritti_attivi && artista.diritti_attivi.length > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 shrink-0">Diritti attivi</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {artista.diritti_attivi.map((d) => (
                    <Badge key={d} variant="outline" className="text-xs">
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
