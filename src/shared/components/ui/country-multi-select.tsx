"use client"

import * as React from "react"
import { ChevronsUpDown, X, Search } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Badge } from "@/shared/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { Input } from "@/shared/components/ui/input"
import {
  CONTINENTI,
  getContinente,
  normalizeCodiciPaese,
  type Continente,
} from "@/shared/lib/paesi"

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

type Group = { key: Continente | "Altri"; options: CountryOption[] }

export function CountryMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Seleziona paesi...",
  disabled = false,
}: CountryMultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // JP e JPN sono lo stesso paese: si lavora sempre sui codici normalizzati.
  const normalizedSelected = React.useMemo(() => normalizeCodiciPaese(selected), [selected])
  const selectedSet = React.useMemo(() => new Set(normalizedSelected), [normalizedSelected])
  const optionByCode = React.useMemo(() => new Map(options.map((opt) => [opt.codice, opt])), [options])

  // Codici salvati che non sono nella lista ISO (es. EU, EUROPA): mostrati a
  // parte, così si possono vedere e togliere.
  const nonIsoSelected = React.useMemo(
    () => normalizedSelected.filter((codice) => !optionByCode.has(codice)),
    [normalizedSelected, optionByCode]
  )

  const emit = React.useCallback((next: string[]) => onChange(normalizeCodiciPaese(next)), [onChange])

  const handleToggle = React.useCallback((codice: string) => {
    emit(selectedSet.has(codice)
      ? normalizedSelected.filter((s) => s !== codice)
      : [...normalizedSelected, codice])
  }, [emit, normalizedSelected, selectedSet])

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options
    const query = searchQuery.toLowerCase()
    return options.filter(
      (opt) => opt.nome.toLowerCase().includes(query) || opt.codice.toLowerCase().includes(query)
    )
  }, [options, searchQuery])

  const groups = React.useMemo((): Group[] => {
    const byKey = new Map<Group["key"], CountryOption[]>()
    for (const opt of filteredOptions) {
      const key = getContinente(opt.codice) ?? "Altri"
      byKey.set(key, [...(byKey.get(key) ?? []), opt])
    }
    const order: Group["key"][] = [...CONTINENTI, "Altri"]
    return order
      .filter((key) => byKey.has(key))
      .map((key) => ({
        key,
        options: [...(byKey.get(key) ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, "it")),
      }))
  }, [filteredOptions])

  const toggleGroup = React.useCallback((group: Group) => {
    const codici = group.options.map((opt) => opt.codice)
    const allSelected = codici.every((codice) => selectedSet.has(codice))
    emit(allSelected
      ? normalizedSelected.filter((codice) => !codici.includes(codice))
      : [...normalizedSelected, ...codici])
  }, [emit, normalizedSelected, selectedSet])

  return (
    // modal: dentro un Dialog il Popover è in un portal e il blocco dello
    // scroll del Dialog intercettava la rotella del mouse.
    <Popover open={open} onOpenChange={setOpen} modal>
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
            {normalizedSelected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              normalizedSelected.map((codice) => {
                const isIso = optionByCode.has(codice)
                return (
                  <Badge
                    key={codice}
                    variant={isIso ? "secondary" : "outline"}
                    className={`mr-1 mb-1 ${isIso ? "" : "border-amber-400 text-amber-800"}`}
                    title={isIso ? optionByCode.get(codice)?.nome : "Codice non ISO"}
                  >
                    {codice}
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Rimuovi ${codice}`}
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer inline-flex items-center justify-center hover:bg-secondary/80 transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          e.stopPropagation()
                          handleToggle(codice)
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleToggle(codice)
                      }}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </span>
                  </Badge>
                )
              })
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
        <div
          className="max-h-[300px] overflow-y-auto overscroll-contain p-2"
          onWheel={(e) => e.stopPropagation()}
        >
          {nonIsoSelected.length > 0 && !searchQuery && (
            <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 p-2">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
                Codici non ISO
              </div>
              {nonIsoSelected.map((codice) => (
                <label key={codice} className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm cursor-pointer hover:bg-amber-100">
                  <Checkbox checked onCheckedChange={() => handleToggle(codice)} aria-label={`Rimuovi ${codice}`} />
                  <span>{codice}</span>
                  <span className="text-xs text-amber-800">non presente nella lista: togli la spunta per rimuoverlo</span>
                </label>
              ))}
            </div>
          )}

          {groups.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nessun paese trovato.
            </div>
          ) : (
            groups.map((group) => {
              const selectedInGroup = group.options.filter((opt) => selectedSet.has(opt.codice)).length
              const allSelected = selectedInGroup === group.options.length
              return (
                <div key={group.key} className="mb-2">
                  <label className="sticky top-0 z-10 flex items-center gap-2 rounded-sm bg-muted px-2 py-1.5 text-xs font-semibold uppercase tracking-wide cursor-pointer">
                    <Checkbox
                      checked={allSelected ? true : selectedInGroup > 0 ? "indeterminate" : false}
                      onCheckedChange={() => toggleGroup(group)}
                      aria-label={`Seleziona tutti i paesi: ${group.key}`}
                    />
                    <span className="flex-1">{group.key}</span>
                    <span className="font-normal normal-case text-muted-foreground">
                      {selectedInGroup}/{group.options.length}
                    </span>
                  </label>
                  {group.options.map((option) => {
                    const isSelected = selectedSet.has(option.codice)
                    return (
                      <div
                        key={option.codice}
                        className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                        onClick={() => handleToggle(option.codice)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggle(option.codice)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5"
                        />
                        <div className="flex-1 text-sm font-medium">
                          {option.nome} ({option.codice})
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
