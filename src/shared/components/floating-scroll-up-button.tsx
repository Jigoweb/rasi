'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

interface FloatingScrollUpButtonProps {
  className?: string
  minScrollY?: number
}

export function FloatingScrollUpButton({
  className,
  minScrollY = 600,
}: FloatingScrollUpButtonProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let frame = 0

    const updateVisibility = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        const secondScrollThreshold = Math.max(minScrollY, window.innerHeight * 1.5)
        setVisible(window.scrollY > secondScrollThreshold)
        frame = 0
      })
    }

    updateVisibility()
    window.addEventListener('scroll', updateVisibility, { passive: true })
    window.addEventListener('resize', updateVisibility)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', updateVisibility)
      window.removeEventListener('resize', updateVisibility)
    }
  }, [minScrollY])

  if (!visible) return null

  return (
    <Button
      type="button"
      size="icon"
      className={cn('fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full shadow-lg', className)}
      aria-label="Torna all'inizio"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  )
}
