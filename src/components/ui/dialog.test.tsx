import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/render'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'

// Radix requires a Title and Description on every DialogContent — drop either
// and it throws in the console, silently, unless something renders it.

function Form({ onSave }: { onSave: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New category</DialogTitle>
          <DialogDescription>Pick a name, a colour and an icon.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          <button type="button" onClick={onSave}>
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

describe('Dialog', () => {
  it('opens on the trigger as a dialog with its title and description', async () => {
    const { user } = render(<Form onSave={() => {}} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open' }))

    expect(screen.getByRole('dialog', { name: 'New category' })).toHaveAccessibleDescription(
      'Pick a name, a colour and an icon.',
    )
  })

  it('fires its own action and closes on the close button', async () => {
    const onSave = vi.fn()
    const { user } = render(<Form onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const { user } = render(<Form onSave={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
