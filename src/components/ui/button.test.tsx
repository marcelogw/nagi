import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/render'
import { Button } from './button'

describe('Button', () => {
  it('renders as a button and fires onClick', async () => {
    const onClick = vi.fn()
    const { user } = render(<Button onClick={onClick}>Save</Button>)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('carries its variant and size as data attributes for styling', () => {
    render(
      <Button variant="destructive" size="icon" aria-label="Delete">
        x
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button).toHaveAttribute('data-variant', 'destructive')
    expect(button).toHaveAttribute('data-size', 'icon')
  })

  it('renders disabled and does not fire onClick', async () => {
    const onClick = vi.fn()
    const { user } = render(
      <Button onClick={onClick} disabled>
        Save
      </Button>,
    )

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onClick).not.toHaveBeenCalled()
  })
})
