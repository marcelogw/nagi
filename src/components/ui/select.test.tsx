import { describe, expect, it } from 'vitest'
import { render, screen } from '@/test/render'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './select'

// Radix enforces invariants TypeScript cannot see (an item needs non-empty
// text, a trigger needs a value or a placeholder) — only rendering surfaces
// them, which is the whole reason this test exists.

function renderSelect() {
  return render(
    <Select defaultValue="market">
      <SelectTrigger aria-label="Category">
        <SelectValue placeholder="Choose a category" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Expenses</SelectLabel>
          <SelectItem value="market">Market</SelectItem>
          <SelectItem value="fuel">Fuel</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>,
  )
}

describe('Select', () => {
  it('renders a combobox carrying its selected value', () => {
    renderSelect()

    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveTextContent('Market')
  })

  it('opens to reveal its options', async () => {
    const { user } = renderSelect()

    await user.click(screen.getByRole('combobox', { name: 'Category' }))

    expect(screen.getByRole('option', { name: 'Fuel' })).toBeInTheDocument()
  })

  it('selects an option and closes', async () => {
    const { user } = renderSelect()

    await user.click(screen.getByRole('combobox', { name: 'Category' }))
    await user.click(screen.getByRole('option', { name: 'Fuel' }))

    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveTextContent('Fuel')
  })
})
