/** Etichetta di un episodio: titolo italiano, e originale fra parentesi se diverso. */

export function episodeTitleLabel(episode: {
  titolo_episodio?: string | null
  titolo_episodio_originale?: string | null
} | null | undefined): string {
  const italian = episode?.titolo_episodio?.trim() ?? ''
  const original = episode?.titolo_episodio_originale?.trim() ?? ''
  if (italian && original && italian.localeCompare(original, 'it', { sensitivity: 'accent' }) !== 0) {
    return `${italian} (${original})`
  }
  return italian || original
}
