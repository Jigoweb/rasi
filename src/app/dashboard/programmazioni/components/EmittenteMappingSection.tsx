'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Settings, Trash2, AlertCircle, Loader2 } from 'lucide-react'
import {
  getMappingByEmittente,
  saveMapping,
  deleteMapping,
  summarizeImportMapping,
  type ImportMappingConfig,
} from '@/features/programmazioni/services/import-mapping.service'
import {
  DATA_HEALTH_PRESET_LABELS,
  getDataHealthPolicyByEmittente,
  resolveDataHealthPolicy,
  saveDataHealthPolicy,
  type DataHealthFieldKey,
  type DataHealthFieldStatus,
  type DataHealthPolicy,
  type DataHealthPreset,
} from '@/features/programmazioni/services/data-health-policy.service'
import { TEMPLATE_FIELDS } from '@/features/programmazioni/utils/coercion'
import MappingWizard from './MappingWizard'

interface EmittenteMappingSectionProps {
  emittenteId: string
  /** Callback opzionale quando la config cambia (per refresh esterno) */
  onChange?: () => void
  /** Layout ottimizzato per dialog stretti come "Modifica Emittente". */
  compact?: boolean
}

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return undefined
}

export default function EmittenteMappingSection({
  emittenteId,
  onChange,
  compact = false,
}: EmittenteMappingSectionProps) {
  const [config, setConfig] = useState<ImportMappingConfig | null>(null)
  const [healthPolicy, setHealthPolicy] = useState<DataHealthPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savingHealth, setSavingHealth] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    const [mappingRes, healthRes] = await Promise.all([
      getMappingByEmittente(emittenteId),
      getDataHealthPolicyByEmittente(emittenteId),
    ])
    if (mappingRes.error || healthRes.error) {
      setError(getErrorMessage(mappingRes.error) ?? getErrorMessage(healthRes.error) ?? 'Errore caricamento config')
    } else {
      setConfig(mappingRes.data)
      setHealthPolicy(healthRes.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!emittenteId) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emittenteId])

  const handleDelete = async () => {
    if (!confirm('Eliminare la configurazione di mapping per questo emittente?')) return
    setDeleting(true)
    const { error } = await deleteMapping(emittenteId)
    setDeleting(false)
    if (error) {
      alert('Errore eliminazione: ' + (error.message ?? 'sconosciuto'))
      return
    }
    setConfig(null)
    onChange?.()
  }

  const handleSave = async (newConfig: ImportMappingConfig) => {
    const { error } = await saveMapping(emittenteId, newConfig)
    if (error) throw new Error(error.message ?? 'Errore salvataggio')
    setConfig(newConfig)
    onChange?.()
  }

  const handleSaveHealthPolicy = async () => {
    if (!healthPolicy) return
    setSavingHealth(true)
    const { error } = await saveDataHealthPolicy(emittenteId, healthPolicy)
    setSavingHealth(false)
    if (error) {
      alert('Errore salvataggio copertura dati: ' + (getErrorMessage(error) ?? 'sconosciuto'))
      return
    }
    onChange?.()
  }

  if (loading) {
    return (
      <div className="border rounded-lg p-4 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Caricamento configurazione…
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-sm text-red-700 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 mt-0.5" /> {error}
      </div>
    )
  }

  const summary = summarizeImportMapping(config)
  const healthSummary = resolveDataHealthPolicy(healthPolicy ?? { preset: 'lineare', fields: {} })
  const statusBadge =
    summary.status === 'configured' ? (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
        Configurato
      </Badge>
    ) : summary.status === 'incomplete' ? (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        Da completare
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-gray-50 text-gray-700">
        Non configurato
      </Badge>
    )

  return (
    <>
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="font-medium text-sm">Configurazione import</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Vedi e modifica i campi già mappati. Carica un nuovo file campione solo se il tracciato dell&apos;emittente è cambiato.
            </p>
          </div>
          {statusBadge}
        </div>

        {!config ? (
          <div className="bg-gray-50 rounded p-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Nessuna configurazione presente.
            </span>
            <Button size="sm" onClick={() => setWizardOpen(true)}>
              <Settings className="h-4 w-4 mr-1.5" /> Configura ora
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="text-gray-500">Ultimo upload:</span>{' '}
                <span className="font-medium">
                  {config.ultimo_upload
                    ? new Date(config.ultimo_upload).toLocaleString('it-IT', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Mappati:</span>{' '}
                <Badge variant="secondary">
                  {summary.mappedCount} / {TEMPLATE_FIELDS.length} campi
                </Badge>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              <span className="font-medium">Colonne sorgente rilevate ({config.colonne_rilevate.length}):</span>{' '}
              {config.colonne_rilevate.slice(0, 8).join(', ')}
              {config.colonne_rilevate.length > 8 && ` …+${config.colonne_rilevate.length - 8}`}
            </div>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setWizardOpen(true)}>
                <Settings className="h-4 w-4 mr-1.5" /> Modifica campi mappati
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDelete}
                disabled={deleting}
                className="text-red-600 hover:text-red-700"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1.5" />
                )}
                Elimina configurazione
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="border rounded-lg p-4 space-y-3 overflow-hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="font-medium text-sm">Copertura dati</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Scegli il preset della sorgente e adatta i campi attesi per questa emittente.
            </p>
          </div>
          <Badge variant="outline" className="w-fit bg-blue-50 text-blue-700 border-blue-200">
            {healthSummary.presetLabel}
          </Badge>
        </div>

        <div className={compact ? 'grid gap-3' : 'grid gap-3 xl:grid-cols-[240px_1fr]'}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Preset</label>
            <Select
              value={healthPolicy?.preset ?? 'lineare'}
              onValueChange={(value) => {
                setHealthPolicy({
                  preset: value as DataHealthPreset,
                  fields: {},
                })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATA_HEALTH_PRESET_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Cambiare preset azzera gli override campo e riparte dai default.
            </p>
          </div>

          <div className={compact ? 'grid gap-2' : 'grid gap-2 lg:grid-cols-2'}>
            {healthSummary.fields.map(field => (
              <div key={field.key} className="rounded border bg-gray-50 p-2">
                <div className={compact ? 'grid gap-2' : 'grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center'}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{field.label}</div>
                    <div className="text-xs text-gray-500">{field.description}</div>
                  </div>
                  <Select
                    value={field.status}
                    onValueChange={(value) => {
                      const key = field.key as DataHealthFieldKey
                      setHealthPolicy(prev => ({
                        preset: prev?.preset ?? 'lineare',
                        fields: {
                          ...(prev?.fields ?? {}),
                          [key]: value as DataHealthFieldStatus,
                        },
                      }))
                    }}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="required">Richiesto</SelectItem>
                      <SelectItem value="recommended">Consigliato</SelectItem>
                      <SelectItem value="optional">Opzionale</SelectItem>
                      <SelectItem value="not_applicable">Non applicabile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={handleSaveHealthPolicy} disabled={savingHealth || !healthPolicy}>
            {savingHealth && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Salva copertura dati
          </Button>
        </div>
      </div>

      <MappingWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        initialConfig={config}
        onSave={handleSave}
      />
    </>
  )
}
