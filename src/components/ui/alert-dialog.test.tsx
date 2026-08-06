import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/render'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from './alert-dialog'

// Radix requires a Title and Description on every AlertDialogContent — drop
// either and it throws in the console, silently, unless something renders it.

function Confirm({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(true)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogTitle>Delete this category?</AlertDialogTitle>
        <AlertDialogDescription>Market will be removed.</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

describe('AlertDialog', () => {
  it('renders as an alertdialog with its title and description', () => {
    render(<Confirm onConfirm={() => {}} />)

    expect(screen.getByRole('alertdialog', { name: 'Delete this category?' })).toHaveAccessibleDescription(
      'Market will be removed.',
    )
  })

  it('confirms on the action and cancels on the cancel button', async () => {
    const onConfirm = vi.fn()
    const { user } = render(<Confirm onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('closes without confirming when cancelled', async () => {
    const onConfirm = vi.fn()
    const { user } = render(<Confirm onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: 'Keep it' }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
