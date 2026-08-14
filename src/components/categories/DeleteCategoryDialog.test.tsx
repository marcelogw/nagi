import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/render'
import { DeleteCategoryDialog } from './DeleteCategoryDialog'

describe('DeleteCategoryDialog', () => {
  it('renders as an alertdialog naming the category, interpolated not concatenated', () => {
    render(
      <DeleteCategoryDialog
        categoryName="Groceries"
        open
        onOpenChange={() => {}}
        onConfirm={() => {}}
      />,
    )

    expect(
      screen.getByRole('alertdialog', { name: 'Delete this category?' }),
    ).toHaveAccessibleDescription('Groceries will be removed. Expenses using it move to Other.')
  })

  it('confirms on the destructive action', async () => {
    const onConfirm = vi.fn()
    const { user } = render(
      <DeleteCategoryDialog
        categoryName="Groceries"
        open
        onOpenChange={() => {}}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByTestId('delete-category-confirm'))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('closes without confirming on cancel', async () => {
    const onConfirm = vi.fn()
    const { user } = render(
      <DeleteCategoryDialog
        categoryName="Groceries"
        open
        onOpenChange={() => {}}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByTestId('delete-category-cancel'))

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('renders nothing accessible when closed', () => {
    render(
      <DeleteCategoryDialog
        categoryName="Groceries"
        open={false}
        onOpenChange={() => {}}
        onConfirm={() => {}}
      />,
    )

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
