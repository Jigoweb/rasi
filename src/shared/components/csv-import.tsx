'use client'

import { useState, useRef } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'

interface CSVImportProps {
  onImportComplete: () => void
}

interface ImportResult {
  success: number
  errors: string[]
  warnings: string[]
}

export default function CSVImport({ onImportComplete }: CSVImportProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      setResult(null)
    }
  }

  interface CSVRow {
  [key: string]: string;
}

const parseCSV = (csvText: string): CSVRow[] => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length === 0) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const data: CSVRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      if (values.length === headers.length) {
        const row: CSVRow = {}
        headers.forEach((header, index) => {
          row[header] = values[index]
        })
        data.push(row)
      }
    }

    return data
  }

  const validateRow = (row: CSVRow): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Campi obbligatori
    if (!row['Data'] && !row['data_trasmissione']) {
      errors.push('Data trasmissione mancante')
    }
    if (!row['Ora Inizio'] && !row['ora_inizio']) {
      errors.push('Ora inizio mancante')
    }
    if (!row['Titolo'] && !row['titolo_programmazione']) {
      errors.push('Titolo programmazione mancante')
    }

    // Validazione formato data
    const dataField = row['Data'] || row['data_trasmissione']
    if (dataField && !isValidDate(dataField)) {
      errors.push('Formato data non valido (usa DD/MM/YYYY o YYYY-MM-DD)')
    }

    // Validazione formato ora
    const oraField = row['Ora Inizio'] || row['ora_inizio']
    if (oraField && !isValidTime(oraField)) {
      errors.push('Formato ora non valido (usa HH:MM)')
    }

    return { isValid: errors.length === 0, errors }
  }

  const isValidDate = (dateStr: string): boolean => {
    const patterns = [
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
      /^\d{4}-\d{2}-\d{2}$/ // YYYY-MM-DD
    ]
    return patterns.some(pattern => pattern.test(dateStr))
  }

  const isValidTime = (timeStr: string): boolean => {
    const pattern = /^\d{2}:\d{2}$/
    return pattern.test(timeStr)
  }

  const formatDate = (dateStr: string): string => {
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/')
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    return dateStr
  }

  const mapRowToDatabase = (row: CSVRow): any => {
    return {
      data_trasmissione: formatDate(row['Data'] || row['data_trasmissione']),
      ora_inizio: row['Ora Inizio'] || row['ora_inizio'],
      ora_fine: row['Ora Fine'] || row['ora_fine'] || null,
      titolo_programmazione: row['Titolo'] || row['titolo_programmazione'],
      fascia_oraria: row['Fascia Oraria'] || row['fascia_oraria'] || null,
      tipo_trasmissione: row['Tipo Trasmissione'] || row['tipo_trasmissione'] || null,
      durata_minuti: row['Durata'] || row['durata_minuti'] ? parseInt(row['Durata'] || row['durata_minuti']) : null,
      emittente_id: null, // Da gestire separatamente
      descrizione: row['Descrizione'] || row['descrizione'] || null,
      processato: false
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setProgress(0)
    setResult(null)

    try {
      const text = await file.text()
      const rows = parseCSV(text)
      
      if (rows.length === 0) {
        setResult({ success: 0, errors: ['File CSV vuoto o formato non valido'], warnings: [] })
        return
      }

      const importResult: ImportResult = { success: 0, errors: [], warnings: [] }
      const validRows = []

      // Validazione
      for (let i = 0; i < rows.length; i++) {
        const { isValid, errors } = validateRow(rows[i])
        if (isValid) {
          validRows.push(mapRowToDatabase(rows[i]))
        } else {
          importResult.errors.push(`Riga ${i + 2}: ${errors.join(', ')}`)
        }
        setProgress(((i + 1) / rows.length) * 50)
      }

      // Inserimento nel database
      if (validRows.length > 0) {
        const { data, error } = await supabase
          .from('programmazioni')
          .insert(validRows as never)
          .select()

        if (error) {
          importResult.errors.push(`Errore database: ${error.message}`)
        } else {
          importResult.success = data?.length || 0
        }
      }

      setProgress(100)
      setResult(importResult)

      if (importResult.success > 0) {
        onImportComplete()
      }
    } catch (error) {
      setResult({ 
        success: 0, 
        errors: [`Errore durante l'importazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`], 
        warnings: [] 
      })
    } finally {
      setImporting(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setResult(null)
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    resetForm()
  }

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Importa CSV
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importa Programmazioni da CSV</DialogTitle>
            <DialogDescription>
              Carica un file CSV con le programmazioni da importare nel database
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="csv-file">File CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                ref={fileInputRef}
                disabled={importing}
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>

            {/* Format Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Formato CSV richiesto:</strong>
                  <br />
                  Le colonne devono essere: Data, Ora Inizio, Ora Fine, Titolo, Fascia Oraria, Tipo Trasmissione, Durata
                  <br />
                  <strong>Formati supportati:</strong> Data (DD/MM/YYYY o YYYY-MM-DD), Ora (HH:MM)
                </div>
              </div>
            </div>

            {/* Progress */}
            {importing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Importazione in corso...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {result.success > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {result.success} importate
                    </Badge>
                  )}
                  {result.errors.length > 0 && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      <XCircle className="h-3 w-3 mr-1" />
                      {result.errors.length} errori
                    </Badge>
                  )}
                </div>

                {result.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div className="text-sm text-red-800">
                        <strong>Errori:</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          {result.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Chiudi
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!file || importing}
              >
                {importing ? 'Importando...' : 'Importa'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}