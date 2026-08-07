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
  it('renders a single header for an existing campaign upload', () => {
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

    expect(screen.getByText('Caricamento dati')).toBeInTheDocument()
    expect(screen.getByText(/Carica il file Excel o CSV per la campagna Campagna Test/)).toBeInTheDocument()
    expect(screen.getByText('Seleziona file')).toBeInTheDocument()
    expect(screen.queryByText('Campagna creata. Seleziona il file per continuare.')).not.toBeInTheDocument()
  })

  it('shows a compact success banner after creating a campaign', () => {
    render(
      <UploadProgrammazioniDialog
        open
        onOpenChange={jest.fn()}
        step={2}
        isResumingUpload={false}
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

    expect(screen.getByText('Caricamento dati')).toBeInTheDocument()
    expect(screen.getByText('Campagna creata. Seleziona il file per continuare.')).toBeInTheDocument()
    expect(screen.queryByText('Campagna creata con successo!')).not.toBeInTheDocument()
  })
})
