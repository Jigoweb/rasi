import type { ImportMappingConfig, UploadDecision } from '../services/import-mapping.service'

export const BULK_SAFE_ABSENT_TARGETS: ReadonlySet<string> = new Set([
  'numero_episodio',
  'numero_stagione',
])

export type BulkColumnClass = 'ok' | 'warning_safe' | 'error'

export function classifyBulkColumnDiff(
  decision: UploadDecision,
  mapping?: ImportMappingConfig | null,
): BulkColumnClass {
  if (decision.kind === 'apply_existing' || decision.kind === 'legacy_template') return 'ok'
  if (decision.kind === 'need_wizard') return 'error'
  if (decision.kind !== 'warn_format_changed') return 'error'

  const config = mapping ?? decision.mapping
  const sourceToTarget = config.mapping ?? {}

  for (const sourceCol of decision.mappedRemoved) {
    const target = sourceToTarget[sourceCol]
    if (!target) continue
    if (target === 'titolo') return 'error'
    if (!BULK_SAFE_ABSENT_TARGETS.has(target)) return 'error'
  }

  return decision.mappedRemoved.length > 0 ? 'warning_safe' : 'ok'
}
