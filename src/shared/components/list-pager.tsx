import { Button } from '@/shared/components/ui/button'

export function ListPager({
  page,
  pageSize,
  total,
  onPageChange,
  disabled = false,
  label,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  disabled?: boolean
  label: string
}) {
  if (total <= pageSize) return null
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(page, 1), pages)
  const from = (safePage - 1) * pageSize + 1
  const to = Math.min(total, safePage * pageSize)
  const format = (value: number) => value.toLocaleString('it-IT')

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" aria-label={label}>
      <p className="text-sm text-muted-foreground">
        {format(from)}–{format(to)} di {format(total)}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Precedente
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || safePage >= pages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Successiva
        </Button>
      </div>
    </div>
  )
}
