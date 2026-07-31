// src/features/programmazioni/utils/bulk-import-naming.test.ts
import { suggestCampagnaNomeFromFilename } from './bulk-import-naming'

describe('suggestCampagnaNomeFromFilename', () => {
  it('strips extension, year, and common suffixes', () => {
    expect(suggestCampagnaNomeFromFilename('Sky Uno 2015 File grezzo.xlsx', 2015)).toBe('Sky Uno')
    expect(suggestCampagnaNomeFromFilename('SKY CINEMA ACTION_2020.xlsx', 2020)).toBe('SKY CINEMA ACTION')
    expect(suggestCampagnaNomeFromFilename('PRIMAFILA_2022.xlsx', 2022)).toBe('PRIMAFILA')
    expect(suggestCampagnaNomeFromFilename('Sky Atlantic_20180101_20181231.xlsx', 2018)).toBe('Sky Atlantic')
  })

  it('falls back to basename without extension when nothing left', () => {
    expect(suggestCampagnaNomeFromFilename('2015.xlsx', 2015)).toBe('2015')
  })
})
