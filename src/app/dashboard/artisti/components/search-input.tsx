'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/shared/components/ui/input'

interface SearchInputProps {
  onSearch: (value: string) => void
  initialValue?: string
}

export const SearchInput = ({ onSearch, initialValue = '' }: SearchInputProps) => {
  const [value, setValue] = useState(initialValue)

  // Update internal state if initialValue changes (e.g. on reset)
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value)
    }, 300)

    return () => clearTimeout(timer)
  }, [value, onSearch])

  return (
    <Input
      placeholder="Cerca per nome, cognome o codice artista..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="w-full"
    />
  )
}
