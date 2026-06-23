import { Dispatch, SetStateAction, useState } from 'react'
import {
  deleteCampagnaIndividuazione,
  getDeleteCampagnaIndividuazioneInfo,
  type CampagnaIndividuazione,
  type DeleteCampagnaIndividuazioneInfo,
} from '@/features/individuazioni/services/individuazioni.service'

interface UseIndividuazioniDeleteOptions {
  updateCampagne: Dispatch<SetStateAction<CampagnaIndividuazione[]>>
}

export function useIndividuazioniDelete({ updateCampagne }: UseIndividuazioniDeleteOptions) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [campagnaToDelete, setCampagnaToDelete] = useState<CampagnaIndividuazione | null>(null)
  const [deleteInfo, setDeleteInfo] = useState<DeleteCampagnaIndividuazioneInfo | null>(null)
  const [isLoadingDeleteInfo, setIsLoadingDeleteInfo] = useState(false)
  const [isDeletingCampagna, setIsDeletingCampagna] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState<{ phase: string; deleted?: number; total?: number } | null>(null)

  const openDeleteDialog = async (campagna: CampagnaIndividuazione) => {
    setCampagnaToDelete(campagna)
    setIsDeleteDialogOpen(true)
    setIsLoadingDeleteInfo(true)
    setDeleteInfo(null)
    setDeleteProgress(null)

    try {
      const { data, error } = await getDeleteCampagnaIndividuazioneInfo(campagna.id)
      if (error) throw error
      setDeleteInfo(data)
    } catch (error) {
      console.error('Error loading delete info:', error)
    } finally {
      setIsLoadingDeleteInfo(false)
    }
  }

  const closeDeleteDialog = () => {
    if (isDeletingCampagna) return
    setIsDeleteDialogOpen(false)
    setCampagnaToDelete(null)
    setDeleteInfo(null)
    setDeleteProgress(null)
  }

  const confirmDelete = async () => {
    if (!campagnaToDelete) return

    setIsDeletingCampagna(true)
    setDeleteProgress({ phase: 'starting' })

    try {
      const { error } = await deleteCampagnaIndividuazione(
        campagnaToDelete.id,
        progress => setDeleteProgress(progress)
      )

      if (error) {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
        console.error('Error deleting campagna:', errorMessage)
        alert(`Errore durante l'eliminazione: ${errorMessage}`)
        return
      }

      updateCampagne(prev => prev.filter(c => c.id !== campagnaToDelete.id))
      setIsDeleteDialogOpen(false)
      setCampagnaToDelete(null)
      setDeleteInfo(null)
      setDeleteProgress(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
      console.error('Error deleting campagna:', errorMessage)
      alert(`Errore durante l'eliminazione: ${errorMessage}`)
    } finally {
      setIsDeletingCampagna(false)
      setDeleteProgress(null)
    }
  }

  return {
    isDeleteDialogOpen,
    campagnaToDelete,
    deleteInfo,
    isLoadingDeleteInfo,
    isDeletingCampagna,
    deleteProgress,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  }
}
