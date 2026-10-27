import { getPostPasswordDestination } from './post-password-destination'

describe('getPostPasswordDestination', () => {
  it('sends artisti to the personal profile', () => {
    expect(getPostPasswordDestination('artista')).toBe('/dashboard/profilo')
  })

  it('sends operatori and admin to the operational dashboard', () => {
    expect(getPostPasswordDestination('operatore')).toBe('/dashboard')
    expect(getPostPasswordDestination('admin')).toBe('/dashboard')
  })

  it('treats missing or unknown roles as artista', () => {
    expect(getPostPasswordDestination(undefined)).toBe('/dashboard/profilo')
    expect(getPostPasswordDestination(null)).toBe('/dashboard/profilo')
    expect(getPostPasswordDestination('')).toBe('/dashboard/profilo')
    expect(getPostPasswordDestination('collecting')).toBe('/dashboard/profilo')
    expect(getPostPasswordDestination('superuser')).toBe('/dashboard/profilo')
  })
})
