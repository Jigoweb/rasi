import { matchesMultiValueFilter } from '@/shared/lib/multi-value-filter'

export interface FilterableCampagnaProgrammazione {
  id: string
  nome: string
  stato: string | null
  anno: number | null
  emittente_id: string | null
  emittenti?: {
    nome?: string | null
  } | null
}

export interface CampagneProgrammazioneFilters {
  searchQuery: string
  statusFilter: string
  /** Empty = tutte le emittenti */
  emittenteFilter: string[]
  /** Empty = tutti gli anni (valori stringa, es. "2026") */
  annoFilter: string[]
}

export function filterCampagneProgrammazione<T extends FilterableCampagnaProgrammazione>(
  campagne: T[],
  filters: CampagneProgrammazioneFilters
): T[] {
  const normalizedSearch = filters.searchQuery.trim().toLowerCase()

  return campagne.filter(campagna => {
    if (normalizedSearch) {
      const matchesName = campagna.nome.toLowerCase().includes(normalizedSearch)
      const matchesEmittente = campagna.emittenti?.nome
        ?.toLowerCase()
        .includes(normalizedSearch) ?? false
      if (!matchesName && !matchesEmittente) return false
    }

    if (filters.statusFilter !== 'all' && campagna.stato !== filters.statusFilter) {
      return false
    }

    if (!matchesMultiValueFilter(filters.emittenteFilter, campagna.emittente_id)) {
      return false
    }

    if (!matchesMultiValueFilter(filters.annoFilter, campagna.anno)) {
      return false
    }

    return true
  })
}

export function getUniqueAnni(campagne: FilterableCampagnaProgrammazione[]): number[] {
  const anni = new Set<number>()
  for (const campagna of campagne) {
    if (typeof campagna.anno === 'number') anni.add(campagna.anno)
  }
  return [...anni].sort((a, b) => b - a)
}

export function getUniqueEmittenti(
  campagne: FilterableCampagnaProgrammazione[]
): Array<{ id: string; nome: string }> {
  const emittenti = new Map<string, { id: string; nome: string }>()

  for (const campagna of campagne) {
    if (campagna.emittente_id && campagna.emittenti?.nome) {
      emittenti.set(campagna.emittente_id, {
        id: campagna.emittente_id,
        nome: campagna.emittenti.nome,
      })
    }
  }

  return [...emittenti.values()].sort((a, b) => a.nome.localeCompare(b.nome))
}
