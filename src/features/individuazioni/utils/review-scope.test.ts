import {
  getDefaultScopeChoice,
  getScopeChoiceCount,
  getStatusActionLabel,
  toggleRuoloSelection,
  toReviewScope,
  type ReviewScopeChoice,
} from './review-scope'

describe('review-scope helpers', () => {
  const counts = {
    single: 1,
    opera: 12,
    artistaOpera: 5,
    ruoli: [
      { ruoloId: 'r1', ruoloNome: 'Attore', count: 3 },
      { ruoloId: 'r2', ruoloNome: 'Doppiatore', count: 2 },
    ],
  }

  it('picks opera as default when multiple rows exist on the same opera', () => {
    expect(getDefaultScopeChoice(counts)).toEqual({ kind: 'opera' })
  })

  it('counts selected ruoli correctly', () => {
    const choice: ReviewScopeChoice = { kind: 'artista_opera_ruoli', ruoloIds: ['r1'] }
    expect(getScopeChoiceCount(choice, counts)).toBe(3)
  })

  it('maps scope choices to service scopes', () => {
    expect(toReviewScope({ kind: 'opera' })).toEqual({ type: 'opera' })
    expect(toReviewScope({ kind: 'artista_opera_ruoli', ruoloIds: ['r1', 'r2'] })).toEqual({
      type: 'artista_opera_ruoli',
      ruoloIds: ['r1', 'r2'],
    })
  })

  it('toggles ruolo selection', () => {
    expect(toggleRuoloSelection(['r1'], 'r2', true)).toEqual(['r1', 'r2'])
    expect(toggleRuoloSelection(['r1', 'r2'], 'r1', false)).toEqual(['r2'])
  })

  it('labels status actions in Italian', () => {
    expect(getStatusActionLabel('validato')).toBe('Validare')
    expect(getStatusActionLabel('respinto')).toBe('Respingere')
  })
})
