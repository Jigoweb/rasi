'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Settings, Trash2, AlertCircle, Loader2 } from 'lucide-react'
import {
  getMappingByEmittente,
  saveMapping,
  deleteMapping,
  summarizeImportMapping,
  type ImportMappingConfig,
} from '@/features/programmazioni/services/import-mapping.service'
import { TEMPLATE_FIELDS } from '@/features/programmazioni/utils/coercion'
import MappingWizard from './MappingWizard'

interface EmittenteMappingSectionProps {
  emittenteId: string
  /** Callback opzionale quando la config cambia (per refresh esterno) */
  onChange?: () => void
}

export default function EmittenteMappingSection({
  emittenteId,
  onChange,
}: EmittenteMappingSectionProps) {
  const [config, setConfig] = useState<ImportMappingConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await getMappingByEmittente(emittenteId)
    if (error) {
      setError(error.message ?? 'Errore caricamento config')
    } else {
      setConfig(data)
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
        <div className="flex items-center justify-between">
          <div>
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
            <div className="flex items-center gap-4 text-sm">
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

            <div className="flex gap-2 pt-1">
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

      <MappingWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        initialConfig={config}
        onSave={handleSave}
      />
    </>
  )
}
