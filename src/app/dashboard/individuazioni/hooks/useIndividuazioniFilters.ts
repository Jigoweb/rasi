import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type {
  CampagnaIndividuazione,
  IndividuazioneProcessingProgress,
} from '@/features/individuazioni/services/individuazioni.service'
import {
  getIndividuazioneStatusFilterLabel,
  matchesIndividuazioneStatusFilter,
} from '@/features/individuazioni/utils/individuazione-display-status'

const CAMPAGNA_STATUS_FILTERS = new Set([
  'bozza',
  'in_corso',
  'interrotto',
  'da_verificare',
  'completata',
  'archiviata',
])

export function useIndividuazioniFilters(
  campagne: CampagnaIndividuazione[],
  processingProgressMap: Record<string, IndividuazioneProcessingProgress | null> = {},
) {
  const searchParams = useSearchParams()
  const statoFromUrl = searchParams?.get('stato')
  const initialStatus =
    statoFromUrl && CAMPAGNA_STATUS_FILTERS.has(statoFromUrl) ? statoFromUrl : 'all'

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus)
  const [emittenteFilter, setEmittenteFilter] = useState<string>('all')
  const [annoFilter, setAnnoFilter] = useState<string>('all')

  const filteredCampagne = useMemo(() => {
    let filtered = campagne
    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (normalizedSearch) {
      filtered = filtered.filter(c =>
        c.nome?.toLowerCase().includes(normalizedSearch) ||
        c.emittenti?.nome?.toLowerCase().includes(normalizedSearch)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c =>
        matchesIndividuazioneStatusFilter(c, statusFilter, processingProgressMap[c.id])
      )
    }

    if (emittenteFilter !== 'all') {
      filtered = filtered.filter(c => c.emittente_id === emittenteFilter)
    }

    if (annoFilter !== 'all') {
      filtered = filtered.filter(c => c.anno?.toString() === annoFilter)
    }

    return filtered
  }, [annoFilter, campagne, emittenteFilter, processingProgressMap, searchTerm, statusFilter])

  const uniqueAnni = useMemo(() => {
    const anni = campagne.map(c => c.anno).filter((v): v is number => v !== null && v !== undefined)
    return [...new Set(anni)].sort((a, b) => b - a)
  }, [campagne])

  const uniqueEmittenti = useMemo(() => {
    const emittentiMap = new Map<string, { id: string; nome: string }>()
    campagne.forEach(c => {
      if (c.emittente_id && c.emittenti?.nome) {
        emittentiMap.set(c.emittente_id, { id: c.emittente_id, nome: c.emittenti.nome })
      }
    })
    return Array.from(emittentiMap.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [campagne])

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setEmittenteFilter('all')
    setAnnoFilter('all')
  }

  const hasActiveFilters = searchTerm.trim().length > 0 ||
    statusFilter !== 'all' ||
    emittenteFilter !== 'all' ||
    annoFilter !== 'all'

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    statusFilterLabel: getIndividuazioneStatusFilterLabel(statusFilter),
    emittenteFilter,
    setEmittenteFilter,
    annoFilter,
    setAnnoFilter,
    filteredCampagne,
    uniqueAnni,
    uniqueEmittenti,
    resetFilters,
    hasActiveFilters,
  }
}
