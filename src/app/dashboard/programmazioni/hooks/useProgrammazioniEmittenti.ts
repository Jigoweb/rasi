import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Database } from '@/shared/lib/supabase'

export type Emittente = Database['public']['Tables']['emittenti']['Row']

export interface EmittenteFormData {
  codice: string
  nome: string
  tipo: Emittente['tipo']
  paese: string
  attiva: boolean
}

const emptyFormData: EmittenteFormData = {
  codice: '',
  nome: '',
  tipo: 'tv_generalista',
  paese: 'IT',
  attiva: true,
}

export function useProgrammazioniEmittenti() {
  const [emittenti, setEmittenti] = useState<Emittente[]>([])
  const [loadingEmittenti, setLoadingEmittenti] = useState(false)
  const [searchEmittentiQuery, setSearchEmittentiQuery] = useState('')
  const [debouncedSearchEmittentiQuery, setDebouncedSearchEmittentiQuery] = useState('')
  const [filteredEmittenti, setFilteredEmittenti] = useState<Emittente[]>([])
  const [selectedEmittente, setSelectedEmittente] = useState<Emittente | null>(null)
  const [showEmittenteDetails, setShowEmittenteDetails] = useState(false)
  const [showEmittenteForm, setShowEmittenteForm] = useState(false)
  const [emittenteFormMode, setEmittenteFormMode] = useState<'create' | 'edit'>('create')
  const [emittenteFormData, setEmittenteFormData] = useState<EmittenteFormData>(emptyFormData)
  const [emittenteFormSaving, setEmittenteFormSaving] = useState(false)
  const [emittenteFormError, setEmittenteFormError] = useState<string | null>(null)

  const fetchEmittenti = useCallback(async () => {
    try {
      setLoadingEmittenti(true)
      const { data, error } = await supabase
        .from('emittenti')
        .select('*')
        .order('nome', { ascending: true })

      if (error) throw error
      setEmittenti(data || [])
    } catch (error) {
      console.error('Error fetching emittenti:', error)
    } finally {
      setLoadingEmittenti(false)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchEmittentiQuery(searchEmittentiQuery)
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchEmittentiQuery])

  useEffect(() => {
    if (!debouncedSearchEmittentiQuery) {
      setFilteredEmittenti(emittenti)
      return
    }

    const query = debouncedSearchEmittentiQuery.toLowerCase()
    setFilteredEmittenti(emittenti.filter(emittente => (
      emittente.nome.toLowerCase().includes(query) ||
      emittente.codice.toLowerCase().includes(query)
    )))
  }, [emittenti, debouncedSearchEmittentiQuery])

  const openCreateEmittente = () => {
    const maxN = emittenti.reduce((max, emittente) => {
      const match = emittente.codice.match(/^EMT_(\d+)$/)
      return match ? Math.max(max, parseInt(match[1], 10)) : max
    }, 0)

    setEmittenteFormMode('create')
    setEmittenteFormData({ ...emptyFormData, codice: `EMT_${maxN + 1}` })
    setEmittenteFormError(null)
    setShowEmittenteForm(true)
  }

  const openEditEmittente = (emittente: Emittente) => {
    setSelectedEmittente(emittente)
    setEmittenteFormMode('edit')
    setEmittenteFormData({
      codice: emittente.codice,
      nome: emittente.nome,
      tipo: emittente.tipo,
      paese: emittente.paese ?? 'IT',
      attiva: emittente.attiva ?? true,
    })
    setEmittenteFormError(null)
    setShowEmittenteForm(true)
  }

  const handleSaveEmittente = async () => {
    if (!emittenteFormData.codice.trim() || !emittenteFormData.nome.trim()) {
      setEmittenteFormError('Codice e nome sono obbligatori.')
      return
    }

    setEmittenteFormSaving(true)
    setEmittenteFormError(null)
    try {
      if (emittenteFormMode === 'create') {
        const { error } = await supabase.from('emittenti').insert(emittenteFormData)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('emittenti')
          .update(emittenteFormData)
          .eq('id', selectedEmittente!.id)
        if (error) throw error
      }

      setShowEmittenteForm(false)
      if (emittenteFormMode === 'edit') setShowEmittenteDetails(false)
      await fetchEmittenti()
    } catch (error: unknown) {
      setEmittenteFormError(getErrorMessage(error) || 'Errore salvataggio')
    } finally {
      setEmittenteFormSaving(false)
    }
  }

  const openManageEmittente = (emittente: Emittente) => {
    setSelectedEmittente(emittente)
    setShowEmittenteDetails(true)
  }

  return {
    emittenti,
    loadingEmittenti,
    searchEmittentiQuery,
    debouncedSearchEmittentiQuery,
    filteredEmittenti,
    selectedEmittente,
    showEmittenteDetails,
    showEmittenteForm,
    emittenteFormMode,
    emittenteFormData,
    emittenteFormSaving,
    emittenteFormError,
    fetchEmittenti,
    setSearchEmittentiQuery,
    setSelectedEmittente,
    setShowEmittenteDetails,
    setShowEmittenteForm,
    setEmittenteFormData,
    openCreateEmittente,
    openEditEmittente,
    handleSaveEmittente,
    openManageEmittente,
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const details = (error as { details?: unknown }).details
    if (typeof details === 'string') return details
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
    return JSON.stringify(error)
  }
  return String(error)
}
