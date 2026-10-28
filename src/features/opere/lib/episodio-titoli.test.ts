import { episodeTitleLabel } from './episodio-titoli'

describe('episodeTitleLabel', () => {
  it('mostra italiano e originale quando sono diversi, come per i film', () => {
    expect(episodeTitleLabel({
      titolo_episodio: 'Il quinto oboe',
      titolo_episodio_originale: 'The Fifth Oboe',
    })).toBe('Il quinto oboe (The Fifth Oboe)')
  })

  it('non ripete il titolo se originale e italiano coincidono', () => {
    expect(episodeTitleLabel({
      titolo_episodio: 'Pilota',
      titolo_episodio_originale: 'Pilota',
    })).toBe('Pilota')
  })

  it('usa il solo originale se il titolo italiano manca', () => {
    expect(episodeTitleLabel({
      titolo_episodio: '  ',
      titolo_episodio_originale: 'Pilot',
    })).toBe('Pilot')
    expect(episodeTitleLabel(null)).toBe('')
  })
})
