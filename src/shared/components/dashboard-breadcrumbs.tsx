import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

export type DashboardBreadcrumbItem = {
  label: string
  href?: string
}

type DashboardBreadcrumbsProps = {
  items: DashboardBreadcrumbItem[]
  className?: string
}

export function DashboardBreadcrumbs({ items, className }: DashboardBreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Percorso" className={cn('text-sm text-muted-foreground', className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-foreground hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'font-medium text-foreground' : undefined} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
