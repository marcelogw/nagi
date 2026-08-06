import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/render'
import { ColorPicker } from './ColorPicker'

const [TEAL, BLUE, VIOLET] = [
  'oklch(0.64 0.10 168)',
  'oklch(0.62 0.10 250)',
  'oklch(0.62 0.11 285)',
]
const COLORS = [TEAL, BLUE, VIOLET]

describe('ColorPicker', () => {
  it('renders one swatch per colour', () => {
    render(<ColorPicker colors={COLORS} value={TEAL} onChange={() => {}} label="Chart colour" />)

    expect(screen.getAllByRole('button')).toHaveLength(COLORS.length)
  })

  it('marks the selected swatch as pressed', () => {
    render(<ColorPicker colors={COLORS} value={BLUE} onChange={() => {}} label="Chart colour" />)

    expect(screen.getByRole('button', { name: BLUE })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: TEAL })).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports the clicked colour', async () => {
    const onChange = vi.fn()
    const { user } = render(
      <ColorPicker colors={COLORS} value={TEAL} onChange={onChange} label="Chart colour" />,
    )

    await user.click(screen.getByRole('button', { name: VIOLET }))

    expect(onChange).toHaveBeenCalledWith(VIOLET)
  })
})
