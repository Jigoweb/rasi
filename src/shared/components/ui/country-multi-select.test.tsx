import { fireEvent, render, screen } from '@testing-library/react'
import { CountryMultiSelect } from './country-multi-select'

const options = [
  { codice: 'ITA', nome: 'Italia' },
  { codice: 'FRA', nome: 'Francia' },
  { codice: 'JPN', nome: 'Giappone' },
]

describe('CountryMultiSelect', () => {
  it('normalizza JP in JPN e permette di rimuovere un codice non ISO', () => {
    const onChange = jest.fn()
    render(<CountryMultiSelect options={options} selected={['EU', 'JP', 'JPN']} onChange={onChange} />)

    // JP e JPN sono lo stesso paese: un solo badge
    expect(screen.getAllByText('JPN')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi EU' }))
    expect(onChange).toHaveBeenLastCalledWith(['JPN'])
  })

  it('seleziona tutti i paesi di un continente', () => {
    const onChange = jest.fn()
    render(<CountryMultiSelect options={options} selected={['JPN']} onChange={onChange} />)

    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleziona tutti i paesi: Europa' }))

    expect(onChange).toHaveBeenLastCalledWith(['JPN', 'FRA', 'ITA'])
  })
})
