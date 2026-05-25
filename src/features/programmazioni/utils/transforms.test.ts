// Jest globals — project uses Jest, not Vitest as plan suggested
import { applyTransform, TRANSFORMS } from './transforms'

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

describe('TRANSFORMS registry', () => {
  it('contains all named transforms', () => {
    const expected = [
      'hhmmss_to_minutes', 'seconds_to_minutes',
      'fractional_hours_to_minutes', 'fractional_day_to_minutes',
      'milliseconds_to_minutes', 'iso8601_duration_to_minutes',
      'decimal_minutes_to_int', 'rti_apostrophe_minutes',
      'null_if_NA', 'null_if_ND', 'null_if_NULL_str',
      'netflix_episode_nbr', 'us_date_to_iso', 'yyyymmdd_int_to_iso',
    ]
    for (const name of expected) {
      expect(TRANSFORMS).toHaveProperty(name)
    }
  })

  it('applyTransform returns the value when transform name is null', () => {
    expect(applyTransform(null, 'foo')).toBe('foo')
  })

  it('applyTransform throws for unknown transform', () => {
    expect(() => applyTransform('unknown_xyz' as any, 1)).toThrow(/unknown/i)
  })
})
