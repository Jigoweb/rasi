// src/features/programmazioni/utils/bulk-import-naming.ts

/**
 * Prefill nome campagna da filename, allineato al flusso singolo
 * (`${emittente} ${anno}`): pulisce rumore dal file e appende l'anno di riferimento.
 */
export function suggestCampagnaNomeFromFilename(filename: string, anno: number): string {
  const base = filename.replace(/\.(xlsx|xls|csv)$/i, '')
  const year = String(anno)
  const stripped = base
    .replace(/\bFile\s+grezzo\b/gi, '')
    .replace(/_AIE\b/gi, '')
    .replace(/_\d{8}_\d{8}/g, '')
    .replace(new RegExp(`(^|[\\s_\\-])${year}(?=$|[\\s_\\-])`, 'g'), ' ')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const cleaned = stripped || base.trim() || filename

  // Evita "2015 2015" se dopo lo strip resta solo l'anno (o già termina con l'anno).
  if (cleaned === year || new RegExp(`(^|[\\s])${year}$`).test(cleaned)) {
    return cleaned
  }

  return `${cleaned} ${year}`
}
