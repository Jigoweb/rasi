"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Badge } from "@/shared/components/ui/badge"

export interface MultiSelectOption {
  value: string
  label: string
  description?: string
  category?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  maxCount?: number
  groupByCategory?: boolean
  disabled?: boolean
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Seleziona opzioni...",
  className,
  maxCount,
  groupByCategory = false,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)

  const handleUnselect = (value: string) => {
    onChange(selected.filter((s) => s !== value))
  }

  const handleToggle = React.useCallback((value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((s) => s !== value)
      : maxCount && selected.length >= maxCount
      ? selected
      : [...selected, value]
    
    if (JSON.stringify(newSelected) !== JSON.stringify(selected)) {
      onChange(newSelected)
    }
  }, [selected, onChange, maxCount])

  const selectedOptions = options.filter((opt) => selected.includes(opt.value))

  // Group options by category if needed
  const groupedOptions = groupByCategory
    ? options.reduce((acc, opt) => {
        const category = opt.category || "Altro"
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(opt)
        return acc
      }, {} as Record<string, MultiSelectOption[]>)
    : null

  // Gestisci click fuori per chiudere
  React.useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        contentRef.current &&
        triggerRef.current &&
        !contentRef.current.contains(target) &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }

    // Usa un piccolo delay per evitare che il click che apre chiuda immediatamente
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside, true)
    }
  }, [open])

  // Calcola posizione del dropdown
  const [position, setPosition] = React.useState<{ top: number; left: number; width: number } | null>(null)

  const updatePosition = React.useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const dropdownHeight = 400 // maxHeight del dropdown
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      
      // Se c'è spazio sotto, mostra sotto; altrimenti mostra sopra
      const shouldShowAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow
      
      setPosition({
        top: shouldShowAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [])

  React.useEffect(() => {
    if (open) {
      // Calcola la posizione immediatamente quando si apre con un piccolo delay per assicurarsi che il DOM sia aggiornato
      const timer = setTimeout(() => {
        updatePosition()
      }, 0)
      
      const handleScroll = () => updatePosition()
      const handleResize = () => updatePosition()
      
      window.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleResize)
      
      return () => {
        clearTimeout(timer)
        window.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', handleResize)
      }
    } else {
      setPosition(null)
    }
  }, [open, updatePosition])

  return (
    <div className="relative w-full">
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onMouseDown={(e) => {
          if (!disabled) {
            e.preventDefault()
            e.stopPropagation()
            setOpen((prev) => !prev)
          }
        }}
        disabled={disabled}
        className={cn(
          "w-full justify-between min-h-10 h-auto",
          className
        )}
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map((option) => (
              <Badge
                key={option.value}
                variant="secondary"
                className="mr-1 mb-1 pr-1"
              >
                {option.label}
                <span
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer inline-flex items-center justify-center hover:bg-secondary/80 transition-colors"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      e.stopPropagation()
                      handleUnselect(option.value)
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleUnselect(option.value)
                  }}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </span>
              </Badge>
            ))
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {open && !disabled && typeof window !== 'undefined' && (position || triggerRef.current) ? createPortal(
        <div
          ref={contentRef}
          className="fixed z-[9999] rounded-md border bg-popover text-popover-foreground shadow-lg flex flex-col"
          style={position ? {
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
            maxHeight: '400px',
          } : triggerRef.current ? {
            top: `${triggerRef.current.getBoundingClientRect().bottom + 4}px`,
            left: `${triggerRef.current.getBoundingClientRect().left}px`,
            width: `${triggerRef.current.getBoundingClientRect().width}px`,
            maxHeight: '400px',
          } : {
            display: 'none'
          }}
        >
          <div 
            className="overflow-y-auto overflow-x-hidden flex-1 p-2"
            style={{ 
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {groupByCategory && groupedOptions ? (
              Object.entries(groupedOptions).map(([category, opts]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground sticky top-0 bg-popover z-10 mb-2 border-b">
                    {category}
                  </div>
                  {opts.map((option) => {
                    const isSelected = selected.includes(option.value)
                    return (
                      <div
                        key={option.value}
                        className="flex items-start space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggle(option.value)
                        }}
                      >
                        <div
                          className="mt-0.5"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggle(option.value)
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked !== isSelected) {
                                handleToggle(option.value)
                              }
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium break-words">{option.label}</div>
                          {option.description && (
                            <div className="text-xs text-muted-foreground mt-0.5 break-words">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            ) : (
              options.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <div
                    key={option.value}
                    className="flex items-start space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggle(option.value)
                    }}
                  >
                    <div
                      className="mt-0.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggle(option.value)
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked !== isSelected) {
                            handleToggle(option.value)
                          }
                        }}
                      />
                    </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium break-words">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 break-words">
                        {option.description}
                      </div>
                    )}
                  </div>
                </div>
                )
              })
            )}
          </div>
          {maxCount && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-t flex-shrink-0">
              {selected.length} / {maxCount} selezionati
            </div>
          )}
        </div>,
        document.body
      ) : null}
    </div>
  )
}

