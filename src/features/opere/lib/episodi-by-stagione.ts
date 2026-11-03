export type StagioneKey = number | 'none'

export type EpisodioStagioneFields = {
  numero_stagione: number | null
  numero_episodio: number | null
}

export type EpisodiStagioneGroup<T> = {
  key: StagioneKey
  stagione: number | null
  episodi: T[]
  count: number
}

export function stagioneKey(numero: number | null | undefined): StagioneKey {
  return typeof numero === 'number' ? numero : 'none'
}

export function groupEpisodiByStagione<T extends EpisodioStagioneFields>(
  episodi: T[],
): EpisodiStagioneGroup<T>[] {
  const map = new Map<StagioneKey, T[]>()
  for (const ep of episodi) {
    const key = stagioneKey(ep.numero_stagione)
    const list = map.get(key) ?? []
    list.push(ep)
    map.set(key, list)
  }

  const numericKeys = [...map.keys()]
    .filter((k): k is number => k !== 'none')
    .sort((a, b) => a - b)
  const orderedKeys: StagioneKey[] = [...numericKeys]
  if (map.has('none')) orderedKeys.push('none')

  return orderedKeys.map((key) => {
    const list = [...(map.get(key) ?? [])].sort(
      (a, b) => (a.numero_episodio ?? 9999) - (b.numero_episodio ?? 9999),
    )
    return {
      key,
      stagione: key === 'none' ? null : key,
      episodi: list,
      count: list.length,
    }
  })
}

export function formatStagioneHeader(stagione: number | null, count: number): string {
  const label = stagione === null ? 'Senza stagione' : `Stagione ${stagione}`
  const epLabel = count === 1 ? '1 episodio' : `${count} episodi`
  return `${label} · ${epLabel}`
}
