import { AlertCircle, Inbox, Loader2, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'

type PageStateShellProps = {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

function PageStateShell({ icon, title, description, action, className }: PageStateShellProps) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center px-6 py-10 text-center">
        <div className="mb-4 rounded-full bg-muted p-3 text-muted-foreground">{icon}</div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
        {action && <div className="mt-5">{action}</div>}
      </CardContent>
    </Card>
  )
}

type PageLoadingStateProps = {
  title?: string
  description?: string
  className?: string
}

export function PageLoadingState({
  title = 'Caricamento in corso',
  description = 'Stiamo recuperando i dati aggiornati.',
  className,
}: PageLoadingStateProps) {
  return (
    <PageStateShell
      className={className}
      icon={<Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />}
      title={title}
      description={description}
    />
  )
}

type PageErrorStateProps = {
  title?: string
  description: string
  retryLabel?: string
  onRetry?: () => void
  className?: string
}

export function PageErrorState({
  title = 'Non siamo riusciti a caricare i dati',
  description,
  retryLabel = 'Riprova',
  onRetry,
  className,
}: PageErrorStateProps) {
  return (
    <PageStateShell
      className={cn('border-destructive/30 bg-destructive/5', className)}
      icon={<AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />}
      title={title}
      description={description}
      action={
        onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            {retryLabel}
          </Button>
        ) : undefined
      }
    />
  )
}

type EmptyStateProps = {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({ title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <PageStateShell
      className={className}
      icon={<Inbox className="h-6 w-6" aria-hidden="true" />}
      title={title}
      description={description}
      action={
        actionLabel && onAction ? (
          <Button type="button" variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : undefined
      }
    />
  )
}
