'use client'

import { Badge } from '@/shared/components/ui/badge'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'

export type EditableImportField = {
  key: string
  label: string
}

export type EditableImportPreviewRow = {
  rowNumber: number
  status: 'valid' | 'skipped'
  message: string | null
  included: boolean
  values: Record<string, string>
}

type EditableImportPreviewProps = {
  fields: EditableImportField[]
  rows: EditableImportPreviewRow[]
  disabled?: boolean
  onValueChange?: (rowNumber: number, key: string, value: string) => void
  onIncludedChange?: (rowNumber: number, included: boolean) => void
}

export function EditableImportPreview({
  fields,
  rows,
  disabled = false,
  onValueChange,
  onIncludedChange,
}: EditableImportPreviewProps) {
  return (
    <div className="max-h-80 overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Includi</TableHead>
            <TableHead>Riga</TableHead>
            <TableHead>Esito</TableHead>
            {fields.map((field) => (
              <TableHead key={field.key}>{field.label}</TableHead>
            ))}
            <TableHead>Avviso</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const skipped = row.status === 'skipped'
            return (
              <TableRow
                key={row.rowNumber}
                className={skipped ? 'bg-amber-50 hover:bg-amber-50' : undefined}
              >
                <TableCell>
                  <Checkbox
                    checked={row.included}
                    disabled={disabled || skipped}
                    aria-label={`Includi riga ${row.rowNumber}`}
                    onCheckedChange={(checked) => onIncludedChange?.(row.rowNumber, checked === true)}
                  />
                </TableCell>
                <TableCell>{row.rowNumber}</TableCell>
                <TableCell>
                  <Badge variant={skipped ? 'outline' : 'secondary'}>
                    {skipped ? 'Ignorata' : 'Valida'}
                  </Badge>
                </TableCell>
                {fields.map((field) => (
                  <TableCell key={field.key}>
                    <Input
                      value={row.values[field.key] ?? ''}
                      disabled={disabled}
                      aria-label={`${field.label} riga ${row.rowNumber}`}
                      className="h-8 min-w-28"
                      onChange={(event) => onValueChange?.(row.rowNumber, field.key, event.target.value)}
                    />
                  </TableCell>
                ))}
                <TableCell className="min-w-56 text-sm text-amber-950">
                  {skipped ? row.message : null}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
