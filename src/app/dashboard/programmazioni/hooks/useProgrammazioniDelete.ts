import { useState, type Dispatch, type SetStateAction } from 'react'
import {
  deleteCampagnaProgrammazione,
  getDeleteCampagnaProgrammazioneInfo,
  type CampagnaProgrammazione,
  type DeleteCampagnaProgrammazioneInfo,
} from '@/features/programmazioni/services/programmazioni.service'

interface UseProgrammazioniDeleteOptions {
  updateCampagne: Dispatch<SetStateAction<CampagnaProgrammazione[]>>
}

export function useProgrammazioniDelete({ updateCampagne }: UseProgrammazioniDeleteOptions) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [campagnaToDelete, setCampagnaToDelete] = useState<CampagnaProgrammazione | null>(null)
  const [deleteInfo, setDeleteInfo] = useState<DeleteCampagnaProgrammazioneInfo | null>(null)
  const [isLoadingDeleteInfo, setIsLoadingDeleteInfo] = useState(false)
  const [isDeletingCampagna, setIsDeletingCampagna] = useState(false)

  const openDeleteDialog = async (campagna: CampagnaProgrammazione) => {
    setCampagnaToDelete(campagna)
    setIsDeleteDialogOpen(true)
    setIsLoadingDeleteInfo(true)
    setDeleteInfo(null)

    try {
      const { data, error } = await getDeleteCampagnaProgrammazioneInfo(campagna.id)
      if (error) throw error
      setDeleteInfo(data)
    } catch (error) {
      console.error('Error loading delete info:', error)
    } finally {
      setIsLoadingDeleteInfo(false)
    }
  }

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false)
    setCampagnaToDelete(null)
    setDeleteInfo(null)
  }

  const confirmDelete = async () => {
    if (!campagnaToDelete) return

    setIsDeletingCampagna(true)
    try {
      updateCampagne(prev => prev.map(c => (
        c.id === campagnaToDelete.id ? { ...c, stato: 'deleting' } : c
      )))

      const { error, blocked, blockReason } = await deleteCampagnaProgrammazione(campagnaToDelete.id)

      if (blocked) {
        alert(blockReason)
        updateCampagne(prev => prev.map(c => (
          c.id === campagnaToDelete.id ? { ...c, stato: 'error' } : c
        )))
        return
      }

      if (error) throw error

      updateCampagne(prev => prev.filter(c => c.id !== campagnaToDelete.id))
      closeDeleteDialog()
    } catch (error) {
      console.error('Error deleting campagna:', error)
      alert('Errore durante l\'eliminazione della campagna')
      updateCampagne(prev => prev.map(c => (
        c.id === campagnaToDelete.id ? { ...c, stato: 'error' } : c
      )))
    } finally {
      setIsDeletingCampagna(false)
    }
  }

  return {
    isDeleteDialogOpen,
    campagnaToDelete,
    deleteInfo,
    isLoadingDeleteInfo,
    isDeletingCampagna,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  }
}
