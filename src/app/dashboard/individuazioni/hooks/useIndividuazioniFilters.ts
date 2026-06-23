import { useMemo, useState } from 'react'
import type { CampagnaIndividuazione } from '@/features/individuazioni/services/individuazioni.service'

export function useIndividuazioniFilters(campagne: CampagnaIndividuazione[]) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
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
      filtered = filtered.filter(c => c.stato === statusFilter)
    }

    if (emittenteFilter !== 'all') {
      filtered = filtered.filter(c => c.emittente_id === emittenteFilter)
    }

    if (annoFilter !== 'all') {
      filtered = filtered.filter(c => c.anno?.toString() === annoFilter)
    }

    return filtered
  }, [annoFilter, campagne, emittenteFilter, searchTerm, statusFilter])

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

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    emittenteFilter,
    setEmittenteFilter,
    annoFilter,
    setAnnoFilter,
    filteredCampagne,
    uniqueAnni,
    uniqueEmittenti,
    resetFilters,
  }
}
