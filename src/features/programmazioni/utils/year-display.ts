export function formatYearRange(
  start?: number | null,
  end?: number | null,
): string | null {
  if (start == null || !Number.isFinite(start)) return null
  if (end != null && Number.isFinite(end) && end !== start) {
    const a = Math.min(start, end)
    const b = Math.max(start, end)
    return `${a}–${b}`
  }
  return String(start)
}

export interface ProgrammazioneYearDisplay {
  rilascio: string | null
  produzione: string | null
}

/** Etichette UI compatte: rilascio + produzione opzionale (nessuna colonna tecnica). */
export function formatProgrammazioneYears(row: {
  anno?: number | null
  anno_fine?: number | null
  anno_rilascio?: number | null
  anno_rilascio_fine?: number | null
  anno_produzione?: number | null
  anno_produzione_fine?: number | null
}): ProgrammazioneYearDisplay {
  const rilascio =
    formatYearRange(
      row.anno_rilascio ?? row.anno,
      row.anno_rilascio_fine ?? row.anno_fine,
    )

  const produzione = formatYearRange(row.anno_produzione, row.anno_produzione_fine)

  return {
    rilascio,
    produzione: produzione && produzione !== rilascio ? produzione : null,
  }
}
