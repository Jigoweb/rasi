export type EpisodeAlertTipo =
  | 'catalog_episode_not_censito'
  | 'programmazione_episode_data_invalid'

export function getEpisodeAlertTypeLabel(tipo: EpisodeAlertTipo): string {
  return tipo === 'catalog_episode_not_censito'
    ? 'Episodio non censito'
    : 'Dati episodio invalidi'
}

export function getEpisodeAlertActionHint(tipo: EpisodeAlertTipo): string {
  return tipo === 'catalog_episode_not_censito'
    ? 'Apri l\'opera e censici l\'episodio mancante nel catalogo.'
    : 'Apri la programmazione e verifica stagione/episodio nei dati importati.'
}

export function formatEpisodeCode(
  numeroStagione: number | null | undefined,
  numeroEpisodio: number | null | undefined,
): string | null {
  if (numeroStagione == null && numeroEpisodio == null) return null
  return `S${numeroStagione ?? '?'}E${numeroEpisodio ?? '?'}`
}

export function buildOperaHref(operaId: string | null | undefined): string | null {
  return operaId ? `/dashboard/opere/${operaId}` : null
}

export function buildProgrammazioneHref(
  campagneProgrammazioneId: string | null | undefined,
  searchTitle?: string | null,
): string | null {
  if (!campagneProgrammazioneId) return null
  const base = `/dashboard/programmazioni/${campagneProgrammazioneId}`
  const query = searchTitle?.trim()
  if (!query) return base
  return `${base}?q=${encodeURIComponent(query)}`
}
