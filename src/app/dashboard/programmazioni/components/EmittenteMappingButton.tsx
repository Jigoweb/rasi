'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Settings, Loader2 } from 'lucide-react'
import {
  getMappingByEmittente,
  saveMapping,
  type ImportMappingConfig,
} from '@/features/programmazioni/services/import-mapping.service'
import MappingWizard from './MappingWizard'

interface EmittenteMappingButtonProps {
  emittenteId: string
  /** Callback opzionale quando la config cambia (per refresh esterno) */
  onChange?: () => void
}

/**
 * Bottone compatto (icona) per aprire direttamente l'editor del mapping import
 * di un emittente. Carica la config esistente al click (lazy) e apre il
 * MappingWizard precompilato; se non c'è config, apre il wizard in modalità nuova.
 */
export default function EmittenteMappingButton({
  emittenteId,
  onChange,
}: EmittenteMappingButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<ImportMappingConfig | null>(null)

  const handleOpen = async () => {
    setLoading(true)
    const { data } = await getMappingByEmittente(emittenteId)
    setConfig(data)
    setLoading(false)
    setOpen(true)
  }

  const handleSave = async (newConfig: ImportMappingConfig) => {
    const { error } = await saveMapping(emittenteId, newConfig)
    if (error) throw new Error(error.message ?? 'Errore salvataggio')
    setConfig(newConfig)
    onChange?.()
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        disabled={loading}
        title="Mapping import"
        aria-label="Mapping import"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Settings className="h-4 w-4" />
        )}
      </Button>

      <MappingWizard
        open={open}
        onClose={() => setOpen(false)}
        initialConfig={config}
        onSave={handleSave}
      />
    </>
  )
}
