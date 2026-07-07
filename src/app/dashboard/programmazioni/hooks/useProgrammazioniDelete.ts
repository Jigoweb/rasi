import { useState, type Dispatch, type SetStateAction } from 'react'
import {
  deleteCampagnaProgrammazione,
  getDeleteCampagnaProgrammazioneInfo,
  type CampagnaProgrammazione,
  type DeleteCampagnaProgrammazioneInfo,
} from '@/features/programmazioni/services/programmazioni.service'
import { notifyError, notifySuccess } from '@/shared/lib/toast'

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
      notifyError('Impossibile caricare i dettagli di eliminazione', error)
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
        notifyError('Eliminazione bloccata', blockReason)
        updateCampagne(prev => prev.map(c => (
          c.id === campagnaToDelete.id ? { ...c, stato: 'error' } : c
        )))
        return
      }

      if (error) throw error

      updateCampagne(prev => prev.filter(c => c.id !== campagnaToDelete.id))
      closeDeleteDialog()
      notifySuccess('Campagna eliminata')
    } catch (error) {
      console.error('Error deleting campagna:', error)
      notifyError('Eliminazione campagna non riuscita', error)
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
