import { render, screen } from '@testing-library/react'
import UploadProgrammazioniDialog from './UploadProgrammazioniDialog'
import type { CampagnaProgrammazione } from '@/features/programmazioni/services/programmazioni.service'

const campagna: CampagnaProgrammazione = {
  id: 'campagna-1',
  emittente_id: 'emittente-1',
  anno: 2026,
  nome: 'Campagna Test',
  descrizione: null,
  stato: 'in_review',
  created_at: '2026-06-23T10:00:00.000Z',
  created_by: 'user-1',
  programmazioni_count: 10,
}

describe('UploadProgrammazioniDialog', () => {
  it('renders the upload step for an existing campaign', () => {
    render(
      <UploadProgrammazioniDialog
        open
        onOpenChange={jest.fn()}
        step={2}
        isResumingUpload
        detailsForm={<div />}
        selectedCampagna={campagna}
        selectedFile={null}
        fileInputRef={{ current: null }}
        onFileUpload={jest.fn()}
        isPreparingUpload={false}
        isUploading={false}
        parsedRowCount={0}
        headerError={null}
        uploadError={null}
        onDismissUploadError={jest.fn()}
        uploadProgress={{}}
        isUploadReady={false}
        onUploadDatabase={jest.fn()}
        onClose={jest.fn()}
      />
    )

    expect(screen.getAllByText('Caricamento Dati').length).toBeGreaterThan(0)
    expect(screen.getByText(/Carica il file per la campagna/)).toBeInTheDocument()
    expect(screen.getByText('Seleziona File')).toBeInTheDocument()
  })
})
