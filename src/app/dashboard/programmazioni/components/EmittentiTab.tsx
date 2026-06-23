'use client'

import type { Dispatch, SetStateAction } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle,
  Edit,
  Eye,
  Loader2,
  Plus,
  Search,
  X,
  XCircle,
} from 'lucide-react'
import {
  summarizeImportMapping,
  type ImportMappingConfig,
} from '@/features/programmazioni/services/import-mapping.service'
import { TEMPLATE_FIELDS } from '@/features/programmazioni/utils/coercion'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import type { Emittente, EmittenteFormData } from '../hooks/useProgrammazioniEmittenti'
import EmittenteMappingSection from './EmittenteMappingSection'

export interface EmittentiTabProps {
  emittenti: Emittente[]
  loadingEmittenti: boolean
  searchEmittentiQuery: string
  debouncedSearchEmittentiQuery: string
  filteredEmittenti: Emittente[]
  selectedEmittente: Emittente | null
  showEmittenteDetails: boolean
  showEmittenteForm: boolean
  emittenteFormMode: 'create' | 'edit'
  emittenteFormData: EmittenteFormData
  emittenteFormSaving: boolean
  emittenteFormError: string | null
  fetchEmittenti: () => void
  setSearchEmittentiQuery: (query: string) => void
  setShowEmittenteDetails: (open: boolean) => void
  setShowEmittenteForm: (open: boolean) => void
  setEmittenteFormData: Dispatch<SetStateAction<EmittenteFormData>>
  openCreateEmittente: () => void
  openEditEmittente: (emittente: Emittente) => void
  handleSaveEmittente: () => void
  openManageEmittente: (emittente: Emittente) => void
}

export default function EmittentiTab({
  emittenti,
  loadingEmittenti,
  searchEmittentiQuery,
  debouncedSearchEmittentiQuery,
  filteredEmittenti,
  selectedEmittente,
  showEmittenteDetails,
  showEmittenteForm,
  emittenteFormMode,
  emittenteFormData,
  emittenteFormSaving,
  emittenteFormError,
  fetchEmittenti,
  setSearchEmittentiQuery,
  setShowEmittenteDetails,
  setShowEmittenteForm,
  setEmittenteFormData,
  openCreateEmittente,
  openEditEmittente,
  handleSaveEmittente,
  openManageEmittente,
}: EmittentiTabProps) {
  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreateEmittente}>
          <Plus className="h-4 w-4 mr-2" />
          Nuova Emittente
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca per nome o codice emittente..."
                  value={searchEmittentiQuery}
                  onChange={(event) => setSearchEmittentiQuery(event.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {debouncedSearchEmittentiQuery && (
              <Button variant="outline" size="sm" onClick={() => setSearchEmittentiQuery('')}>
                <X className="h-3 w-3 mr-1" /> Ricerca: {debouncedSearchEmittentiQuery}
              </Button>
            )}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Mostrando {filteredEmittenti.length} di {emittenti.length} emittenti
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="hidden lg:block relative overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Codice</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Paese</TableHead>
                  <TableHead>Attiva</TableHead>
                  <TableHead>Import</TableHead>
                  <TableHead className="w-24">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingEmittenti ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEmittenti.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Nessuna emittente trovata
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmittenti.map((emittente) => (
                    <TableRow key={emittente.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-xs">{emittente.codice}</TableCell>
                      <TableCell className="font-medium">{emittente.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{emittente.tipo}</Badge>
                      </TableCell>
                      <TableCell>{emittente.paese || '-'}</TableCell>
                      <TableCell>{getAttivaBadge(emittente.attiva)}</TableCell>
                      <TableCell>
                        <ImportMappingSummary emittente={emittente} />
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => openManageEmittente(emittente)}>
                          <Eye className="h-4 w-4 mr-1.5" /> Gestisci
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="lg:hidden space-y-4 p-4">
            {filteredEmittenti.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nessuna emittente trovata</div>
            ) : (
              filteredEmittenti.map((emittente) => (
                <Card key={emittente.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{emittente.nome}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Codice: <span className="font-mono">{emittente.codice}</span>
                      </div>
                      <div className="text-xs text-gray-600">{emittente.paese || '—'}</div>
                      <div className="mt-3">
                        <ImportMappingSummary emittente={emittente} />
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openManageEmittente(emittente)}>
                        <Eye className="h-4 w-4 mr-1.5" /> Gestisci
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <EmittenteDetailsDialog
        open={showEmittenteDetails}
        selectedEmittente={selectedEmittente}
        onOpenChange={setShowEmittenteDetails}
        onRefreshEmittenti={fetchEmittenti}
        onEditEmittente={openEditEmittente}
      />

      <EmittenteFormDialog
        open={showEmittenteForm}
        mode={emittenteFormMode}
        selectedEmittente={selectedEmittente}
        formData={emittenteFormData}
        saving={emittenteFormSaving}
        error={emittenteFormError}
        onOpenChange={setShowEmittenteForm}
        onFormDataChange={setEmittenteFormData}
        onRefreshEmittenti={fetchEmittenti}
        onSave={handleSaveEmittente}
      />
    </>
  )
}

function ImportMappingSummary({ emittente }: { emittente: Emittente }) {
  return (
    <div className="space-y-1">
      {getImportMappingBadge(emittente)}
      <div className="text-xs text-muted-foreground">
        {getImportMappingMeta(emittente)}
      </div>
    </div>
  )
}

interface EmittenteDetailsDialogProps {
  open: boolean
  selectedEmittente: Emittente | null
  onOpenChange: (open: boolean) => void
  onRefreshEmittenti: () => void
  onEditEmittente: (emittente: Emittente) => void
}

function EmittenteDetailsDialog({
  open,
  selectedEmittente,
  onOpenChange,
  onRefreshEmittenti,
  onEditEmittente,
}: EmittenteDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-0! left-0! translate-x-0! translate-y-0! w-screen max-w-none! sm:max-w-none! h-dvh max-h-none! rounded-none border-0 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestisci Emittente</DialogTitle>
          <DialogDescription>
            Anagrafica e configurazione import per &quot;{selectedEmittente?.nome}&quot;.
          </DialogDescription>
        </DialogHeader>

        {selectedEmittente && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Codice</label>
                <p className="font-mono">{selectedEmittente.codice}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Nome</label>
                <p className="font-medium">{selectedEmittente.nome}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Tipo</label>
                <p><Badge variant="outline">{selectedEmittente.tipo}</Badge></p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Paese</label>
                <p>{selectedEmittente.paese || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Stato</label>
                <div className="mt-1">{getAttivaBadge(selectedEmittente.attiva)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Data Creazione</label>
                <p>{selectedEmittente.created_at ? new Date(selectedEmittente.created_at).toLocaleString('it-IT') : '-'}</p>
              </div>
            </div>

            <EmittenteMappingSection emittenteId={selectedEmittente.id} onChange={onRefreshEmittenti} />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Chiudi
              </Button>
              <Button onClick={() => onEditEmittente(selectedEmittente)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifica anagrafica
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface EmittenteFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  selectedEmittente: Emittente | null
  formData: EmittenteFormData
  saving: boolean
  error: string | null
  onOpenChange: (open: boolean) => void
  onFormDataChange: Dispatch<SetStateAction<EmittenteFormData>>
  onRefreshEmittenti: () => void
  onSave: () => void
}

function EmittenteFormDialog({
  open,
  mode,
  selectedEmittente,
  formData,
  saving,
  error,
  onOpenChange,
  onFormDataChange,
  onRefreshEmittenti,
  onSave,
}: EmittenteFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onOpenChange(false) }}>
      <DialogContent className={mode === 'edit' ? 'max-h-[90vh] max-w-2xl overflow-y-auto overflow-x-hidden' : 'max-w-md'}>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nuova Emittente' : 'Modifica Emittente'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Inserisci i dati della nuova emittente.'
              : `Modifica i dati di "${selectedEmittente?.nome}".`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Codice</label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm bg-gray-100 rounded px-3 py-2 border border-gray-200">
                {formData.codice}
              </span>
              <span className="text-xs text-gray-500">
                {mode === 'create' ? 'assegnato automaticamente' : 'non modificabile'}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome <span className="text-red-500">*</span></label>
            <Input
              placeholder="es. Rai 1, Pluto TV, Paramount Plus"
              value={formData.nome}
              onChange={(event) => onFormDataChange((prev) => ({ ...prev, nome: event.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tipo</label>
            <Select
              value={formData.tipo}
              onValueChange={(value) => onFormDataChange((prev) => ({ ...prev, tipo: value as Emittente['tipo'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tv_generalista">TV Generalista</SelectItem>
                <SelectItem value="tv_tematica">TV Tematica</SelectItem>
                <SelectItem value="streaming">Streaming</SelectItem>
                <SelectItem value="pay_tv">Pay TV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Paese</label>
            <Input
              placeholder="IT"
              value={formData.paese}
              onChange={(event) => onFormDataChange((prev) => ({ ...prev, paese: event.target.value.toUpperCase() }))}
              maxLength={2}
              className="w-24"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="attiva-check"
              checked={formData.attiva}
              onCheckedChange={(value) => onFormDataChange((prev) => ({ ...prev, attiva: Boolean(value) }))}
            />
            <label htmlFor="attiva-check" className="text-sm font-medium cursor-pointer">
              Emittente attiva
            </label>
          </div>
        </div>

        {mode === 'edit' && selectedEmittente && (
          <div className="mt-4 pt-4 border-t">
            <EmittenteMappingSection
              emittenteId={selectedEmittente.id}
              onChange={onRefreshEmittenti}
              compact
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <Check className="h-4 w-4 mr-2" />}
            {mode === 'create' ? 'Crea' : 'Salva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function getAttivaBadge(attiva: boolean | null) {
  if (attiva === true) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="w-3 h-3 mr-1" /> Attiva
      </Badge>
    )
  }

  if (attiva === false) {
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700">
        <XCircle className="w-3 h-3 mr-1" /> Inattiva
      </Badge>
    )
  }

  return <Badge variant="outline" className="bg-gray-50 text-gray-700">Non specificato</Badge>
}

function getImportMappingSummary(emittente: Emittente) {
  return summarizeImportMapping(emittente.mapping_import as ImportMappingConfig | null)
}

function getImportMappingBadge(emittente: Emittente) {
  const summary = getImportMappingSummary(emittente)

  if (summary.status === 'configured') {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
        <CheckCircle className="w-3 h-3 mr-1" /> Configurato
      </Badge>
    )
  }

  if (summary.status === 'incomplete') {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        <AlertCircle className="w-3 h-3 mr-1" /> Da completare
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="bg-gray-50 text-gray-700">
      <XCircle className="w-3 h-3 mr-1" /> Non configurato
    </Badge>
  )
}

function getImportMappingMeta(emittente: Emittente): string {
  const summary = getImportMappingSummary(emittente)

  if (summary.status === 'not_configured') {
    return 'Nessun mapping salvato'
  }

  const updated = summary.lastConfiguredAt
    ? new Date(summary.lastConfiguredAt).toLocaleDateString('it-IT')
    : 'data non disponibile'

  return `${summary.mappedCount} / ${TEMPLATE_FIELDS.length} campi · ${updated}`
}
