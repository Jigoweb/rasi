'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { FileUp, Check, ArrowLeft, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { TEMPLATE_FIELDS } from '@/features/programmazioni/utils/coercion'
import { transformsForField, TRANSFORM_LABELS, suggestDateTransform, isDateTargetField, type TransformName } from '@/features/programmazioni/utils/transforms'
import {
  detectColumns,
  validateImportRules,
  type ImportMappingConfig,
  type DetectColumnsResult,
  type FieldRule,
} from '@/features/programmazioni/services/import-mapping.service'
import MappingRulesEditor from './MappingRulesEditor'

interface MappingWizardProps {
  open: boolean
  onClose: () => void
  /** Config esistente da editare (modalità modifica), oppure null per nuova */
  initialConfig?: ImportMappingConfig | null
  /** Se passato, il wizard si avvia direttamente sul mapping con queste colonne (skip step 1) */
  prefillFile?: File | null
  onSave: (config: ImportMappingConfig) => Promise<void> | void
}

const IGNORE = '__ignore__'
const NO_TRANSFORM = '__none__'

export default function MappingWizard({
  open,
  onClose,
  initialConfig = null,
  prefillFile = null,
  onSave,
}: MappingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [file, setFile] = useState<File | null>(null)
  const [detected, setDetected] = useState<DetectColumnsResult | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [rules, setRules] = useState<Record<string, FieldRule>>({})
  const [transforms, setTransforms] = useState<Record<string, TransformName>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Reset on open
  useEffect(() => {
    if (!open) return
    setStep(1)
    setFile(null)
    setDetected(null)
    setMapping(initialConfig?.mapping ?? {})
    setRules(initialConfig?.rules ?? {})
    setTransforms(initialConfig?.transforms ?? {})
    setError(null)
    setSaving(false)
  }, [open, initialConfig])

  // Prefill auto-detect se file passato
  useEffect(() => {
    if (!open || !prefillFile) return
    handleFile(prefillFile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefillFile])

  const handleFile = async (f: File) => {
    setLoading(true)
    setError(null)
    try {
      const r = await detectColumns(f)
      if (r.columns.length === 0) {
        setError('Il file non contiene colonne riconoscibili.')
        return
      }
      setFile(f)
      setDetected(r)
      // Pre-popola mapping dall'initialConfig se le colonne coincidono
      if (initialConfig) {
        const filtered: Record<string, string> = {}
        for (const c of r.columns) {
          if (initialConfig.mapping[c]) filtered[c] = initialConfig.mapping[c]
        }
        setMapping(filtered)
        setRules(initialConfig.rules ?? {})
        setTransforms(initialConfig?.transforms ?? {})
      } else {
        setMapping({})
        setRules({})
        setTransforms({})
      }
      setStep(2)
    } catch (e: any) {
      setError(e?.message ?? 'Errore lettura file')
    } finally {
      setLoading(false)
    }
  }

  const usedTemplateFields = useMemo(() => {
    const used = new Set<string>()
    for (const v of Object.values(mapping)) {
      if (v && v !== IGNORE) used.add(v)
    }
    return used
  }, [mapping])

  const previewRow = detected?.preview?.[0] ?? {}

  const handleSelect = (sourceCol: string, target: string) => {
    setMapping(prev => {
      const next = { ...prev }
      if (target === IGNORE || !target) {
        delete next[sourceCol]
      } else {
        // Rimuove eventuali altre colonne mappate sullo stesso target (un campo template = una sola sorgente)
        for (const k of Object.keys(next)) {
          if (next[k] === target && k !== sourceCol) delete next[k]
        }
        next[sourceCol] = target
      }
      return next
    })
    if (target === IGNORE || !target) {
      setTransforms(prev => {
        if (!prev[sourceCol]) return prev
        const next = { ...prev }
        delete next[sourceCol]
        return next
      })
    }
    const isDateField = isDateTargetField(target)
    if (isDateField) {
      setTransforms(prev => {
        if (prev[sourceCol]) return prev // non sovrascrivere scelta esistente
        const suggested = suggestDateTransform(previewRow[sourceCol])
        if (!suggested) return prev
        return { ...prev, [sourceCol]: suggested }
      })
    }
  }

  const handleTransform = (sourceCol: string, t: string) => {
    setTransforms(prev => {
      const next = { ...prev }
      if (t === NO_TRANSFORM || !t) delete next[sourceCol]
      else next[sourceCol] = t as TransformName
      return next
    })
  }

  const hasTitoloMapped = usedTemplateFields.has('titolo')
  const titoloFromRule = (rules.titolo?.sources?.length ?? 0) > 0
  const canProceedToStep3 = hasTitoloMapped || titoloFromRule

  const handleSave = async () => {
    if (!detected) return
    setSaving(true)
    setError(null)
    try {
      const ruleErrors = validateImportRules(rules, detected.columns)
      if (ruleErrors.length > 0) {
        setError('Regole avanzate non valide: ' + ruleErrors.join('; '))
        return
      }
      const config: ImportMappingConfig = {
        version: 1,
        colonne_rilevate: detected.columns,
        ultimo_upload: new Date().toISOString(),
        mapping,
        ...(Object.keys(rules).length > 0 ? { rules } : {}),
        ...(Object.keys(transforms).length > 0 ? { transforms } : {}),
      }
      await onSave(config)
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Errore salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialConfig ? 'Modifica mapping import' : 'Configura mapping import'}
          </DialogTitle>
          <DialogDescription>
            Step {step} di 3 — {step === 1 ? 'Carica un file campione' : step === 2 ? 'Mappa le colonne' : 'Conferma'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" /> {error}
          </div>
        )}

        {/* STEP 1: Upload campione */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Carica un file XLSX o CSV con i dati dell'emittente. Il sistema leggerà
              i nomi delle colonne per costruire la mappatura.
            </p>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileUp className="h-10 w-10 mx-auto text-gray-400 mb-2" />
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
                disabled={loading}
              />
              {loading && (
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Lettura del file…
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Mapping visuale */}
        {step === 2 && detected && (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {detected.columns.length} colonne rilevate, {usedTemplateFields.size} mappate
              </span>
              {!hasTitoloMapped && !titoloFromRule && (
                <Badge variant="destructive" className="text-xs">
                  Mappa "titolo" per continuare
                </Badge>
              )}
            </div>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Colonna sorgente</th>
                    <th className="text-left px-3 py-2 font-medium">→ Campo template</th>
                    <th className="text-left px-3 py-2 font-medium">Trasformazione</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Anteprima</th>
                  </tr>
                </thead>
                <tbody>
                  {detected.columns.map(col => {
                    const currentTarget = mapping[col] ?? IGNORE
                    return (
                      <tr key={col} className="border-b last:border-b-0">
                        <td className="px-3 py-2 font-mono text-xs">{col}</td>
                        <td className="px-3 py-2">
                          <Select
                            value={currentTarget}
                            onValueChange={v => handleSelect(col, v)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={IGNORE}>— ignora —</SelectItem>
                              {TEMPLATE_FIELDS.map(f => {
                                const isUsedElsewhere =
                                  usedTemplateFields.has(f) && currentTarget !== f
                                return (
                                  <SelectItem
                                    key={f}
                                    value={f}
                                    disabled={isUsedElsewhere}
                                  >
                                    {f} {isUsedElsewhere ? '(già usato)' : ''}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          {mapping[col] ? (
                            <>
                              <Select
                                value={transforms[col] ?? NO_TRANSFORM}
                                onValueChange={v => handleTransform(col, v)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={NO_TRANSFORM}>— nessuna —</SelectItem>
                                  {transformsForField(mapping[col]).map(t => (
                                    <SelectItem key={t} value={t}>
                                      {TRANSFORM_LABELS[t]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {(() => {
                                const target = mapping[col]
                                const isDate = isDateTargetField(target)
                                if (!isDate) return null
                                const suggested = suggestDateTransform(previewRow[col])
                                if (suggested && transforms[col] === suggested) {
                                  return <span className="text-[10px] text-emerald-600 mt-1 block">suggerito dall&apos;anteprima</span>
                                }
                                return null
                              })()}
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">
                          {String(previewRow[col] ?? '')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <MappingRulesEditor
              columns={detected.columns}
              rules={rules}
              onChange={setRules}
              previewRow={previewRow}
            />
          </div>
        )}

        {/* STEP 3: Conferma */}
        {step === 3 && detected && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              Verifica la mappatura prima di salvare. Verrà usata per tutti gli upload futuri
              di questo emittente.
            </p>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Sorgente</th>
                    <th className="text-left px-3 py-2 font-medium">Campo template</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(mapping).map(([source, target]) => (
                    <tr key={source} className="border-b last:border-b-0">
                      <td className="px-3 py-2 font-mono text-xs">{source}</td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary">{target}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-gray-500">
              Campi template non mappati ({TEMPLATE_FIELDS.length - usedTemplateFields.size}):{' '}
              {TEMPLATE_FIELDS.filter(f => !usedTemplateFields.has(f)).join(', ')}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => (s - 1) as any)} disabled={saving}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Indietro
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annulla
          </Button>
          {step === 2 && (
            <Button onClick={() => setStep(3)} disabled={!canProceedToStep3}>
              Avanti <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Salva configurazione
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
