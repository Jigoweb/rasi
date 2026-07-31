// src/features/programmazioni/utils/bulk-import-naming.test.ts
import { suggestCampagnaNomeFromFilename } from './bulk-import-naming'

describe('suggestCampagnaNomeFromFilename', () => {
  it('strips extension and noise then appends the reference year', () => {
    expect(suggestCampagnaNomeFromFilename('Sky Uno 2015 File grezzo.xlsx', 2015)).toBe('Sky Uno 2015')
    expect(suggestCampagnaNomeFromFilename('SKY CINEMA ACTION_2020.xlsx', 2020)).toBe('SKY CINEMA ACTION 2020')
    expect(suggestCampagnaNomeFromFilename('PRIMAFILA_2022.xlsx', 2022)).toBe('PRIMAFILA 2022')
    expect(suggestCampagnaNomeFromFilename('Sky Atlantic_20180101_20181231.xlsx', 2018)).toBe('Sky Atlantic 2018')
  })

  it('does not duplicate the year when the basename is only the year', () => {
    expect(suggestCampagnaNomeFromFilename('2015.xlsx', 2015)).toBe('2015')
  })

  it('does not duplicate the year when it already ends with the reference year', () => {
    expect(suggestCampagnaNomeFromFilename('Cielo 2016.xlsx', 2016)).toBe('Cielo 2016')
  })
})
