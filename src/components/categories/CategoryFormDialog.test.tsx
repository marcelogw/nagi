import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/render'
import type { HexColor } from '@/domain/entities'
import { CategoryFormDialog } from './CategoryFormDialog'

const BLANK = { name: '', color: 'oklch(0.64 0.10 168)' as HexColor, icon: null }

describe('CategoryFormDialog', () => {
  it('renders as a dialog with a title matching the mode', () => {
    render(
      <CategoryFormDialog
        open
        onOpenChange={() => {}}
        mode="create"
        initialValues={BLANK}
        onSubmit={() => {}}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'New category' })).toBeInTheDocument()
  })

  it('seeds the form from initialValues in edit mode', () => {
    render(
      <CategoryFormDialog
        open
        onOpenChange={() => {}}
        mode="edit"
        initialValues={{
          name: 'Groceries',
          color: 'oklch(0.64 0.10 168)' as HexColor,
          icon: 'shopping-cart',
        }}
        onSubmit={() => {}}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Edit category' })).toBeInTheDocument()
    expect(screen.getByTestId('category-name')).toHaveValue('Groceries')
  })

  it('disables submit until a name is typed, and submits the trimmed value', async () => {
    const onSubmit = vi.fn()
    const { user } = render(
      <CategoryFormDialog
        open
        onOpenChange={() => {}}
        mode="create"
        initialValues={BLANK}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByTestId('category-form-submit')).toBeDisabled()

    await user.type(screen.getByTestId('category-name'), '  Pets & Vet  ')
    expect(screen.getByTestId('category-form-submit')).toBeEnabled()

    await user.click(screen.getByTestId('category-form-submit'))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Pets & Vet',
      color: BLANK.color,
      icon: BLANK.icon,
    })
  })

  it('shows a name error tied to the field via aria-describedby', () => {
    render(
      <CategoryFormDialog
        open
        onOpenChange={() => {}}
        mode="create"
        initialValues={{ ...BLANK, name: 'Groceries' }}
        nameErrorKind="taken"
        onSubmit={() => {}}
      />,
    )

    const input = screen.getByTestId('category-name')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('A category with this name already exists.')
  })

  it('closes without submitting when cancelled', async () => {
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn()
    const { user } = render(
      <CategoryFormDialog
        open
        onOpenChange={onOpenChange}
        mode="create"
        initialValues={{ ...BLANK, name: 'Groceries' }}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByTestId('category-form-cancel'))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('changes the icon and colour, and includes both on submit', async () => {
    const onSubmit = vi.fn()
    const { user } = render(
      <CategoryFormDialog
        open
        onOpenChange={() => {}}
        mode="create"
        initialValues={{ ...BLANK, name: 'Groceries' }}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'coffee' }))
    await user.click(screen.getByRole('button', { name: 'oklch(0.62 0.10 250)' }))
    await user.click(screen.getByTestId('category-form-submit'))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Groceries',
      color: 'oklch(0.62 0.10 250)',
      icon: 'coffee',
    })
  })
})
