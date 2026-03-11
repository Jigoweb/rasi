'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/shared/components/ui/input'
import { Search, X } from 'lucide-react'

interface SearchInputProps {
  onSearch: (value: string) => void
  initialValue?: string
  placeholder?: string
}

/** Input con stato locale per digitazione fluida; onSearch viene chiamato con debounce 150ms */
export const SearchInput = ({ onSearch, initialValue = '', placeholder = 'Cerca...' }: SearchInputProps) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timer = setTimeout(() => onSearch(value), 150)
    return () => clearTimeout(timer)
  }, [value, onSearch])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-10 pr-10"
      />
      {value && (
        <button
          type="button"
          onClick={() => { setValue(''); onSearch('') }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Cancella ricerca"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
