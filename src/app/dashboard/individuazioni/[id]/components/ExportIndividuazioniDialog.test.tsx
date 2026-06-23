import { render, screen } from '@testing-library/react'
import ExportIndividuazioniDialog from './ExportIndividuazioniDialog'

describe('ExportIndividuazioniDialog', () => {
  it('renders export format options when open', () => {
    render(
      <ExportIndividuazioniDialog
        campagna={{
          nome: 'Individuazione Rai',
          statistiche: { individuazioni_create: 12 },
        } as any}
        exportDialogOpen
        timeEstimateDialogOpen={false}
        selectedFormat={null}
        estimatedTime={null}
        onExportDialogOpenChange={jest.fn()}
        onTimeEstimateDialogOpenChange={jest.fn()}
        onFormatSelect={jest.fn()}
        onConfirmExport={jest.fn()}
      />
    )

    expect(screen.getByText('Esporta Individuazioni')).toBeInTheDocument()
    expect(screen.getByText('CSV')).toBeInTheDocument()
    expect(screen.getByText('Excel')).toBeInTheDocument()
    expect(screen.getByText(/12/)).toBeInTheDocument()
  })
})
