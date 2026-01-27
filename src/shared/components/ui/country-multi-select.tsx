"use client"

import * as React from "react"
import { ChevronsUpDown, X, Search } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Badge } from "@/shared/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { Input } from "@/shared/components/ui/input"

export interface CountryOption {
  codice: string
  nome: string
}

interface CountryMultiSelectProps {
  options: CountryOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  disabled?: boolean
}

export function CountryMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Seleziona paesi...",
  disabled = false,
}: CountryMultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const handleToggle = React.useCallback((codice: string) => {
    const newSelected = selected.includes(codice)
      ? selected.filter((s) => s !== codice)
      : [...selected, codice]
    onChange(newSelected)
  }, [selected, onChange])

  const selectedOptions = options.filter((opt) => selected.includes(opt.codice))

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options
    const query = searchQuery.toLowerCase()
    return options.filter(
      (opt) =>
        opt.nome.toLowerCase().includes(query) ||
        opt.codice.toLowerCase().includes(query)
    )
  }, [options, searchQuery])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between min-h-10 h-auto"
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedOptions.map((option) => (
                <Badge
                  key={option.codice}
                  variant="secondary"
                  className="mr-1 mb-1"
                >
                  {option.codice}
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer inline-flex items-center justify-center hover:bg-secondary/80 transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        e.stopPropagation()
                        handleToggle(option.codice)
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleToggle(option.codice)
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </span>
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca paese..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nessun paese trovato.
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selected.includes(option.codice)
              return (
                <div
                  key={option.codice}
                  className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                  onClick={() => handleToggle(option.codice)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(option.codice)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {option.nome} ({option.codice})
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

