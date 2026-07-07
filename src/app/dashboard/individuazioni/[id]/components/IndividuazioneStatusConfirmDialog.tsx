'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  getIndividuazioneScopeCounts,
  type IndividuazioneScopeContext,
  type IndividuazioneScopeCounts,
} from '@/features/individuazioni/services/individuazioni-review.service'
import type { IndividuazioneStatus } from '@/features/individuazioni/services/individuazioni.service'
import {
  getDefaultScopeChoice,
  getRuoloSelectionCount,
  getScopeChoiceCount,
  getScopeOptionLabels,
  getStatusConfirmDescription,
  getStatusConfirmTitle,
  toggleRuoloSelection,
  type ReviewScopeChoice,
} from '@/features/individuazioni/utils/review-scope'
import { notifyError } from '@/shared/lib/toast'

export type IndividuazioneStatusConfirmMode =
  | {
      type: 'scoped'
      context: IndividuazioneScopeContext
    }
  | {
      type: 'bulk'
      count: number
    }

interface IndividuazioneStatusConfirmDialogProps {
  open: boolean
  mode: IndividuazioneStatusConfirmMode | null
  targetStatus: IndividuazioneStatus | null
  initialNote?: string
  isSubmitting?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (input: { scopeChoice: ReviewScopeChoice | null; note: string }) => void
}

export default function IndividuazioneStatusConfirmDialog({
  open,
  mode,
  targetStatus,
  initialNote = '',
  isSubmitting = false,
  onOpenChange,
  onConfirm,
}: IndividuazioneStatusConfirmDialogProps) {
  const [note, setNote] = useState(initialNote)
  const [counts, setCounts] = useState<IndividuazioneScopeCounts | null>(null)
  const [loadingCounts, setLoadingCounts] = useState(false)
  const [scopeChoice, setScopeChoice] = useState<ReviewScopeChoice>({ kind: 'single' })
  const [selectedRuoloIds, setSelectedRuoloIds] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setNote(initialNote)
  }, [initialNote, open])

  useEffect(() => {
    if (!open || !mode || mode.type !== 'scoped' || !targetStatus) {
      setCounts(null)
      return
    }

    let cancelled = false
    setLoadingCounts(true)

    void getIndividuazioneScopeCounts(mode.context)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          notifyError('Impossibile calcolare l\'ambito dell\'aggiornamento', error)
          setCounts(null)
          return
        }
        setCounts(data)
        const defaultChoice = getDefaultScopeChoice(data)
        setScopeChoice(defaultChoice)
        if (defaultChoice.kind === 'artista_opera_ruoli') {
          setSelectedRuoloIds(defaultChoice.ruoloIds)
        } else if (data.ruoli.length === 1) {
          setSelectedRuoloIds([data.ruoli[0].ruoloId])
        } else {
          setSelectedRuoloIds(data.ruoli.map(ruolo => ruolo.ruoloId))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCounts(false)
      })

    return () => {
      cancelled = true
    }
  }, [mode, open, targetStatus])

  const effectiveScopeChoice = useMemo<ReviewScopeChoice>(() => {
    if (scopeChoice.kind === 'artista_opera_ruoli') {
      return { kind: 'artista_opera_ruoli', ruoloIds: selectedRuoloIds }
    }
    return scopeChoice
  }, [scopeChoice, selectedRuoloIds])

  const affectedCount = useMemo(() => {
    if (!targetStatus) return 0
    if (!mode) return 0
    if (mode.type === 'bulk') return mode.count
    if (!counts) return 0
    return getScopeChoiceCount(effectiveScopeChoice, counts)
  }, [counts, effectiveScopeChoice, mode, targetStatus])

  const scopeLabels = mode?.type === 'scoped' && counts
    ? getScopeOptionLabels(mode.context, counts)
    : null

  const canConfirm = !loadingCounts
    && affectedCount > 0
    && (effectiveScopeChoice.kind !== 'artista_opera_ruoli' || selectedRuoloIds.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {targetStatus ? getStatusConfirmTitle(targetStatus, affectedCount) : 'Conferma aggiornamento'}
          </DialogTitle>
          <DialogDescription>
            {targetStatus ? getStatusConfirmDescription(targetStatus) : 'Seleziona come applicare l\'aggiornamento.'}
          </DialogDescription>
        </DialogHeader>

        {mode?.type === 'scoped' && (
          <div className="space-y-4 py-1">
            {loadingCounts ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calcolo righe coinvolte...
              </div>
            ) : counts && scopeLabels ? (
              <div className="space-y-3">
                <ScopeOption
                  checked={scopeChoice.kind === 'single'}
                  disabled={counts.single === 0}
                  label={scopeLabels.single}
                  onSelect={() => setScopeChoice({ kind: 'single' })}
                />
                <ScopeOption
                  checked={scopeChoice.kind === 'opera'}
                  disabled={counts.opera <= 1}
                  label={scopeLabels.opera}
                  onSelect={() => setScopeChoice({ kind: 'opera' })}
                />
                <ScopeOption
                  checked={scopeChoice.kind === 'artista_opera'}
                  disabled={counts.artistaOpera <= 1}
                  label={scopeLabels.artistaOpera}
                  onSelect={() => setScopeChoice({ kind: 'artista_opera' })}
                />
                {counts.ruoli.length > 0 && (
                  <div className="rounded-lg border p-3 space-y-3">
                    <ScopeOption
                      checked={scopeChoice.kind === 'artista_opera_ruoli'}
                      disabled={counts.artistaOpera <= 1}
                      label={`Per ruolo su ${mode.context.artistaDisplay} / «${mode.context.operaTitolo}»`}
                      onSelect={() => setScopeChoice({
                        kind: 'artista_opera_ruoli',
                        ruoloIds: selectedRuoloIds.length > 0
                          ? selectedRuoloIds
                          : counts.ruoli.map(ruolo => ruolo.ruoloId),
                      })}
                    />
                    {scopeChoice.kind === 'artista_opera_ruoli' && (
                      <div className="space-y-2 pl-6">
                        {counts.ruoli.map(ruolo => (
                          <label key={ruolo.ruoloId} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={selectedRuoloIds.includes(ruolo.ruoloId)}
                              onCheckedChange={checked => {
                                setSelectedRuoloIds(prev => toggleRuoloSelection(prev, ruolo.ruoloId, checked === true))
                              }}
                            />
                            <span>
                              {ruolo.ruoloNome} <span className="text-muted-foreground">({ruolo.count})</span>
                            </span>
                          </label>
                        ))}
                        <p className="text-xs text-muted-foreground">
                          Selezionate: {getRuoloSelectionCount(counts.ruoli, selectedRuoloIds)} individuazioni
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-destructive">Impossibile calcolare le righe coinvolte.</p>
            )}
          </div>
        )}

        {mode?.type === 'bulk' && (
          <p className="text-sm text-muted-foreground">
            Stai aggiornando <strong>{mode.count}</strong> individuazioni selezionate nella tabella.
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="status-confirm-note">Note validazione</Label>
          <Textarea
            id="status-confirm-note"
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder="Opzionale. Consigliata in caso di respinto."
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annulla
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm({
              scopeChoice: mode?.type === 'scoped' ? effectiveScopeChoice : null,
              note,
            })}
            disabled={!canConfirm || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Conferma ({affectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ScopeOption({
  checked,
  disabled,
  label,
  onSelect,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onSelect: () => void
}) {
  return (
    <label className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${checked ? 'border-primary bg-primary/5' : ''} ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <input
        type="radio"
        name="review-scope"
        className="mt-1"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
      />
      <span>{label}</span>
    </label>
  )
}
