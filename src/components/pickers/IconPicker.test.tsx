import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/render'
import { IconPicker } from './IconPicker'

const ICONS = ['tag', 'shopping-cart', 'car']

function renderPicker(value = 'tag', onChange = vi.fn()) {
  return {
    onChange,
    ...render(
      <IconPicker
        iconNames={ICONS}
        value={value}
        onChange={onChange}
        label="Icon"
        searchPlaceholder="Search icon…"
        emptyMessage="No icon found."
      />,
    ),
  }
}

describe('IconPicker', () => {
  it('renders one button per icon', () => {
    renderPicker()

    expect(screen.getAllByRole('button')).toHaveLength(ICONS.length)
  })

  it('marks the selected icon as pressed', () => {
    renderPicker('shopping-cart')

    expect(screen.getByRole('button', { name: 'shopping-cart' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('reports the clicked icon', async () => {
    const { onChange, user } = renderPicker()

    await user.click(screen.getByRole('button', { name: 'car' }))

    expect(onChange).toHaveBeenCalledWith('car')
  })

  it('filters by the search query', async () => {
    const { user } = renderPicker()

    await user.type(screen.getByRole('textbox', { name: 'Icon' }), 'cart')

    expect(screen.getByRole('button', { name: 'shopping-cart' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'car' })).not.toBeInTheDocument()
  })

  it('shows the empty message when nothing matches', async () => {
    const { user } = renderPicker()

    await user.type(screen.getByRole('textbox', { name: 'Icon' }), 'zzz')

    expect(screen.getByText('No icon found.')).toBeInTheDocument()
  })

  it('drops a name lucide-react cannot resolve instead of rendering an empty slot', () => {
    render(
      <IconPicker
        iconNames={['tag', 'not-a-real-icon']}
        value="tag"
        onChange={() => {}}
        label="Icon"
        searchPlaceholder="Search icon…"
        emptyMessage="No icon found."
      />,
    )

    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('moves focus with the arrow keys', async () => {
    const { user } = renderPicker()

    screen.getByRole('button', { name: 'tag' }).focus()
    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('button', { name: 'shopping-cart' })).toHaveFocus()
  })
})
