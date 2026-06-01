'use client'

import { useMemo } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Plus, X, Wand2 } from 'lucide-react'
import {
  resolveFieldValue,
  type FieldRule,
} from '@/features/programmazioni/services/import-mapping.service'
import { normalizeTitle, normalizeTitleStrict } from '@/features/programmazioni/utils/title-normalize'

/** Fields this editor manages (the series/episode title group). */
const RULE_FIELDS = [
  'titolo',
  'titolo_originale',
  'titolo_episodio',
  'titolo_episodio_originale',
] as const

const EPISODE_FIELDS = new Set<string>(['titolo_episodio', 'titolo_episodio_originale'])

const NONE = '__none__'

interface MappingRulesEditorProps {
  columns: string[]
  rules: Record<string, FieldRule>
  onChange: (rules: Record<string, FieldRule>) => void
  previewRow?: Record<string, any>
}

export default function MappingRulesEditor({
  columns,
  rules,
  onChange,
  previewRow = {},
}: MappingRulesEditorProps) {
  const hasSeriesShape = useMemo(
    () => columns.includes('NOME_SERIE') && columns.includes('TITOLO'),
    [columns],
  )

  const setRule = (field: string, next: FieldRule | null) => {
    const copy = { ...rules }
    if (!next || next.sources.length === 0) delete copy[field]
    else copy[field] = next
    onChange(copy)
  }

  const addSource = (field: string, col: string) => {
    const cur = rules[field] ?? { sources: [] }
    if (cur.sources.includes(col)) return
    setRule(field, { ...cur, sources: [...cur.sources, col] })
  }

  const removeSource = (field: string, col: string) => {
    const cur = rules[field]
    if (!cur) return
    setRule(field, { ...cur, sources: cur.sources.filter(s => s !== col) })
  }

  const setGuard = (field: string, col: string) => {
    const cur = rules[field] ?? { sources: [] }
    setRule(field, { ...cur, onlyIfPresent: col === NONE ? undefined : col })
  }

  const applySeriesPreset = () => {
    const has = (c: string) => columns.includes(c)
    const build = (srcs: string[], guard?: string): FieldRule | null => {
      const sources = srcs.filter(has)
      if (sources.length === 0) return null
      return guard && has(guard) ? { sources, onlyIfPresent: guard } : { sources }
    }
    const next: Record<string, FieldRule> = {}
    const t = build(['NOME_SERIE', 'TITOLO'])
    if (t) next.titolo = t
    const to = build(['NOME_SERIE', 'TITOLO_ORIGINALE'])
    if (to) next.titolo_originale = to
    const te = build(['TITOLO'], 'NOME_SERIE')
    if (te) next.titolo_episodio = te
    const teo = build(['TITOLO_ORIGINALE'], 'NOME_SERIE')
    if (teo) next.titolo_episodio_originale = teo
    onChange(next)
  }

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Regole avanzate titoli (serie TV)</p>
          <p className="text-xs text-gray-500">
            Per file che mischiano film e serie: il titolo prende la prima colonna non vuota.
          </p>
        </div>
        {hasSeriesShape && (
          <Button type="button" variant="outline" size="sm" onClick={applySeriesPreset}>
            <Wand2 className="h-4 w-4 mr-1" /> Preset Serie TV
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {RULE_FIELDS.map(field => {
          const rule = rules[field]
          const sources = rule?.sources ?? []
          const available = columns.filter(c => !sources.includes(c))
          const resolvedRaw = rule ? resolveFieldValue(previewRow, rule) : undefined
          const resolved =
            typeof resolvedRaw === 'string'
              ? EPISODE_FIELDS.has(field)
                ? normalizeTitleStrict(resolvedRaw)
                : normalizeTitle(resolvedRaw)
              : resolvedRaw
          return (
            <div key={field} className="bg-white border rounded p-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs w-56 shrink-0">{field}</span>
                <div className="flex flex-wrap items-center gap-1 flex-1">
                  {sources.map((s, i) => (
                    <Badge key={s} variant="secondary" className="gap-1">
                      {i > 0 && <span className="text-gray-400 text-[10px]">poi</span>}
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSource(field, s)}
                        className="ml-0.5 text-gray-400 hover:text-red-600"
                        aria-label={`Rimuovi ${s}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {available.length > 0 && (
                    <Select key={`add-${field}-${sources.length}`} value="" onValueChange={v => v && addSource(field, v)}>
                      <SelectTrigger className="h-7 w-40 text-xs">
                        <span className="flex items-center gap-1 text-gray-500">
                          <Plus className="h-3 w-3" /> aggiungi
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {available.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="w-56 shrink-0">popola solo se valorizzato:</span>
                <Select value={rule?.onlyIfPresent ?? NONE} onValueChange={v => setGuard(field, v)} disabled={sources.length === 0}>
                  <SelectTrigger className="h-7 w-48 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— sempre —</SelectItem>
                    {columns.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rule && (
                  <span className="ml-auto truncate max-w-[220px]" title={resolved === undefined ? '' : String(resolved)}>
                    anteprima: <strong>{resolved === undefined ? '— (vuoto)' : String(resolved)}</strong>
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
