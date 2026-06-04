// Jest globals — project uses Jest, not Vitest as plan suggested
import { applyTransform, isKnownTransform, TRANSFORMS, TRANSFORM_LABELS, transformsForField, suggestDateTransform, isDateTargetField } from './transforms'

describe('hhmmss_to_minutes', () => {
  it('converts HH:MM:SS to minutes (rounded)', () => {
    expect(applyTransform('hhmmss_to_minutes', '02:52:16')).toBe(172)
    expect(applyTransform('hhmmss_to_minutes', '00:21:56')).toBe(22)
    expect(applyTransform('hhmmss_to_minutes', '01:04:51')).toBe(65)
  })
  it('returns null for invalid input', () => {
    expect(applyTransform('hhmmss_to_minutes', 'invalid')).toBeNull()
    expect(applyTransform('hhmmss_to_minutes', null)).toBeNull()
    expect(applyTransform('hhmmss_to_minutes', '')).toBeNull()
  })
})

describe('seconds_to_minutes', () => {
  it('converts integer seconds to minutes (rounded)', () => {
    expect(applyTransform('seconds_to_minutes', 5670)).toBe(95)
    expect(applyTransform('seconds_to_minutes', '6480')).toBe(108)
    expect(applyTransform('seconds_to_minutes', 2400)).toBe(40)
  })
  it('returns null for non-numeric', () => {
    expect(applyTransform('seconds_to_minutes', 'foo')).toBeNull()
  })
})

describe('fractional_hours_to_minutes', () => {
  it('LA7 case: 0.454h → 27 min', () => {
    expect(applyTransform('fractional_hours_to_minutes', 0.454)).toBe(27)
  })
})

describe('fractional_day_to_minutes', () => {
  it('CHILI TVOD case: 0.0743 → 107 min', () => {
    expect(applyTransform('fractional_day_to_minutes', 0.07430555555555556)).toBe(107)
  })
})

describe('milliseconds_to_minutes', () => {
  it('Apple TVOD case: 6014000 ms → 100 min', () => {
    expect(applyTransform('milliseconds_to_minutes', 6014000)).toBe(100)
  })
})

describe('iso8601_duration_to_minutes', () => {
  it('PT0H22M0S → 22', () => {
    expect(applyTransform('iso8601_duration_to_minutes', 'PT0H22M0S')).toBe(22)
  })
  it('PT1H30M → 90', () => {
    expect(applyTransform('iso8601_duration_to_minutes', 'PT1H30M')).toBe(90)
  })
})

describe('decimal_minutes_to_int', () => {
  it('Viacom case: 21.683 → 22', () => {
    expect(applyTransform('decimal_minutes_to_int', 21.683333333333334)).toBe(22)
  })
  it('Netflix case: 89.3 → 89', () => {
    expect(applyTransform('decimal_minutes_to_int', '89.3')).toBe(89)
  })
})

describe('rti_apostrophe_minutes', () => {
  it("strips trailing apostrophe: 128' → 128", () => {
    expect(applyTransform('rti_apostrophe_minutes', "128'")).toBe(128)
  })
})

describe('null_if_NA / null_if_ND / null_if_NULL_str', () => {
  it("NA returns null", () => {
    expect(applyTransform('null_if_NA', 'N/A')).toBeNull()
    expect(applyTransform('null_if_NA', 'Real Value')).toBe('Real Value')
  })
  it("ND returns null", () => {
    expect(applyTransform('null_if_ND', 'N.D.')).toBeNull()
    expect(applyTransform('null_if_ND', 'N.D')).toBeNull()
  })
  it("NULL string returns null", () => {
    expect(applyTransform('null_if_NULL_str', 'NULL')).toBeNull()
    expect(applyTransform('null_if_NULL_str', 'real')).toBe('real')
  })
})

describe('netflix_episode_nbr', () => {
  it("'--' → null", () => {
    expect(applyTransform('netflix_episode_nbr', '--')).toBeNull()
  })
  it('number string → int', () => {
    expect(applyTransform('netflix_episode_nbr', '5')).toBe(5)
  })
})

describe('us_date_to_iso', () => {
  it('MM/DD/YYYY → YYYY-MM-DD', () => {
    expect(applyTransform('us_date_to_iso', '12/31/2024')).toBe('2024-12-31')
  })
})

describe('yyyymmdd_int_to_iso', () => {
  it('20231231 → 2023-12-31', () => {
    expect(applyTransform('yyyymmdd_int_to_iso', 20231231)).toBe('2023-12-31')
  })
})

describe('isKnownTransform', () => {
  it('true per nomi noti, false altrimenti', () => {
    expect(isKnownTransform('us_date_to_iso')).toBe(true)
    expect(isKnownTransform('bogus')).toBe(false)
    expect(isKnownTransform(null)).toBe(false)
    expect(isKnownTransform(undefined)).toBe(false)
  })
})

describe('TRANSFORMS registry', () => {
  it('contains all named transforms', () => {
    // Every key in TRANSFORMS must be a callable function (catches accidental deletions)
    for (const [key, fn] of Object.entries(TRANSFORMS)) {
      expect(typeof fn).toBe('function')
    }

    // Explicitly assert both pre-existing and new date-transform keys are present
    const requiredKeys = [
      // pre-existing
      'us_date_to_iso',
      'yyyymmdd_int_to_iso',
      // new (Task 1)
      'eu_date_to_iso',
      'iso_date',
      'eu_date_short',
      'us_date_short',
      'excel_serial_to_iso',
    ]
    for (const name of requiredKeys) {
      expect(TRANSFORMS).toHaveProperty(name)
      expect(typeof TRANSFORMS[name as keyof typeof TRANSFORMS]).toBe('function')
    }
  })

  it('applyTransform returns the value when transform name is null', () => {
    expect(applyTransform(null, 'foo')).toBe('foo')
  })

  it('applyTransform throws for unknown transform', () => {
    expect(() => applyTransform('unknown_xyz' as any, 1)).toThrow(/unknown/i)
  })
})

describe('mojibake_repair', () => {
  it('repairs cp1252-as-utf8 mojibake (Italian è/é/ì)', () => {
    expect(applyTransform('mojibake_repair', 'BaarÃ¬a')).toBe('Baarìa')
    expect(applyTransform('mojibake_repair', "Une robe d'Ã©tÃ©")).toBe("Une robe d'été")
    expect(applyTransform('mojibake_repair', 'La scuola Ã¨ finita')).toBe('La scuola è finita')
  })
  it('repairs em/en-dash mojibake', () => {
    expect(applyTransform('mojibake_repair', 'Maze Runner â€" La rivelazione'))
      .toBe('Maze Runner – La rivelazione')
  })
  it('leaves clean strings untouched', () => {
    expect(applyTransform('mojibake_repair', 'Baarìa')).toBe('Baarìa')
    expect(applyTransform('mojibake_repair', 'House Of The Dragon')).toBe('House Of The Dragon')
  })
  it('leaves Ã not followed by mojibake bigram alone', () => {
    expect(applyTransform('mojibake_repair', 'BÃCH (Vietnamese surname)'))
      .toBe('BÃCH (Vietnamese surname)')
  })
  it('handles null/empty/non-string', () => {
    expect(applyTransform('mojibake_repair', null)).toBe(null)
    expect(applyTransform('mojibake_repair', undefined)).toBe(undefined)
    expect(applyTransform('mojibake_repair', '')).toBe('')
    expect(applyTransform('mojibake_repair', 123)).toBe(123)
  })
})

describe('nbsp_to_space', () => {
  it('replaces NBSP with regular space', () => {
    expect(applyTransform('nbsp_to_space', 'foo\xa0bar')).toBe('foo bar')
    expect(applyTransform('nbsp_to_space', 'a\xa0\xa0b')).toBe('a  b')
  })
  it('passes plain strings through', () => {
    expect(applyTransform('nbsp_to_space', 'foo bar')).toBe('foo bar')
  })
  it('handles null/empty/non-string', () => {
    expect(applyTransform('nbsp_to_space', null)).toBe(null)
    expect(applyTransform('nbsp_to_space', undefined)).toBe(undefined)
    expect(applyTransform('nbsp_to_space', '')).toBe('')
    expect(applyTransform('nbsp_to_space', 123)).toBe(123)
  })
})

describe('null_if_dashes', () => {
  it('returns null for double-dash or single-dash placeholder', () => {
    expect(applyTransform('null_if_dashes', '--')).toBe(null)
    expect(applyTransform('null_if_dashes', '-')).toBe(null)
    expect(applyTransform('null_if_dashes', ' -- ')).toBe(null)
    expect(applyTransform('null_if_dashes', ' - ')).toBe(null)
  })
  it('preserves real values with dashes', () => {
    expect(applyTransform('null_if_dashes', '12-34')).toBe('12-34')
    expect(applyTransform('null_if_dashes', 'foo')).toBe('foo')
    expect(applyTransform('null_if_dashes', '---')).toBe('---')  // triple dash is not the sentinel
  })
  it('handles null/empty', () => {
    expect(applyTransform('null_if_dashes', null)).toBe(null)
    expect(applyTransform('null_if_dashes', undefined)).toBe(undefined)
  })
})

describe('year_range_first', () => {
  it('extracts first year from range', () => {
    expect(applyTransform('year_range_first', '1976-1980')).toBe(1976)
    expect(applyTransform('year_range_first', '2010 - 2015')).toBe(2010)
  })
  it('passes single year through as number', () => {
    expect(applyTransform('year_range_first', '2024')).toBe(2024)
    expect(applyTransform('year_range_first', 2024)).toBe(2024)
  })
  it('returns null for unparseable / placeholder', () => {
    expect(applyTransform('year_range_first', 'nan')).toBe(null)
    expect(applyTransform('year_range_first', '')).toBe(null)
    expect(applyTransform('year_range_first', null)).toBe(null)
    expect(applyTransform('year_range_first', undefined)).toBe(null)
  })
})

describe('date transforms', () => {
  it('eu_date_to_iso: DD/MM/YYYY → YYYY-MM-DD', () => {
    expect(applyTransform('eu_date_to_iso', '31/12/2025')).toBe('2025-12-31')
    expect(applyTransform('eu_date_to_iso', '5/3/2025')).toBe('2025-03-05')
    expect(applyTransform('eu_date_to_iso', '31-12-2025')).toBe('2025-12-31')
    expect(applyTransform('eu_date_to_iso', '12/31/2025')).toBe('2025-31-12') // input EU letterale: nessuna validazione semantica qui
    expect(applyTransform('eu_date_to_iso', 'boh')).toBe(null)
    expect(applyTransform('eu_date_to_iso', '')).toBe(null)
  })

  it('iso_date: passthrough/normalizzazione', () => {
    expect(applyTransform('iso_date', '2025-12-31')).toBe('2025-12-31')
    expect(applyTransform('iso_date', '2025/12/31')).toBe('2025-12-31')
    expect(applyTransform('iso_date', '2025-1-3')).toBe(null) // richiede 2 cifre
    expect(applyTransform('iso_date', 'x')).toBe(null)
  })

  it('eu_date_short: anno 2 cifre con cutoff 50', () => {
    expect(applyTransform('eu_date_short', '31/12/25')).toBe('2025-12-31')
    expect(applyTransform('eu_date_short', '01/06/49')).toBe('2049-06-01')
    expect(applyTransform('eu_date_short', '01/06/51')).toBe('1951-06-01')
    expect(applyTransform('eu_date_short', 'no')).toBe(null)
  })

  it('us_date_short: MM/DD/YY con cutoff 50', () => {
    expect(applyTransform('us_date_short', '12/31/25')).toBe('2025-12-31')
    expect(applyTransform('us_date_short', '06/01/51')).toBe('1951-06-01')
    expect(applyTransform('us_date_short', 'no')).toBe(null)
  })

  it('excel_serial_to_iso: seriale Excel (base 1899-12-30)', () => {
    expect(applyTransform('excel_serial_to_iso', 44197)).toBe('2021-01-01')
    expect(applyTransform('excel_serial_to_iso', '44197')).toBe('2021-01-01')
    expect(applyTransform('excel_serial_to_iso', 0)).toBe(null)
    expect(applyTransform('excel_serial_to_iso', 'x')).toBe(null)
  })

  it('returns null for null/undefined on all 5 new date transforms', () => {
    const newTransforms = [
      'eu_date_to_iso',
      'iso_date',
      'eu_date_short',
      'us_date_short',
      'excel_serial_to_iso',
    ] as const
    for (const name of newTransforms) {
      expect(applyTransform(name, null)).toBeNull()
      expect(applyTransform(name, undefined)).toBeNull()
    }
  })
})

describe('isDateTargetField', () => {
  it('riconosce i campi data', () => {
    expect(isDateTargetField('data_trasmissione')).toBe(true)
    expect(isDateTargetField('data_inizio')).toBe(true)
    expect(isDateTargetField('data_fine')).toBe(true)
    expect(isDateTargetField('titolo')).toBe(false)
    expect(isDateTargetField('')).toBe(false)
  })
})

describe('suggestDateTransform', () => {
  it('rileva US quando il 2º campo > 12', () => {
    expect(suggestDateTransform('12/31/2025')).toBe('us_date_to_iso')
  })
  it('rileva EU quando il 1º campo > 12', () => {
    expect(suggestDateTransform('31/12/2025')).toBe('eu_date_to_iso')
  })
  it('rileva ISO', () => {
    expect(suggestDateTransform('2025-12-31')).toBe('iso_date')
  })
  it('rileva seriale Excel', () => {
    expect(suggestDateTransform('45657')).toBe('excel_serial_to_iso')
  })
  it('ambiguo (entrambi <= 12) → null', () => {
    expect(suggestDateTransform('03/04/2025')).toBe(null)
  })
  it('vuoto/non data → null', () => {
    expect(suggestDateTransform('')).toBe(null)
    expect(suggestDateTransform('ciao')).toBe(null)
  })
})

describe('transform metadata', () => {
  it('TRANSFORM_LABELS copre ogni TransformName', () => {
    for (const name of Object.keys(TRANSFORMS)) {
      expect(TRANSFORM_LABELS[name as keyof typeof TRANSFORM_LABELS]).toBeTruthy()
    }
  })

  it('transformsForField: campi data → transform data', () => {
    const t = transformsForField('data_trasmissione')
    expect(t).toContain('us_date_to_iso')
    expect(t).toContain('eu_date_to_iso')
    expect(t).toContain('excel_serial_to_iso')
    expect(t).not.toContain('hhmmss_to_minutes')
  })

  it('transformsForField: durata → transform durata', () => {
    const t = transformsForField('durata_minuti')
    expect(t).toContain('hhmmss_to_minutes')
    expect(t).not.toContain('us_date_to_iso')
  })

  it('transformsForField: campo senza transform dedicati → solo generici', () => {
    const t = transformsForField('titolo')
    expect(t).toContain('null_if_NULL_str')
    expect(t).not.toContain('us_date_to_iso')
  })
})
