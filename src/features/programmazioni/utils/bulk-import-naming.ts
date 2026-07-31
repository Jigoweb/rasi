// src/features/programmazioni/utils/bulk-import-naming.ts
export function suggestCampagnaNomeFromFilename(filename: string, anno: number): string {
  const base = filename.replace(/\.(xlsx|xls|csv)$/i, '')
  const year = String(anno)
  let name = base
    .replace(/\bFile\s+grezzo\b/gi, '')
    .replace(/_AIE\b/gi, '')
    .replace(/_\d{8}_\d{8}/g, '')
    .replace(new RegExp(`(^|[\\s_\\-])${year}(?=$|[\\s_\\-])`, 'g'), ' ')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return name || base.trim() || filename
}
